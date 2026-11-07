// TEST COPY ONLY. Requires the Google Sheets advanced service (identifier Sheets).
// Keep Code.gs and RegistrationPreview.gs. No web app endpoints are provided.
function openRegistrationWriteTest() {
  inspectCopyStructure_(adminTestBook_());
  if (typeof Sheets === 'undefined') throw new Error('เพิ่มบริการ Google Sheets API ในเมนู Services ก่อน');
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(registrationPreviewHtml_(true)).setWidth(740).setHeight(720),
    'RPTH · ทดสอบบันทึกลงชีตสำเนา'
  );
}

function prepareRegistrationWriteTest(input, operator, action) {
  assertTestOperator_(operator);
  action = action || 'register';
  var plan = action === 'register' ? previewNewPlayerInCopy(input) : previewRegistryAction_(input, action);
  if (plan.errors.length) return plan;
  var book = adminTestBook_();
  var snapshot = registrationSnapshot_(book, ['sub', 'switch', 'main'].indexOf(action) >= 0);
  if (!adminTestOwner_()) throw new Error('ไม่พบผู้ใช้ Google สำหรับผูกคำขอ กรุณาเปิดชีตด้วยบัญชีของคุณ');
  var requestId = Utilities.getUuid(), token = Utilities.getUuid();
  var state = { requestId: requestId, token: token, input: input, operator: operator,
    fingerprint: registrationDigest_(snapshot), plan: plan, action: action,
    owner: adminTestOwner_(), expires: Date.now() + 10 * 60 * 1000 };
  CacheService.getUserCache().put('rpth-write-' + token, JSON.stringify(state), 600);
  plan.mode = 'TEST_COPY_READY';
  plan.canCommit = true;
  plan.requestId = requestId;
  plan.previewToken = token;
  plan.operator = operator;
  plan.warnings = plan.warnings.filter(function (warning) { return warning.indexOf('CharID เป็นค่าที่เสนอ') !== 0; });
  plan.warnings.push('จะเพิ่มข้อมูลจริงเฉพาะชีตสำเนาเมื่อกดยืนยัน · สรุปนี้หมดอายุใน 10 นาที');
  return plan;
}

function commitRegistrationWriteTest(request) {
  var book = adminTestBook_();
  inspectCopyStructure_(book); // Rejects every spreadsheet except the agreed test copy.
  if (!request || !/^[a-f0-9-]{36}$/i.test(request.requestId || '') || !/^[a-f0-9-]{36}$/i.test(request.previewToken || '')) throw new Error('คำขอยืนยันไม่ถูกต้อง');
  var lock = adminTestLock_();
  if (!lock || !lock.tryLock(30000)) throw new Error('มีผู้อื่นกำลังบันทึก กรุณาลองยืนยันคำขอเดิมอีกครั้ง');
  try {
    var receipt = findRegistrationReceipt_(book, request.requestId);
    if (receipt) {
      if (receipt.owner !== adminTestOwner_()) throw new Error('คำขอนี้เป็นของผู้ใช้อื่น');
      return registrationVerifiedReceipt_(book, receipt);
    }
    var cached = CacheService.getUserCache().get('rpth-write-' + request.previewToken);
    if (!cached) throw new Error('สรุปหมดอายุ กรุณาตรวจสอบและสรุปใหม่');
    var state = JSON.parse(cached);
    if (state.requestId !== request.requestId || state.owner !== adminTestOwner_() || state.expires < Date.now()) throw new Error('สรุปหมดอายุหรือคำขอไม่ตรงกัน กรุณาสรุปใหม่');
    assertTestOperator_(state.operator);
    var plan = !state.action || state.action === 'register' ? previewNewPlayerInCopy(state.input) : previewRegistryAction_(state.input, state.action);
    if (plan.errors.length) throw new Error(plan.errors.join('\n'));
    var snapshot = registrationSnapshot_(book, ['sub', 'switch', 'main'].indexOf(state.action) >= 0);
    if (registrationDigest_(snapshot) !== state.fingerprint || JSON.stringify(plan.changes) !== JSON.stringify(state.plan.changes)) throw new Error('ข้อมูลเปลี่ยนหลังเปิดสรุป กรุณาตรวจสอบและสรุปใหม่');
    var result = buildRegistrationBatch_(plan, snapshot);
    receipt = { mode: 'TEST_COPY_COMMITTED', requestId: request.requestId, owner: state.owner,
      operator: state.operator, committedAt: new Date().toISOString(),
      uid: plan.uid || plan.changes[0].fields.UserID, charId: plan.charId || (plan.changes[1] && plan.changes[1].fields.CharID) || '',
      action: state.action || 'register', rows: result.rows, note: 'บันทึกครบ ' + Object.keys(result.rows).length + ' ชีตในสำเนาทดสอบแล้ว' };
    if (result.expected) receipt.expected = result.expected;
    Array.prototype.push.apply(result.requests, registrationReceiptRequests_(book, receipt));
    if (typeof Sheets === 'undefined') throw new Error('ยังไม่ได้เพิ่มบริการ Google Sheets API');
    // All four rows, formulas and the durable receipt succeed or fail together.
    // If the response is lost, retry the SAME request; its receipt prevents duplication.
    Sheets.Spreadsheets.batchUpdate({ requests: result.requests }, book.getId());
    return registrationVerifiedReceipt_(book, receipt);
  } finally { lock.releaseLock(); }
}

