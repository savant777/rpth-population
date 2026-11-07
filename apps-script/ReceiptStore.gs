// Receipts live in hidden sheet rows, not in the 30,000-character metadata pool.
// One-character row markers keep the API's atomic unique-ID constraint.
function receiptLedgerSheets_(book) {
  return book.getSheets().filter(function (sheet) { return /^_RPTH Receipts [0-9]{4}$/.test(sheet.getName()); }).sort(function (a, b) { return a.getName().localeCompare(b.getName()); });
}
function receiptLedgerHeaders_() { return ['RequestID', 'Owner', 'Receipt 1', 'Receipt 2', 'Receipt 3', 'Receipt 4']; }
function receiptLedgerRows_(sheet) {
  var headers = receiptLedgerHeaders_();
  if (sheet.getMaxColumns() < 6 || sheet.getRange(1, 1, 1, 6).getValues()[0].join('\n') !== headers.join('\n')) throw new Error('โครงสร้างแท็บใบรับเปลี่ยน: ' + sheet.getName());
  var end = sheet.getLastRow();
  if (end > 10000) throw new Error('แท็บใบรับเกินขอบเขต');
  return end < 2 ? [] : sheet.getRange(2, 1, end - 1, 1).getValues();
}
function receiptLedgerFind_(book, requestId) {
  var found = [];
  receiptLedgerSheets_(book).forEach(function (sheet) {
    receiptLedgerRows_(sheet).forEach(function (key, index) {
      if (String(key[0]) !== requestId) return;
      var row = sheet.getRange(index + 2, 1, 1, 6).getValues()[0];
      var receipt = JSON.parse(row.slice(2, 6).join(''));
      if (receipt.requestId !== requestId || receipt.owner !== String(row[1])) throw new Error('ใบรับกับเจ้าของไม่ตรงกัน');
      found.push(receipt);
    });
  });
  if (found.length > 1) throw new Error('พบใบรับซ้ำ กรุณาตรวจทะเบียนใบรับ');
  return found[0] || null;
}
function receiptLedgerPlan_(book, receipts) {
  var requests = [], locations = [], sheets = receiptLedgerSheets_(book), allSheets = book.getSheets();
  var sheet = sheets[sheets.length - 1], id, row, maxRows, sequence = sheets.length ? Number(sheet.getName().slice(-4)) : 0;
  if (sheet) { receiptLedgerRows_(sheet); id = sheet.getSheetId(); row = Math.max(2, sheet.getLastRow() + 1); maxRows = sheet.getMaxRows(); }
  var usedIds = allSheets.map(function (s) { return s.getSheetId(); }), nextId = 500000000;
  var newSheet = function () {
    sequence++;
    if (sequence > 9999) throw new Error('จำนวนแท็บใบรับเกินขอบเขต');
    while (usedIds.indexOf(nextId) >= 0) nextId++;
    id = nextId++; usedIds.push(id); row = 2; maxRows = 1000;
    var name = '_RPTH Receipts ' + ('0000' + sequence).slice(-4);
    if (allSheets.some(function (s) { return s.getName() === name; })) throw new Error('ชื่อแท็บใบรับซ้ำ');
    requests.push({ addSheet: { properties: { sheetId: id, title: name, hidden: true, gridProperties: { rowCount: maxRows, columnCount: 6 } } } });
    requests.push({ updateCells: { start: { sheetId: id, rowIndex: 0, columnIndex: 0 }, rows: [{ values: receiptLedgerHeaders_().map(function (v) { return { userEnteredValue: { stringValue: v } }; }) }], fields: 'userEnteredValue' } });
  };
  receipts.forEach(function (receipt) {
    if (!/^[a-f0-9-]{36}$/i.test(receipt.requestId || '') || !receipt.owner) throw new Error('ใบรับไม่ถูกต้อง');
    if (id == null || row > 10000) newSheet();
    var json = JSON.stringify(receipt), chunks = [], offset = 0;
    for (var i = 0; i < 4 && offset < json.length; i++) {
      var end = Math.min(offset + 40000, json.length);
      if (end < json.length && /[\uD800-\uDBFF]/.test(json.charAt(end - 1))) end--;
      chunks.push(json.slice(offset, end)); offset = end;
    }
    if (offset < json.length) throw new Error('ใบรับยาวเกินขอบเขตจัดเก็บ');
    while (chunks.length < 4) chunks.push('');
    if (row > maxRows) { requests.push({ appendDimension: { sheetId: id, dimension: 'ROWS', length: row - maxRows } }); maxRows = row; }
    requests.push({ updateCells: { start: { sheetId: id, rowIndex: row - 1, columnIndex: 0 }, rows: [{ values: [receipt.requestId, receipt.owner].concat(chunks).map(function (v) { return { userEnteredValue: { stringValue: v } }; }) }], fields: 'userEnteredValue' } });
    locations.push({ dimensionRange: { sheetId: id, dimension: 'ROWS', startIndex: row - 1, endIndex: row } }); row++;
  });
  return { requests: requests, locations: locations };
}
function registrationReceiptRequests_(book, receipt) {
  var plan = receiptLedgerPlan_(book, [receipt]);
  plan.requests.push({ createDeveloperMetadata: { developerMetadata: {
    metadataId: (parseInt(receipt.requestId.replace(/-/g, '').slice(0, 8), 16) & 0x7fffffff) || 1,
    metadataKey: 'r', visibility: 'DOCUMENT', location: plan.locations[0]
  } } });
  return plan.requests;
}
function migrateRegistrationReceiptsInCopy() {
  var book = adminTestBook_(); inspectCopyStructure_(book);
  var lock = adminTestLock_();
  if (!lock.tryLock(30000)) throw new Error('มีรายการกำลังบันทึก รอก่อนย้ายใบรับ');
  try {
    var items = book.getDeveloperMetadata().filter(function (m) { return /^rpth_reg_[a-f0-9-]{36}$/i.test(m.getKey()); });
    var receipts = [], seen = {};
    items.forEach(function (m) {
      var receipt = JSON.parse(m.getValue()), requestId = m.getKey().slice(9);
      if (receipt.requestId !== requestId || !receipt.owner || seen[requestId] || receiptLedgerFind_(book, requestId)) throw new Error('ใบรับเก่าซ้ำหรือไม่ตรงกัน หยุดก่อนย้าย');
      seen[requestId] = true; receipts.push(receipt);
    });
    if (!items.length) { console.log('No legacy receipts remain'); return; }
    var plan = receiptLedgerPlan_(book, receipts);
    items.forEach(function (m, i) { plan.requests.push({ updateDeveloperMetadata: {
      dataFilters: [{ developerMetadataLookup: { metadataId: m.getId() } }],
      developerMetadata: { metadataKey: 'r', metadataValue: '', location: plan.locations[i] }, fields: 'metadataKey,metadataValue,location'
    } }); });
    // Copies every full receipt and relocates its original unique marker atomically.
    // No metadata, receipt, business row, or history is deleted.
    Sheets.Spreadsheets.batchUpdate({ requests: plan.requests }, book.getId());
    SpreadsheetApp.flush();
    if (receipts.some(function (r) { return JSON.stringify(receiptLedgerFind_(book, r.requestId)) !== JSON.stringify(r); })) throw new Error('ย้ายแล้วแต่ผลอ่านใบรับไม่ตรง ห้ามย้ายซ้ำ');
    console.log(JSON.stringify({ mode: 'TEST_COPY_RECEIPTS_MIGRATED', count: receipts.length, verified: true, businessRowsChanged: false }));
  } finally { lock.releaseLock(); }
}
