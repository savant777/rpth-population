/**
 * @OnlyCurrentDoc
 * RPTH: inspect the TEST COPY only. No sheet writes, deployment or password.
 * Paste this entire file into Code.gs in the copy's bound Apps Script editor.
 */
function inspectTestWorkbook() {
  var book = SpreadsheetApp.getActiveSpreadsheet();
  var report = inspectCopyStructure_(book);
  var text = JSON.stringify(report, null, 2);
  console.log(text);
  var safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  var html = HtmlService.createHtmlOutput(
    '<!doctype html><html lang="th"><head><meta charset="utf-8"></head>' +
    '<body style="font:14px sans-serif;padding:12px;color:#222">' +
    '<h2>ตรวจชีตสำเนาเสร็จแล้ว</h2>' +
    '<p>ยังไม่ได้แก้ข้อมูลในชีต คลิกในช่องด้านล่าง กด Ctrl+A แล้ว Ctrl+C ' +
    'นำข้อความกลับไปวางในแชต</p>' +
    '<p>รายงานมีเฉพาะโครงสร้างและสูตรตัวอย่าง ไม่มีรายชื่อผู้เล่นหรือรหัสผ่าน</p>' +
    '<textarea readonly aria-label="รายงานตรวจโครงสร้าง" ' +
    'style="box-sizing:border-box;width:100%;height:360px;font:12px monospace">' +
    safe + '</textarea></body></html>'
  ).setWidth(720).setHeight(550);
  SpreadsheetApp.getUi().showModalDialog(html, 'RPTH · รายงานตรวจชีตสำเนา');
}

function inspectCopyStructure_(book) {
  if (!book || book.getId() !== '1jR8P-z62t3I95hNCkBBvzUsSA9kwHsD9w5Lo0jlX2QY') {
    throw new Error('โปรดเปิด Apps Script จากชีตสำเนา ทดสอบระบบ ที่ส่งลิงก์ไว้ในแชต ไม่ใช่ชีตหลัก');
  }
  var definitions = [
    {
      name: 'Users',
      headers: ['UserID', 'Username', 'UserType', 'Status'],
      cells: ['D2']
    },
    {
      name: 'Characters',
      headers: ['UserID', 'CharID', 'Character Name', 'Character Slot', 'Character Faceclaim', 'Character Url', 'Is Active Character'],
      cells: []
    },
    {
      name: 'Player',
      headers: ['UserID', 'Display Name', 'Race', 'Status', 'Active Character', 'Switch Date', 'Main Usage Days', 'Sub Usage Days', '2026 Sub Excess Months', '2026 Crystal Required', '2026 Crystal Status', 'Quick Search', 'Post Check', 'Activity Check', 'Reclaim Approved', 'Reclaim Approved At', 'Exempt Until', 'Exempt Note', 'Reclaim History', 'Reclaim Fee', 'Main Char Change', 'Main Char Change Fee', 'Admin Note'],
      cells: ['D2', 'F2', 'G2', 'H2', 'I2', 'J2', 'L2', 'P2', 'Q2', 'S2', 'T2', 'U2', 'V2']
    },
    {
      name: 'log ลงทะเบียนตัวละคร',
      headers: ['logID (#Post)', 'UserID', 'Type', 'Old Name', 'New Name', 'Old Face Claim', 'New Face Claim', 'From Slot', 'To Slot', 'Effective Date', 'Affects Usage', 'User Status', 'Note'],
      cells: ['L2']
    }
  ];
  var report = {
    version: 'rpth-copy-inspection-1',
    mode: 'READ_ONLY_INSPECTION',
    timezone: book.getSpreadsheetTimeZone(),
    locale: book.getSpreadsheetLocale(),
    headersMatch: true,
    sheets: [],
    note: 'ตรวจโครงสร้างเท่านั้น ยังไม่ใช่ผลทดสอบบันทึก 4 ชีต'
  };
  definitions.forEach(function (definition) {
    var sheet = book.getSheetByName(definition.name);
    if (!sheet) {
      report.headersMatch = false;
      report.sheets.push({ name: definition.name, error: 'ไม่พบชีต' });
      return;
    }
    if (sheet.getMaxColumns() < definition.headers.length || sheet.getMaxRows() < 3) {
      report.headersMatch = false;
      report.sheets.push({ name: definition.name, error: 'จำนวนแถวหรือคอลัมน์ไม่พอสำหรับตรวจ' });
      return;
    }
    var headers = sheet.getRange(1, 1, 1, definition.headers.length).getDisplayValues()[0];
    var differences = [];
    definition.headers.forEach(function (expected, index) {
      if (headers[index] !== expected) differences.push({ column: index + 1, expected: expected, actual: headers[index] });
    });
    if (differences.length) report.headersMatch = false;
    var formulas = {};
    definition.cells.forEach(function (address) {
      formulas[address] = sheet.getRange(address).getFormula();
    });
    // A second row distinguishes per-row formulas from a single spill anchor.
    var row3 = sheet.getRange(3, 1, 1, definition.headers.length).getFormulas()[0];
    var validations = sheet.getRange(2, 1, 1, definition.headers.length).getDataValidations()[0];
    var validationTypes = {};
    validations.forEach(function (rule, index) {
      if (rule) validationTypes[definition.headers[index]] = String(rule.getCriteriaType());
    });
    report.sheets.push({
      name: definition.name,
      headers: headers,
      headerDifferences: differences,
      sampleFormulas: formulas,
      row3FormulaColumns: row3.map(function (formula, index) { return formula ? index + 1 : null; }).filter(function (index) { return index !== null; }),
      validationTypes: validationTypes
    });
  });
  return report;
}