function assertTestOperator_(operator) {
  if (operator !== 'Admin') throw new Error('บัญชีต้องเป็น Admin');
}
function registrationVerifiedReceipt_(book, receipt) {
  if (['sub', 'switch', 'main'].indexOf(receipt.action) >= 0) return verifyCharacterSwitchReceipt_(book, receipt);
  var result = JSON.parse(JSON.stringify(receipt));
  try {
    var widths = { Users: 'D', Characters: 'G', Player: 'W', NPC: 'E', 'log ลงทะเบียนตัวละคร': 'M' };
    var formulaColumns = { Users: [3], Characters: [], NPC: [], Player: [3, 5, 6, 8, 9, 11, 15, 16, 18, 19, 20, 21], 'log ลงทะเบียนตัวละคร': [11] };
    var names = Object.keys(receipt.rows);
    var ranges = names.map(function (name) { var row = receipt.rows[name]; return "'" + name + "'!A" + row + ':' + widths[name] + row; });
    var formulas = Sheets.Spreadsheets.Values.batchGet(book.getId(), { ranges: ranges, valueRenderOption: 'FORMULA' }).valueRanges;
    var values = Sheets.Spreadsheets.Values.batchGet(book.getId(), { ranges: ranges, valueRenderOption: 'UNFORMATTED_VALUE' }).valueRanges;
    var checks = names.map(function (name, index) {
      var raw = values[index].values && values[index].values[0] || [];
      var rowFormulas = formulas[index].values && formulas[index].values[0] || [];
      var uidColumn = name === 'log ลงทะเบียนตัวละคร' ? 1 : 0;
      var uidMatches = String(raw[uidColumn]) === String(receipt.uid);
      var formulasPresent = formulaColumns[name].every(function (column) { return typeof rowFormulas[column] === 'string' && rowFormulas[column].charAt(0) === '='; });
      var errors = raw.filter(function (value) { return typeof value === 'string' && /^#(REF!|N\/A|VALUE!|ERROR!|DIV\/0!|NAME\?|NUM!|SPILL!)/.test(value); });
      var spillPreserved = name !== 'Player' || !(typeof rowFormulas[7] === 'string' && rowFormulas[7].charAt(0) === '=');
      var charIdMatches = name !== 'Characters' || raw[1] === receipt.charId;
      return { sheet: name, row: receipt.rows[name], uidMatches: uidMatches, charIdMatches: charIdMatches, formulasPresent: formulasPresent, spillPreserved: spillPreserved, formulaErrors: errors };
    });
    result.verification = { ok: checks.every(function (check) { return check.uidMatches && check.charIdMatches && check.formulasPresent && check.spillPreserved && !check.formulaErrors.length; }), checks: checks };
    if (!result.verification.ok) result.note = 'บันทึกแล้ว แต่ผลตรวจแถวหรือสูตรยังไม่ผ่าน กรุณาส่งรายงานกลับมา ห้ามเพิ่มรายการนี้ใหม่';
  } catch (error) {
    result.verification = { ok: null, message: 'บันทึกแล้ว แต่ยังอ่านผลกลับไม่สำเร็จ: ' + error.message };
    result.note = 'บันทึกแล้ว แต่ยังตรวจผลกลับไม่ได้ กรุณาส่งรายงานกลับมา ห้ามเพิ่มรายการนี้ใหม่';
  }
  return result;
}
function findRegistrationReceipt_(book, requestId) {
  var stored = receiptLedgerFind_(book, requestId);
  if (stored) return stored;
  var items = book.getDeveloperMetadata().filter(function (item) { return item.getKey() === 'rpth_reg_' + requestId; });
  if (items.length > 1) throw new Error('พบ receipt ซ้ำ กรุณาตรวจสอบก่อนบันทึก');
  return items.length ? JSON.parse(items[0].getValue()) : null;
}
function registrationDigest_(value) {
  return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(value)));
}
function registrationSnapshot_(book, includeLocks) {
  var definitions = [['Users', 4], ['Characters', 7], ['Player', 23], ['log ลงทะเบียนตัวละคร', 13], ['Staff', 5], ['NPC', 5], ['Public Faceclaim Locks', 7]];
  if (includeLocks) definitions.push(['log เฟซเคลมล็อก', 17]);
  return definitions.map(function (definition) {
    var sheet = book.getSheetByName(definition[0]);
    if (!sheet || sheet.getMaxColumns() < definition[1]) throw new Error('โครงสร้างเปลี่ยน: ' + definition[0]);
    var end = sheet.getLastRow();
    if (end > 10000) throw new Error('ตารางเกินขอบเขตทดสอบ 10,000 แถว');
    var range = sheet.getRange(1, 1, Math.max(2, end), definition[1]);
    return { name: definition[0], sheetId: sheet.getSheetId(), maxRows: sheet.getMaxRows(),
      values: range.getValues(), formulas: range.getFormulas(),
      formats: sheet.getRange(2, 1, 1, definition[1]).getNumberFormats()[0] };
  });
}

