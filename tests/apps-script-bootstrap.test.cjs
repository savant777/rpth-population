const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
function setup() {
  const tables = {
    Users: { headers: ['UserID', 'Username', 'UserType', 'Status'], rows: [[1, 'Existing', 'Player', '#N/A']] },
    Characters: { headers: ['UserID', 'CharID', 'Character Name', 'Character Slot', 'Character Faceclaim', 'Character Url', 'Is Active Character'], rows: [] },
    Player: { headers: ['UserID', 'Display Name', 'Race', 'Status', 'Active Character'], rows: [[1, 'Existing', 'มนุษย์', true, 'MAIN']] },
    NPC: { headers: ['UserID', 'Display Name', 'Faceclaim', 'Race', 'Link'], rows: [] },
    Staff: { headers: ['UserID'], rows: [] },
    'Public Faceclaim Locks': { headers: ['UserID', 'Lock Character Name', 'Lock Face Claim', 'End Date', 'CharID', 'LockID', 'Status'], rows: [] }
  };
  const reads = [];
  const book = { getSheetByName: name => {
    const table = tables[name];
    return {
      getMaxColumns: () => table.headers.length, getLastRow: () => table.rows.length + 1,
      getRange: (row, col, count, width) => {
        reads.push({ name, row, width });
        return { getDisplayValues: () => [table.headers.slice(0, width)], getValues: () => table.rows.slice(0, count).map(values => values.slice(0, width)) };
      }
    };
  } };
  const context = vm.createContext({ Utilities: { formatDate: () => '2026-11-05' } });
  for (const file of ['RegistrationPreview.gs', 'WebGateway.gs']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../apps-script', file), 'utf8'), context);
  context.adminTestBook_ = () => book;
  context.inspectCopyStructure_ = () => ({ headersMatch: true, timezone: 'Asia/Bangkok' });
  return { context, tables, reads };
}
test('bootstrap reads Users IDs without requiring unused derived Status formulas', () => {
  const { context, reads } = setup();
  const result = context.gatewayBootstrap_();
  assert.deepEqual(Array.from(result.userIds), ['1']);
  assert.equal(result.players[0].status, true);
  assert.ok(reads.filter(read => read.name === 'Users').every(read => read.width === 1));
});
test('bootstrap still rejects errors in required cells and reports their location', () => {
  const { context, tables } = setup();
  tables.Users.rows[0][0] = '#REF!';
  assert.throws(() => context.gatewayBootstrap_(), /Users แถว 2 คอลัมน์ UserID: #REF!/);
  tables.Users.rows[0][0] = 1;
  tables.Player.rows[0][3] = '#VALUE!';
  assert.throws(() => context.gatewayBootstrap_(), /Player แถว 2 คอลัมน์ Status: #VALUE!/);
});
