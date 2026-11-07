// Uses the existing locked, signed, stale-checked, atomic commit and receipt protocol.
function buildCharacterSwitchBatch_(plan, snapshot) {
  var mainAction = plan.action === 'main';
  if (plan.errors.length || ['sub', 'switch', 'main'].indexOf(plan.action) < 0 || plan.changes.length < (mainAction ? 5 : 4) || plan.changes.length > (mainAction ? 9 : 6)) throw new Error('แผนสลับใช้งานไม่ถูกต้อง');
  var requests = [], rows = {}, expected = [], next = {};
  var schema = {
    Characters: { width: 7, formulas: [], edits: mainAction ? ['Is Active Character', 'Character Faceclaim', 'Character Slot'] : ['Is Active Character', 'Character Faceclaim'], append: plan.action === 'sub' || mainAction },
    Player: { width: 23, formulas: [], edits: mainAction ? ['Active Character', 'Display Name'] : ['Active Character'] },
    'log ลงทะเบียนตัวละคร': { width: 13, formulas: [11], append: true },
    'log เฟซเคลมล็อก': { width: 17, formulas: [11, 12, 13, 14, 15, 16], append: true }
  };
  if (mainAction) schema.Users = { width: 4, formulas: [], edits: ['Username'] };
  var edits = plan.changes.filter(function (c) { return c.row != null; });
  var charEdits = edits.filter(function (c) { return c.sheet === 'Characters'; }).length;
  var logs = plan.changes.filter(function (c) { return c.sheet === 'log ลงทะเบียนตัวละคร' && c.row == null; }).length;
  if ((mainAction ? charEdits < 1 || charEdits > 3 || logs < 1 || logs > 2 || edits.filter(function (c) { return c.sheet === 'Users'; }).length !== 1 : charEdits !== (plan.action === 'sub' ? 1 : 2) || logs !== 1) || edits.filter(function (c) { return c.sheet === 'Player'; }).length !== 1) throw new Error('ปลายทางแผนไม่ครบ');
  plan.changes.forEach(function (change) {
    var policy = schema[change.sheet], table = snapshot.filter(function (t) { return t.name === change.sheet; })[0];
    if (!policy || !table || table.values[0].length !== policy.width) throw new Error('โครงสร้างปลายทางไม่ถูกต้อง');
    var headers = table.values[0], row = change.row;
    if (row != null) {
      if (!Number.isInteger(row) || row < 2 || row > table.values.length || String(table.values[row - 1][0]) !== plan.uid || (change.sheet === 'Characters' && table.values[row - 1][1] !== change.charId)) throw new Error('UID/CharID ของแถวแก้ไขเปลี่ยน');
    } else {
      if (!policy.append) throw new Error('ห้ามเพิ่มแถวในชีตนี้');
      if (!next[change.sheet]) {
        var last = 1;
        table.values.slice(1).forEach(function (values, index) {
          // Lock logs are prefilled with L:Q formulas. Append after A:K inputs,
          // never after formula extent, and never overwrite orphan manual inputs.
          var used = change.sheet === 'log เฟซเคลมล็อก' ? values.slice(0, 11).some(function (v) { return v !== '' && v != null; }) : values.some(function (v) { return v !== '' && v != null; }) || table.formulas[index + 1].some(Boolean);
          if (used) last = index + 2;
        });
        next[change.sheet] = last + 1;
      }
      row = next[change.sheet]++;
      // Pause display native formulas currently reference only through row 5000.
      if (row > (change.sheet === 'log เฟซเคลมล็อก' ? 5000 : 10000)) throw new Error('เกินขอบเขตสูตร native ของ ' + change.sheet);
      if (row > table.maxRows) requests.push({ appendDimension: { sheetId: table.sheetId, dimension: 'ROWS', length: row - Math.max(table.maxRows, row - 1) } });
      var range = { sheetId: table.sheetId, startRowIndex: row - 1, endRowIndex: row, startColumnIndex: 0, endColumnIndex: policy.width };
      ['PASTE_FORMAT', 'PASTE_DATA_VALIDATION'].forEach(function (type) { requests.push({ copyPaste: { source: { sheetId: table.sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: policy.width }, destination: range, pasteType: type } }); });
      policy.formulas.forEach(function (column) {
        if (!table.formulas[1][column] || /DUMMYFUNCTION|COMPUTED_VALUE/.test(table.formulas[1][column])) throw new Error('ไม่มีสูตร native ต้นแบบ');
        requests.push({ copyPaste: { source: { sheetId: table.sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: column, endColumnIndex: column + 1 }, destination: { sheetId: table.sheetId, startRowIndex: row - 1, endRowIndex: row, startColumnIndex: column, endColumnIndex: column + 1 }, pasteType: 'PASTE_FORMULA' } });
      });
    }
    if (!rows[change.sheet]) rows[change.sheet] = [];
    rows[change.sheet].push(row);
    var check = { sheet: change.sheet, row: row, fields: {}, formulas: change.row == null ? policy.formulas : [] };
    Object.keys(change.fields).forEach(function (field) {
      var column = headers.indexOf(field), value = change.fields[field], entered;
      if (column < 0 || (change.row != null && policy.edits.indexOf(field) < 0) || (change.row == null && policy.formulas.indexOf(column) >= 0) || (change.row != null && table.formulas[row - 1][column])) throw new Error('ห้ามเขียนช่องสูตรหรือช่องที่ไม่รู้จัก: ' + field);
      if (field === 'Effective Date') {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('วันที่ไม่ถูกต้อง');
        value = (Date.parse(value + 'T00:00:00Z') - Date.UTC(1899, 11, 30)) / 86400000;
        entered = { numberValue: value };
        requests.push({ repeatCell: { range: { sheetId: table.sheetId, startRowIndex: row - 1, endRowIndex: row, startColumnIndex: column, endColumnIndex: column + 1 }, cell: { userEnteredFormat: { numberFormat: { type: 'DATE', pattern: 'dd/MM/yyyy' } } }, fields: 'userEnteredFormat.numberFormat' } });
      } else if (field === 'UserID' || field === 'logID (#Post)') { value = Number(value); entered = { numberValue: value }; }
      else if (typeof value === 'boolean') entered = { boolValue: value };
      else { value = String(value); entered = { stringValue: value }; }
      if (mainAction && change.sheet === 'Characters' && field === 'Character Slot' && value === '-') {
        var options = plan.characterSlotOptions;
        if (!Array.isArray(options) || options.indexOf('MAIN') < 0 || options.some(function (slot) { return !/^(MAIN|SUB [1-9][0-9]*|-)$/.test(slot); })) throw new Error('ไม่พบตัวเลือกสลอต native สำหรับเก็บประวัติ');
        // The agreed retired marker is not in native D2 yet. Permit it only in
        // the specific retired cell, preserving all existing native choices.
        requests.push({ setDataValidation: { range: { sheetId: table.sheetId, startRowIndex: row - 1, endRowIndex: row, startColumnIndex: 3, endColumnIndex: 4 }, rule: { condition: { type: 'ONE_OF_LIST', values: options.concat(options.indexOf('-') < 0 ? ['-'] : []).map(function (slot) { return { userEnteredValue: slot }; }) }, strict: true, showCustomUi: true } } });
      }
      check.fields[column] = value;
      requests.push({ updateCells: { start: { sheetId: table.sheetId, rowIndex: row - 1, columnIndex: column }, rows: [{ values: [{ userEnteredValue: entered }] }], fields: 'userEnteredValue' } });
    });
    if (change.sheet === 'Characters') { check.fields[0] = Number(plan.uid); check.fields[1] = change.charId || plan.charId; }
    if (change.sheet === 'Player' || change.sheet === 'Users') check.fields[0] = Number(plan.uid);
    expected.push(check);
  });
  return { requests: requests, rows: rows, expected: expected };
}