function buildRegistrationBatch_(plan, snapshot) {
  if (['sub', 'switch', 'main'].indexOf(plan.action) >= 0) return buildCharacterSwitchBatch_(plan, snapshot);
  var kind = plan.action || 'register', counts = { register: [4], edit: [2, 4], npc: [1], race: [2] };
  if (plan.errors.length || !counts[kind] || counts[kind].indexOf(plan.changes.length) < 0) throw new Error('แผนบันทึกไม่ครบ 4 ชีตหรือไม่ถูกต้อง');
  var requests = [], rows = {};
  var formulaColumns = { Users: [3], Characters: [], NPC: [], Player: [3, 5, 6, 8, 9, 11, 15, 16, 18, 19, 20, 21], 'log ลงทะเบียนตัวละคร': [11] };
  plan.changes.forEach(function (change) {
    var table = snapshot.filter(function (item) { return item.name === change.sheet; })[0];
    if (!table) throw new Error('ไม่พบตาราง ' + change.sheet);
    var headers = table.values[0], width = headers.length, end = 1;
    if (change.row != null) {
      var allowed = kind === 'race' ? { Player: ['Race'] } : { Characters: ['Character Name', 'Character Faceclaim'], Users: ['Username'], Player: ['Display Name'] };
      if (['edit', 'race'].indexOf(kind) < 0 || !Number.isInteger(change.row) || change.row < 2 || change.row > table.values.length || change.row > 10000 || !allowed[change.sheet]) throw new Error('แถวแก้ไขไม่ถูกต้อง');
      if (String(table.values[change.row - 1][0]).replace(/^0+(?=\d)/, '') !== plan.uid) throw new Error('UID ของแถวแก้ไขไม่ตรงกัน');
      if (change.sheet === 'Characters' && table.values[change.row - 1][1] !== plan.charId) throw new Error('CharID ของแถวแก้ไขไม่ตรงกัน');
      rows[change.sheet] = change.row;
      Object.keys(change.fields).forEach(function (field) {
        var column = headers.indexOf(field);
        if (allowed[change.sheet].indexOf(field) < 0 || column < 0 || table.formulas[change.row - 1][column]) throw new Error('ห้ามเขียนช่องสูตรหรือช่องที่ไม่รู้จัก: ' + field);
        requests.push({ updateCells: { start: { sheetId: table.sheetId, rowIndex: change.row - 1, columnIndex: column }, rows: [{ values: [{ userEnteredValue: { stringValue: String(change.fields[field]) } }] }], fields: 'userEnteredValue' } });
      });
      return;
    }
    if ((kind === 'npc' && change.sheet !== 'NPC') || (kind === 'race' && change.sheet !== 'log ลงทะเบียนตัวละคร') || (kind !== 'npc' && change.sheet === 'NPC')) throw new Error('ชีตปลายทางไม่ตรงประเภทงาน');
    for (var i = 1; i < table.values.length; i++) {
      if (table.values[i].some(function (v) { return v !== '' && v !== null; }) || table.formulas[i].some(Boolean)) end = i + 1;
    }
    var row = end; // 0-based index of the next entirely new row, after table/formula extent.
    if (row + 1 > 10000) throw new Error('แถวใหม่เกินช่วงสูตร 10,000 แถว');
    rows[change.sheet] = row + 1;
    if (row >= table.maxRows) requests.push({ appendDimension: { sheetId: table.sheetId, dimension: 'ROWS', length: row + 1 - table.maxRows } });
    var source = { sheetId: table.sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: width };
    var destination = { sheetId: table.sheetId, startRowIndex: row, endRowIndex: row + 1, startColumnIndex: 0, endColumnIndex: width };
    ['PASTE_FORMAT', 'PASTE_DATA_VALIDATION'].forEach(function (type) { requests.push({ copyPaste: { source: source, destination: destination, pasteType: type } }); });
    Object.keys(change.fields).forEach(function (field) {
      var column = headers.indexOf(field);
      if (column < 0 || formulaColumns[change.sheet].indexOf(column) >= 0 || (change.sheet === 'Player' && column === 7)) throw new Error('ห้ามเขียนช่องสูตรหรือช่องที่ไม่รู้จัก: ' + field);
      var value = change.fields[field], entered;
      if (field === 'Effective Date') entered = { numberValue: (Date.parse(value + 'T00:00:00Z') - Date.UTC(1899, 11, 30)) / 86400000 };
      else if (field === 'logID (#Post)' || (field === 'UserID' && /^[0-9]+$/.test(String(value)))) entered = { numberValue: Number(value) };
      else if (typeof value === 'boolean') entered = { boolValue: value };
      else entered = { stringValue: String(value) }; // Literal strings, including text beginning '='.
      requests.push({ updateCells: { start: { sheetId: table.sheetId, rowIndex: row, columnIndex: column }, rows: [{ values: [{ userEnteredValue: entered }] }], fields: 'userEnteredValue' } });
    });
    formulaColumns[change.sheet].forEach(function (column) {
      if (!table.formulas[1][column]) throw new Error('ไม่มีสูตรต้นแบบ ' + change.sheet + ' คอลัมน์ ' + (column + 1));
      requests.push({ copyPaste: {
        source: { sheetId: table.sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: column, endColumnIndex: column + 1 },
        destination: { sheetId: table.sheetId, startRowIndex: row, endRowIndex: row + 1, startColumnIndex: column, endColumnIndex: column + 1 }, pasteType: 'PASTE_FORMULA'
      } });
    });
    var dateColumns = change.sheet === 'Player' ? [5, 15, 16] : change.sheet === 'log ลงทะเบียนตัวละคร' ? [9] : [];
    dateColumns.forEach(function (column) { requests.push({ repeatCell: { range: { sheetId: table.sheetId, startRowIndex: row, endRowIndex: row + 1, startColumnIndex: column, endColumnIndex: column + 1 }, cell: { userEnteredFormat: { numberFormat: { type: 'DATE', pattern: 'dd/MM/yyyy' } } }, fields: 'userEnteredFormat.numberFormat' } }); });
  });
  return { requests: requests, rows: rows };
}
