const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

function fixture() {
  const context = vm.createContext({});
  for (const file of ['RegistrationPreview.gs', 'CharacterEdit.gs', 'RegistrationWriteTest.gs']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../apps-script', file), 'utf8'), context);
  const definitions = [
    ['Users', ['UserID', 'Username', 'UserType', 'Status'], [[42, 'Main Name', 'Player', 'Active']], [3]],
    ['Characters', ['UserID', 'CharID', 'Character Name', 'Character Slot', 'Character Faceclaim', 'Character Url', 'Is Active Character'], [[42, 'C-42-01', 'Main Name', 'MAIN', 'Main Face', 'https://roleplayth.com/main', true], [42, 'C-42-02', 'Sub Name', 'SUB 1', '', 'https://roleplayth.com/sub', false], [99, 'C-99-01', 'Other Staff', 'MAIN', 'Staff Face', '', true]], []],
    ['Player', ['UserID', 'Display Name', 'Race', 'Status', 'Active Character', 'Switch Date', 'Main Usage Days', 'Sub Usage Days', '2026 Sub Excess Months', '2026 Crystal Required', '2026 Crystal Status', 'Quick Search', 'Post Check', 'Activity Check', 'Reclaim Approved', 'Reclaim Approved At', 'Exempt Until', 'Exempt Note', 'Reclaim History', 'Reclaim Fee', 'Main Char Change', 'Main Char Change Fee', 'Admin Note'], [[42, 'Main Name', 'มนุษย์', true, 'MAIN']], [3, 5, 6, 8, 9, 11, 15, 16, 18, 19, 20, 21]],
    ['log ลงทะเบียนตัวละคร', ['logID (#Post)', 'UserID', 'Type', 'Old Name', 'New Name', 'Old Face Claim', 'New Face Claim', 'From Slot', 'To Slot', 'Effective Date', 'Affects Usage', 'User Status', 'Note'], [[1, 42, 'ลงทะเบียนตัวละครใหม่']], [11]],
    ['NPC', ['UserID', 'Display Name', 'Faceclaim'], [['a', 'NPC', 'NPC Face']], []],
    ['Public Faceclaim Locks', ['UserID', 'Lock Character Name', 'Lock Face Claim', 'End Date', 'CharID', 'LockID', 'Status'], [], []]
  ];
  const snapshot = definitions.map(([name, headers, data, formulas], index) => {
    const values = [headers, ...data.map(row => headers.map((_, column) => row[column] ?? ''))];
    return { name, sheetId: index + 1, maxRows: 1000, values, formulas: values.map((_, row) => headers.map((_, column) => row && formulas.includes(column) ? '=A2' : '')), formats: headers.map(() => 'General') };
  });
  const input = { uid: '42', charId: 'C-42-01', post: '55', date: '06/11/2026', name: '', faceclaim: '', note: '' };
  const plan = values => context.planCharacterEdit_({ ...input, ...values }, snapshot, '2026-11-06');
  return { context, snapshot, input, plan };
}

test('main rename edits only names, retains identity/link/flags and logs same slots FALSE', () => {
  const f = fixture(), before = JSON.stringify(f.snapshot);
  const plan = f.plan({ name: 'New Main' });
  assert.equal(plan.errors.length, 0);
  assert.deepEqual(Array.from(plan.changes, c => c.sheet), ['Characters', 'Users', 'Player', 'log ลงทะเบียนตัวละคร']);
  const log = plan.changes.at(-1).fields;
  assert.equal(log.Type, 'เปลี่ยนชื่อ');
  assert.equal(log['Old Name'], 'Main Name');
  assert.equal(log['New Name'], 'New Main');
  assert.equal(log['New Face Claim'], '');
  assert.equal(log['From Slot'], 'MAIN');
  assert.equal(log['To Slot'], 'MAIN');
  assert.equal(log['Affects Usage'], false);
  const batch = f.context.buildRegistrationBatch_(plan, f.snapshot);
  assert.equal(batch.rows.Characters, 2);
  assert.equal(batch.rows.Users, 2);
  assert.equal(batch.rows.Player, 2);
  assert.equal(batch.rows['log ลงทะเบียนตัวละคร'], 3);
  const copies = batch.requests.filter(r => r.copyPaste);
  assert.ok(copies.every(r => r.copyPaste.destination.sheetId === 4));
  const edits = batch.requests.filter(r => r.updateCells && r.updateCells.start.sheetId !== 4);
  assert.deepEqual(Array.from(edits, r => [r.updateCells.start.sheetId, r.updateCells.start.columnIndex]), [[2, 2], [1, 1], [3, 1]]);
  assert.equal(JSON.stringify(f.snapshot), before);
});

test('copy preview reads contiguous native header prefixes and rejects required formula errors', () => {
  const f = fixture();
  const book = { getSheetByName: name => {
    const table = f.snapshot.find(t => t.name === name);
    return {
      getMaxColumns: () => table.values[0].length,
      getLastRow: () => table.values.length,
      getRange: (row, column, height, width) => ({
        getDisplayValues: () => table.values.slice(row - 1, row - 1 + height).map(r => r.slice(column - 1, column - 1 + width).map(String)),
        getValues: () => table.values.slice(row - 1, row - 1 + height).map(r => r.slice(column - 1, column - 1 + width))
      })
    };
  } };
  Object.assign(f.context, {
    adminTestBook_: () => book, inspectCopyStructure_: () => ({ headersMatch: true, timezone: 'Asia/Bangkok' }),
    registrationSnapshot_: () => f.snapshot, Utilities: { formatDate: () => '2026-11-06' }
  });
  assert.equal(f.context.previewCharacterEditInCopy_({ ...f.input, name: 'New Main' }).errors.length, 0);
  f.snapshot[4].values[1][2] = '#REF!';
  assert.throws(() => f.context.previewCharacterEditInCopy_({ ...f.input, name: 'New Main' }), /NPC.*Faceclaim/);
  f.snapshot[4].values[1][2] = 'NPC Face';
  f.snapshot[1].values[1][6] = '#REF!';
  assert.throws(() => f.context.previewCharacterEditInCopy_({ ...f.input, name: 'New Main' }), /Characters.*Is Active Character/);
  f.snapshot[1].values[1][6] = true;
  f.snapshot[2].values[1][4] = '#REF!';
  assert.throws(() => f.context.previewCharacterEditInCopy_({ ...f.input, name: 'New Main' }), /Player.*Active Character/);
});

test('sub rename and main face change touch Characters and log only; combined type follows actual changes', () => {
  for (const values of [{ charId: 'C-42-02', name: 'New Sub' }, { faceclaim: 'New Face' }]) {
    const f = fixture();
    if (values.charId === 'C-42-02') {
      f.snapshot[1].values[1][6] = false;
      f.snapshot[1].values[2][6] = true;
      f.snapshot[2].values[1][4] = 'SUB 1';
    }
    const plan = f.plan(values);
    assert.equal(plan.errors.length, 0);
    assert.deepEqual(Array.from(plan.changes, c => c.sheet), ['Characters', 'log ลงทะเบียนตัวละคร']);
  }
  const f = fixture();
  assert.equal(f.plan({ name: 'New Main', faceclaim: 'New Face' }).changes.at(-1).fields.Type, 'เปลี่ยนชื่อ+เมจ');
  assert.equal(f.plan({ name: 'Main Name', faceclaim: 'New Face' }).changes.at(-1).fields.Type, 'เปลี่ยนเมจ');
  assert.ok(f.plan({ name: 'Main Name', faceclaim: 'Main Face' }).errors.length);
});

test('only the current character can be edited and both sources of active state must agree', () => {
  const f = fixture();
  for (const values of [{ name: 'Other Sub' }, { faceclaim: 'Unused Face' }]) {
    const result = f.plan({ charId: 'C-42-02', ...values });
    assert.ok(result.errors.some(e => e.includes('เฉพาะตัวละครที่กำลังใช้งาน')));
    assert.equal(result.changes.length, 0);
  }
  for (const mutate of [
    f => { f.snapshot[1].values[1][6] = false; },
    f => { f.snapshot[1].values[2][6] = true; },
    f => { f.snapshot[2].values[1][4] = 'SUB 1'; }
  ]) {
    const broken = fixture(); mutate(broken);
    assert.equal(broken.plan({ name: 'New' }).changes.length, 0);
  }
  f.snapshot[1].values[1][6] = false;
  f.snapshot[1].values[2][6] = true;
  f.snapshot[2].values[1][4] = 'SUB 1';
  assert.equal(f.plan({ charId: 'C-42-02', faceclaim: 'Unused Face' }).errors.length, 0);
  assert.equal(f.plan({ name: 'Inactive Main' }).changes.length, 0);
});

test('foreign/archived IDs, missing or duplicate accounts, bad slots/date and wrong types fail closed', () => {
  for (const input of [{ uid: '99' }, { charId: 'missing' }, { date: '31/02/2026' }, { post: '0' }, { name: 'x'.repeat(2001) }]) {
    const f = fixture(), plan = f.plan({ name: 'New Name', ...input });
    assert.ok(plan.errors.length);
    assert.equal(plan.changes.length, 0);
  }
  const f = fixture();
  assert.throws(() => f.plan({ name: 123 }), /ชนิดข้อมูล/);
  f.snapshot[1].values[1][3] = '-';
  assert.ok(f.plan({ name: 'New' }).errors.length);
  f.snapshot[1].values[1][3] = 'MAIN';
  f.snapshot[0].values.push([...f.snapshot[0].values[1]]);
  assert.ok(f.plan({ name: 'New' }).errors.length);
});

test('NPC, staff, other locks and unresolved outgoing locks block face changes while rename is safe', () => {
  const f = fixture();
  for (const faceclaim of [' NPC FACE ', 'Staff Face']) assert.ok(f.plan({ faceclaim }).errors.length);
  const locks = f.snapshot.at(-1).values;
  locks.push([99, 'Other', 'Locked Face', '', 'C-99-01', 'L-99', 'พักนับ']);
  assert.ok(f.plan({ faceclaim: 'Locked Face' }).errors.length);
  locks.push([42, 'Main Name', 'Main Face', '', 'C-42-01', 'L-42', 'พักนับ']);
  assert.ok(f.plan({ faceclaim: 'New Face' }).errors.some(e => e.includes('ยังไม่พร้อม')));
  assert.equal(f.plan({ name: 'Renamed' }).errors.length, 0);
});

test('writer refuses forged rows, UID/CharID mismatch, formulas and fields outside edit whitelist', () => {
  for (const mutate of [p => { p.changes[0].row = 3; }, p => { p.uid = '99'; }, p => { p.charId = 'C-99-01'; }, p => { p.changes[0].fields['Character Slot'] = 'SUB 1'; }]) {
    const f = fixture(), p = f.plan({ name: 'New' }); mutate(p);
    assert.throws(() => f.context.buildRegistrationBatch_(p, f.snapshot));
  }
  const f = fixture(), p = f.plan({ name: '=literal' });
  assert.equal(f.context.buildRegistrationBatch_(p, f.snapshot).requests[0].updateCells.rows[0].values[0].userEnteredValue.stringValue, '=literal');
  f.snapshot[1].formulas[1][2] = '=formula';
  assert.throws(() => f.context.buildRegistrationBatch_(p, f.snapshot), /ห้ามเขียน/);
});

test('edit preview uses the shared ownership, stale-snapshot and durable-receipt transaction path', () => {
  const f = fixture(), cache = new Map(), receipts = new Map();
  let owner = 'session-1', count = 0;
  const book = { getId: () => 'copy', getDeveloperMetadata: () => [...receipts].map(([key, value]) => ({ getKey: () => key, getValue: () => value })) };
  Object.assign(f.context, {
    adminTestBook_: () => book, adminTestOwner_: () => owner, inspectCopyStructure_: () => ({}),
    adminTestLock_: () => ({ tryLock: () => true, releaseLock() {} }),
    Utilities: { getUuid: () => crypto.randomUUID() },
    CacheService: { getUserCache: () => ({ put: (k, v) => cache.set(k, v), get: k => cache.get(k) }) },
    registrationSnapshot_: () => f.snapshot,
    registrationDigest_: value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex'),
    previewCharacterEditInCopy_: input => f.context.planCharacterEdit_(input, f.snapshot, '2026-11-06'),
    Sheets: { Spreadsheets: { batchUpdate: ({ requests }) => { count++; const m = requests.at(-1).createDeveloperMetadata.developerMetadata; receipts.set(m.metadataKey, m.metadataValue); throw new Error('lost response'); } } }
  });
  const plan = f.context.prepareRegistrationWriteTest({ ...f.input, name: 'New' }, 'Admin', 'edit');
  const request = { requestId: plan.requestId, previewToken: plan.previewToken };
  f.snapshot[1].values[1][6] = false;
  f.snapshot[1].values[2][6] = true;
  f.snapshot[2].values[1][4] = 'SUB 1';
  assert.throws(() => f.context.commitRegistrationWriteTest(request), /เฉพาะตัวละครที่กำลังใช้งาน/);
  assert.equal(count, 0);
  f.snapshot[1].values[1][6] = true;
  f.snapshot[1].values[2][6] = false;
  f.snapshot[2].values[1][4] = 'MAIN';
  owner = 'session-2';
  assert.throws(() => f.context.commitRegistrationWriteTest(request), /ไม่ตรงกัน/);
  owner = 'session-1';
  assert.throws(() => f.context.commitRegistrationWriteTest(request), /lost response/);
  cache.clear();
  const receipt = f.context.commitRegistrationWriteTest(request);
  assert.equal(receipt.action, 'edit');
  assert.equal(receipt.uid, '42');
  assert.equal(receipt.charId, 'C-42-01');
  assert.equal(count, 1);
  assert.throws(() => f.context.previewRegistryAction_(f.input, 'inactive'), /ยังไม่รองรับ/);
});