function verifyCharacterSwitchReceipt_(book, receipt) {
  var result = JSON.parse(JSON.stringify(receipt)), widths = { Users: 'D', Characters: 'G', Player: 'W', 'log ลงทะเบียนตัวละคร': 'M', 'log เฟซเคลมล็อก': 'Q' };
  try {
    var ranges = receipt.expected.map(function (e) { return "'" + e.sheet + "'!A" + e.row + ':' + widths[e.sheet] + e.row; });
    var values = Sheets.Spreadsheets.Values.batchGet(book.getId(), { ranges: ranges, valueRenderOption: 'UNFORMATTED_VALUE' }).valueRanges;
    var formulas = Sheets.Spreadsheets.Values.batchGet(book.getId(), { ranges: ranges, valueRenderOption: 'FORMULA' }).valueRanges;
    var checks = receipt.expected.map(function (e, i) {
      var raw = values[i].values && values[i].values[0] || [], f = formulas[i].values && formulas[i].values[0] || [];
      var matches = Object.keys(e.fields).every(function (column) { return (raw[column] == null ? '' : raw[column]) === e.fields[column]; });
      var errors = raw.filter(function (v) { return typeof v === 'string' && /^#(REF!|N\/A|VALUE!|ERROR!|DIV\/0!|NAME\?|NUM!|SPILL!)/.test(v); });
      return { sheet: e.sheet, row: e.row, fieldsMatch: matches, formulasPresent: e.formulas.every(function (c) { return typeof f[c] === 'string' && f[c].charAt(0) === '='; }), formulaErrors: errors, lockCheck: e.sheet !== 'log เฟซเคลมล็อก' || raw[15] === 'OK', spillPreserved: e.sheet !== 'Player' || !(typeof f[7] === 'string' && f[7].charAt(0) === '=') };
    });
    result.verification = { ok: checks.every(function (c) { return c.fieldsMatch && c.formulasPresent && !c.formulaErrors.length && c.lockCheck && c.spillPreserved; }), checks: checks };
    if (!result.verification.ok) result.note = 'บันทึกแล้ว แต่ผลตรวจยังไม่ผ่าน ห้ามเพิ่มรายการนี้ใหม่ กรุณาส่งรายงานกลับมา';
  } catch (error) { result.verification = { ok: null, message: 'บันทึกแล้ว แต่ยังอ่านผลกลับไม่ได้: ' + error.message }; }
  delete result.expected;
  return result;
}
