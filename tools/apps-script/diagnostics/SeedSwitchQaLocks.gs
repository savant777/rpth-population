// MANUAL QA FIXTURE ONLY. Not a production lock purchase flow or web endpoint.
// Seeds two synthetic locks for the existing synthetic account after its first
// MAIN -> SUB 1 switch. Never touches an ordinary member or main spreadsheet.
function seedSwitchQaLocks() {
  var book = SpreadsheetApp.getActiveSpreadsheet();
  if (!book || book.getId() !== '1jR8P-z62t3I95hNCkBBvzUsSA9kwHsD9w5Lo0jlX2QY') throw new Error('Test copy only');
  var uid = 99061101, mainId = 'C-99061101-01', subId = 'C-99061101-02';
  var chars = book.getSheetByName('Characters').getDataRange().getValues().filter(function (r) { return Number(r[0]) === uid; });
  var main = chars.filter(function (r) { return r[1] === mainId; })[0], sub = chars.filter(function (r) { return r[1] === subId; })[0];
  if (!main || !sub || !/^RPTH QA /.test(main[2]) || !/^RPTH QA /.test(sub[2]) || main[6] !== false || sub[6] !== true || sub[4] !== 'RPTH QA Secondary Switch Face 20261107') throw new Error('QA fixture is not in expected SUB 1 state');
  var sheet = book.getSheetByName('log เฟซเคลมล็อก'), all = sheet.getDataRange().getValues();
  if (all.slice(1).some(function (r) { return Number(r[4]) === uid; })) throw new Error('QA locks already exist; inspect instead of seeding again');
  var row = 2;
  all.slice(1).forEach(function (r, i) { if (r.slice(0,11).some(function (v) { return v !== '' && v != null; })) row = i + 3; });
  if (row + 2 > 5000) throw new Error('Outside native pause display range');
  var date = (Date.UTC(2026,10,7) - Date.UTC(1899,11,30)) / 86400000;
  var inputs = [
    ['QA-SW-M-START','L-99061101-QA01',99061140,mainId,uid,main[2],'RPTH QA Synthetic Face 20261106 A','เริ่มล็อก',date,12,'Synthetic switch test fixture only'],
    ['QA-SW-S-START','L-99061101-QA02',99061140,subId,uid,sub[2],sub[4],'เริ่มล็อก',date,12,'Synthetic switch test fixture only'],
    ['QA-SW-S-PAUSE','L-99061101-QA02',99061140,subId,uid,sub[2],sub[4],'พักนับ',date,'','Synthetic switch test fixture only']
  ];
  var source = { sheetId: sheet.getSheetId(), startRowIndex:1,endRowIndex:2,startColumnIndex:0,endColumnIndex:17 };
  var destination = { sheetId:sheet.getSheetId(),startRowIndex:row-1,endRowIndex:row+2,startColumnIndex:0,endColumnIndex:17 };
  var requests = [];
  if (row + 2 > sheet.getMaxRows()) requests.push({appendDimension:{sheetId:sheet.getSheetId(),dimension:'ROWS',length:row+2-sheet.getMaxRows()}});
  ['PASTE_FORMAT','PASTE_DATA_VALIDATION'].forEach(function (type) { requests.push({copyPaste:{source:source,destination:destination,pasteType:type}}); });
  requests.push({copyPaste:{source:{sheetId:sheet.getSheetId(),startRowIndex:1,endRowIndex:2,startColumnIndex:11,endColumnIndex:17},destination:{sheetId:sheet.getSheetId(),startRowIndex:row-1,endRowIndex:row+2,startColumnIndex:11,endColumnIndex:17},pasteType:'PASTE_FORMULA'}});
  requests.push({updateCells:{start:{sheetId:sheet.getSheetId(),rowIndex:row-1,columnIndex:0},rows:inputs.map(function(r){return {values:r.map(function(v){return {userEnteredValue:typeof v==='number'?{numberValue:v}:{stringValue:v}};})};}),fields:'userEnteredValue'}});
  Sheets.Spreadsheets.batchUpdate({requests:requests},book.getId());
  SpreadsheetApp.flush();
  console.log(JSON.stringify({mode:'QA_FIXTURE_ONLY',firstRow:row,lastRow:row+2,checks:sheet.getRange(row,13,3,5).getDisplayValues()}));
}

// Read-only verification of synthetic rows, including native computed/Public data.
function inspectSwitchQaResults() {
  var book = SpreadsheetApp.getActiveSpreadsheet();
  if (!book || book.getId() !== '1jR8P-z62t3I95hNCkBBvzUsSA9kwHsD9w5Lo0jlX2QY') throw new Error('Test copy only');
  [['Characters',0],['Player',0],['log ลงทะเบียนตัวละคร',1],['log เฟซเคลมล็อก',4],['Faceclaim Locks',1],['Public Player',0],['Public Faceclaim Locks',0]].forEach(function (definition) {
    var sheet = book.getSheetByName(definition[0]), rows = sheet.getDataRange().getDisplayValues();
    var matches = rows.slice(1).map(function (r,i) { return {row:i+2,values:r}; }).filter(function (r) { return r.values[definition[1]] === '99061101'; });
    console.log(JSON.stringify({sheet:definition[0],rows:matches.slice(-8)}));
  });
}
