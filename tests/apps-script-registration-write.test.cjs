const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const previewSource = fs.readFileSync(path.join(__dirname, '../apps-script/RegistrationPreview.gs'), 'utf8');
const writerSource = fs.readFileSync(path.join(__dirname, '../apps-script/RegistrationWriteTest.gs'), 'utf8');
function fixture() {
  const context = vm.createContext({});
  vm.runInContext(previewSource, context);
  vm.runInContext(writerSource, context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../apps-script/WebGateway.gs'), 'utf8'), context);
  const tables = Object.fromEntries(['Users', 'Characters', 'Player', 'Staff', 'NPC', 'Public Faceclaim Locks'].map(name => [name, []]));
  const input = { uid: '99999', post: '1234', date: '05/11/2026', name: '=literal name', faceclaim: 'Test face', race: 'มนุษย์', url: 'https://roleplayth.com/test', note: '' };
  const plan = context.planNewPlayerPreview_(input, tables, ['มนุษย์'], '2026-11-05');
  const headers = {
    Users: ['UserID', 'Username', 'UserType', 'Status'],
    Characters: ['UserID', 'CharID', 'Character Name', 'Character Slot', 'Character Faceclaim', 'Character Url', 'Is Active Character'],
    Player: ['UserID', 'Display Name', 'Race', 'Status', 'Active Character', 'Switch Date', 'Main Usage Days', 'Sub Usage Days', '2026 Sub Excess Months', '2026 Crystal Required', '2026 Crystal Status', 'Quick Search', 'Post Check', 'Activity Check', 'Reclaim Approved', 'Reclaim Approved At', 'Exempt Until', 'Exempt Note', 'Reclaim History', 'Reclaim Fee', 'Main Char Change', 'Main Char Change Fee', 'Admin Note'],
    'log ลงทะเบียนตัวละคร': ['logID (#Post)', 'UserID', 'Type', 'Old Name', 'New Name', 'Old Face Claim', 'New Face Claim', 'From Slot', 'To Slot', 'Effective Date', 'Affects Usage', 'User Status', 'Note']
  };
  const snapshot = Object.entries(headers).map(([name, columns], index) => ({
    name, sheetId: index + 1, maxRows: 2,
    values: [columns, columns.map((c, i) => i === 0 ? 1 : '')],
    formulas: [columns.map(() => ''), columns.map(() => '=A2')], formats: columns.map(() => 'General')
  }));
  return { context, plan, snapshot, input };
}
test('batch adds four rows with literal strings, booleans, numeric IDs and typed dates', () => {
  const { context, plan, snapshot } = fixture();
  const batch = context.buildRegistrationBatch_(plan, snapshot);
  assert.equal(Object.keys(batch.rows).length, 4);
  assert.equal(batch.requests.filter(request => request.appendDimension).length, 4);
  const updates = batch.requests.filter(request => request.updateCells).map(request => request.updateCells);
  assert.ok(updates.some(update => update.rows[0].values[0].userEnteredValue.stringValue === '=literal name'));
  assert.ok(updates.some(update => update.rows[0].values[0].userEnteredValue.boolValue === true));
  assert.ok(updates.some(update => update.rows[0].values[0].userEnteredValue.numberValue === 99999));
  const date = updates.find(update => update.start.sheetId === 4 && update.start.columnIndex === 9);
  assert.equal(date.rows[0].values[0].userEnteredValue.numberValue, (Date.UTC(2026, 10, 5) - Date.UTC(1899, 11, 30)) / 86400000);
  assert.ok(!updates.some(update => update.start.sheetId === 3 && update.start.columnIndex === 7));
  const formulas = batch.requests.filter(request => request.copyPaste?.pasteType === 'PASTE_FORMULA').map(request => request.copyPaste);
  assert.equal(formulas.filter(request => request.destination.sheetId === 3).length, 12);
  assert.ok(!formulas.some(request => request.destination.sheetId === 3 && request.destination.startColumnIndex === 7));
  assert.ok(formulas.every(request => request.source.startRowIndex === 1 && request.source.endColumnIndex - request.source.startColumnIndex === 1));
});
test('batch rejects formula overwrites and rows beyond formula coverage', () => {
  const { context, plan, snapshot } = fixture();
  plan.changes[2].fields['Sub Usage Days'] = 0;
  assert.throws(() => context.buildRegistrationBatch_(plan, snapshot), /ห้ามเขียน/);
  delete plan.changes[2].fields['Sub Usage Days'];
  snapshot[0].values = Array.from({ length: 10000 }, (_, i) => i === 0 ? snapshot[0].values[0] : [1, '', '', '']);
  snapshot[0].formulas = snapshot[0].values.map(() => ['', '', '', '']);
  assert.throws(() => context.buildRegistrationBatch_(plan, snapshot), /10,000/);
});

function harness() {
  const f = fixture(), cache = new Map(), receipts = new Map();
  let owner = 'user-1', batches = 0, fail = false, failAfter = false;
  const book = { getId: () => 'test-copy', getDeveloperMetadata: () => [...receipts].map(([key, value]) => ({ getKey: () => key, getValue: () => value })) };
  Object.assign(f.context, {
    SpreadsheetApp: { getActiveSpreadsheet: () => book },
    Session: { getTemporaryActiveUserKey: () => owner },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    CacheService: { getUserCache: () => ({ put: (key, value) => cache.set(key, value), get: key => cache.get(key) }) },
    Utilities: { getUuid: () => crypto.randomUUID() },
    Sheets: { Spreadsheets: { batchUpdate: payload => {
      if (fail) { fail = false; throw new Error('network failure before submission'); }
      batches++;
      const metadata = payload.requests.at(-1).createDeveloperMetadata.developerMetadata;
      receipts.set(metadata.metadataKey, metadata.metadataValue);
      if (failAfter) { failAfter = false; throw new Error('response lost after successful commit'); }
    } } },
    inspectCopyStructure_: () => ({}),
    previewNewPlayerInCopy: () => JSON.parse(JSON.stringify(f.plan)),
    registrationSnapshot_: () => f.snapshot,
    registrationDigest_: value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex')
  });
  return { ...f, cache, count: () => batches, owner: value => { owner = value; }, failOnce: () => { fail = true; }, failAfterOnce: () => { failAfter = true; } };
}
test('same request returns its durable receipt after a lost response or cache eviction', () => {
  const h = harness();
  const prepared = h.context.prepareRegistrationWriteTest(h.input, 'Admin');
  const request = { requestId: prepared.requestId, previewToken: prepared.previewToken };
  h.failOnce();
  assert.throws(() => h.context.commitRegistrationWriteTest(request), /network failure/);
  assert.equal(h.count(), 0);
  const receipt = h.context.commitRegistrationWriteTest(request);
  assert.equal(receipt.mode, 'TEST_COPY_COMMITTED');
  assert.equal(receipt.operator, 'Admin');
  h.cache.clear();
  assert.equal(h.context.commitRegistrationWriteTest(request).requestId, request.requestId);
  assert.equal(h.count(), 1);
  h.owner('other');
  assert.throws(() => h.context.commitRegistrationWriteTest(request), /ผู้ใช้อื่น/);
});
test('stale previews, invalid operators, missing tokens and replayed IDs cannot write', () => {
  const h = harness();
  assert.throws(() => h.context.prepareRegistrationWriteTest(h.input, 'intruder'), /บัญชี/);
  const prepared = h.context.prepareRegistrationWriteTest(h.input, 'Admin');
  const request = { requestId: prepared.requestId, previewToken: prepared.previewToken };
  assert.throws(() => h.context.commitRegistrationWriteTest({ ...request, requestId: crypto.randomUUID() }), /ไม่ตรงกัน/);
  h.snapshot[0].values[1][0] = 42;
  assert.throws(() => h.context.commitRegistrationWriteTest(request), /ข้อมูลเปลี่ยน/);
  h.cache.clear();
  assert.throws(() => h.context.commitRegistrationWriteTest(request), /หมดอายุ/);
  assert.equal(h.count(), 0);
});
test('response lost after atomic commit recovers receipt without sending another batch', () => {
  const h = harness();
  const prepared = h.context.prepareRegistrationWriteTest(h.input, 'Admin');
  const request = { requestId: prepared.requestId, previewToken: prepared.previewToken };
  h.failAfterOnce();
  assert.throws(() => h.context.commitRegistrationWriteTest(request), /response lost/);
  assert.equal(h.count(), 1);
  assert.equal(h.context.commitRegistrationWriteTest(request).requestId, request.requestId);
  assert.equal(h.count(), 1);
});

test('a different session cannot commit another session preview', () => {
  const h = harness();
  const prepared = h.context.prepareRegistrationWriteTest(h.input, 'Admin');
  const request = { requestId: prepared.requestId, previewToken: prepared.previewToken };
  h.owner('user-2');
  assert.throws(() => h.context.commitRegistrationWriteTest(request), /ไม่ตรงกัน/);
  assert.equal(h.count(), 0);
  h.owner('user-1');
  assert.equal(h.context.commitRegistrationWriteTest(request).requestId, request.requestId);
  assert.equal(h.count(), 1);
});

test('two previews cannot both write after the first changes the spreadsheet', () => {
  const h = harness();
  const first = h.context.prepareRegistrationWriteTest(h.input, 'Admin');
  const second = h.context.prepareRegistrationWriteTest(h.input, 'Admin');
  h.context.commitRegistrationWriteTest({ requestId: first.requestId, previewToken: first.previewToken });
  // Simulate the new row returned by Sheets after the first atomic batch.
  h.snapshot[0].values.push([99999, 'new registration', '', '']);
  h.snapshot[0].formulas.push(['', '', '', '=A3']);
  assert.throws(() => h.context.commitRegistrationWriteTest({ requestId: second.requestId, previewToken: second.previewToken }), /ข้อมูลเปลี่ยน/);
  assert.equal(h.count(), 1);
});

test('expired previews and a busy script lock do not submit a batch', () => {
  const h = harness();
  const prepared = h.context.prepareRegistrationWriteTest(h.input, 'Admin');
  const request = { requestId: prepared.requestId, previewToken: prepared.previewToken };
  const key = 'rpth-write-' + request.previewToken;
  const state = JSON.parse(h.cache.get(key));
  state.expires = 0;
  h.cache.set(key, JSON.stringify(state));
  assert.throws(() => h.context.commitRegistrationWriteTest(request), /หมดอายุ/);
  let released = false;
  h.context.LockService = { getScriptLock: () => ({ tryLock: () => false, releaseLock: () => { released = true; } }) };
  assert.throws(() => h.context.commitRegistrationWriteTest(request), /กำลังบันทึก/);
  assert.equal(released, false);
  assert.equal(h.count(), 0);
});

test('row allocation preserves blank-UID checkbox rows and permits row 10000 only', () => {
  const { context, plan, snapshot } = fixture();
  const characters = snapshot[1];
  characters.values.push(['', '', '', '', '', '', false]);
  characters.formulas.push(Array(7).fill(''));
  assert.equal(context.buildRegistrationBatch_(plan, snapshot).rows.Characters, 4);
  const users = snapshot[0];
  users.values = Array.from({ length: 9999 }, (_, i) => i === 0 ? users.values[0] : [i, '', '', '']);
  users.formulas = users.values.map(() => ['', '', '', '=A2']);
  users.maxRows = 10000;
  assert.equal(context.buildRegistrationBatch_(plan, snapshot).rows.Users, 10000);
  users.values.push([99999, '', '', '']);
  users.formulas.push(['', '', '', '=A10000']);
  assert.throws(() => context.buildRegistrationBatch_(plan, snapshot), /10,000/);
});
test('readback reports formula errors and spill overwrites after committed writes', () => {
  const { context } = fixture();
  const receipt = { uid: '99999', charId: 'C-99999-01', rows: { Users: 3, Characters: 3, Player: 3, 'log ลงทะเบียนตัวละคร': 3 } };
  const widths = [4, 7, 23, 13];
  const raw = widths.map(width => [Array(width).fill('')]);
  raw[0][0][0] = raw[1][0][0] = raw[2][0][0] = raw[3][0][1] = 99999;
  raw[1][0][1] = receipt.charId;
  const formulas = widths.map(width => [Array(width).fill('')]);
  [[3], [], [3, 5, 6, 8, 9, 11, 15, 16, 18, 19, 20, 21], [11]].forEach((columns, index) => columns.forEach(column => { formulas[index][0][column] = '=A3'; }));
  context.Sheets = { Spreadsheets: { Values: { batchGet: (id, options) => ({ valueRanges: (options.valueRenderOption === 'FORMULA' ? formulas : raw).map(values => ({ values })) }) } } };
  const book = { getId: () => 'test' };
  assert.equal(context.registrationVerifiedReceipt_(book, receipt).verification.ok, true);
  raw[2][0][6] = '#REF!';
  assert.equal(context.registrationVerifiedReceipt_(book, receipt).verification.ok, false);
  raw[2][0][6] = 0;
  formulas[2][0][7] = '=wrong';
  assert.equal(context.registrationVerifiedReceipt_(book, receipt).verification.ok, false);
});
test('write dialog parses, has explicit confirmation and uses no web app endpoints', () => {
  const { context } = fixture();
  for (const mode of [false, true]) new vm.Script(context.registrationPreviewHtml_(mode).match(/<script>([\s\S]*)<\/script>/)[1]);
  assert.doesNotMatch(context.registrationPreviewHtml_(false), /id="commit"/);
  assert.match(context.registrationPreviewHtml_(true), /ยืนยันเพิ่มลงชีตสำเนา/);
  assert.doesNotMatch(writerSource, /function\s+(doGet|doPost)\s*\(/);
});
