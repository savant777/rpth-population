/** Read native lock formulas before implementing switch transactions.
 * Run in the existing bound test-copy project; not part of the web bundle.
 * Reports schema/formulas only, never member rows or Script Properties.
 */
function inspectSwitchCopySchema() {
  var book = SpreadsheetApp.getActiveSpreadsheet();
  if (!book || book.getId() !== '1jR8P-z62t3I95hNCkBBvzUsSA9kwHsD9w5Lo0jlX2QY') {
    throw new Error('Inspect the agreed test copy only');
  }
  var definitions = [
    ['log เฟซเคลมล็อก', 17, ['H2']],
    ['Faceclaim Locks', 11, []],
    ['Public Faceclaim Locks', 10, []],
    ['Characters', 7, ['D2']],
    ['Player', 23, ['E2']]
  ];
  var report = { mode: 'READ_ONLY_SCHEMA', timezone: book.getSpreadsheetTimeZone(), sheets: [] };
  definitions.forEach(function (definition) {
    var sheet = book.getSheetByName(definition[0]);
    if (!sheet) throw new Error('Missing sheet: ' + definition[0]);
    var validations = {};
    definition[2].forEach(function (address) {
      var rule = sheet.getRange(address).getDataValidation();
      if (!rule) { validations[address] = null; return; }
      var type = String(rule.getCriteriaType());
      var args = rule.getCriteriaValues();
      validations[address] = {
        type: type,
        allowInvalid: rule.getAllowInvalid(),
        // Never read arbitrary validation-source member data.
        values: type === 'VALUE_IN_LIST' ? args[0] : undefined,
        sourceRange: type === 'VALUE_IN_RANGE' ? args[0].getSheet().getName() + '!' + args[0].getA1Notation() : undefined
      };
    });
    report.sheets.push({
      name: definition[0],
      headers: sheet.getRange(1, 1, 1, definition[1]).getDisplayValues()[0],
      // Formula strings only: no evaluated values from member rows.
      formulas: sheet.getRange(1, 1, 2, definition[1]).getFormulas(),
      numberFormats: sheet.getRange(2, 1, 1, definition[1]).getNumberFormats()[0],
      validations: validations
    });
  });
  report.sheets.forEach(function (item) { console.log(JSON.stringify(item)); });
}
