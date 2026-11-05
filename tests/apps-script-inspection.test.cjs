const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../apps-script/InspectCopy.gs'), 'utf8');

function api() {
  const context = vm.createContext({});
  vm.runInContext(source, context);
  return context.inspectCopyStructure_;
}
function book(sheets = {}) {
  return {
    getId: () => '1jR8P-z62t3I95hNCkBBvzUsSA9kwHsD9w5Lo0jlX2QY',
    getSpreadsheetTimeZone: () => 'Asia/Bangkok',
    getSpreadsheetLocale: () => 'th_TH',
    getSheetByName: name => sheets[name] || null
  };
}
test('inspection refuses other workbooks before reading sheets', () => {
  assert.throws(() => api()({ getId: () => 'production' }), /ชีตสำเนา/);
  assert.throws(() => api()(null), /ชีตสำเนา/);
});
test('inspection reports missing tabs and never claims write readiness', () => {
  const result = api()(book());
  assert.equal(result.headersMatch, false);
  assert.equal(result.sheets.length, 4);
  assert.equal(result.mode, 'READ_ONLY_INSPECTION');
});
test('inspection reads formulas, checks exact headers, excludes record values', () => {
  const users = {
    getMaxColumns: () => 4, getMaxRows: () => 10,
    getRange: (row, col, rows, columns) => {
      if (typeof row === 'string') return { getFormula: () => '=FORMULA_ONLY()' };
      if (row === 1) return { getDisplayValues: () => [['UserID', 'Username', 'UserType', 'WRONG']] };
      if (row === 3) return { getFormulas: () => [['', '', '', '=FORMULA_ONLY()']] };
      if (row === 2) return { getDataValidations: () => [Array(columns).fill(null)] };
      throw new Error('Unexpected record read');
    }
  };
  const result = api()(book({ Users: users }));
  assert.equal(result.sheets[0].headerDifferences[0].actual, 'WRONG');
  assert.equal(result.sheets[0].sampleFormulas.D2, '=FORMULA_ONLY()');
  assert.deepEqual(Array.from(result.sheets[0].row3FormulaColumns), [4]);
  assert.equal(result.headersMatch, false);
});
