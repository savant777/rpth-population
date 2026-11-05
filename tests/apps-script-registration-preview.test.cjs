const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = vm.createContext({});
const source = fs.readFileSync(path.join(__dirname, '../apps-script/RegistrationPreview.gs'), 'utf8');
vm.runInContext(source, context);
const input = { uid: '999999', post: '1234', date: '05/11/2026', name: 'Test Character', faceclaim: 'Unused Test Face', race: 'มนุษย์', url: 'https://roleplayth.com/showthread.php?tid=123', note: '' };
const tables = () => Object.fromEntries(['Users', 'Characters', 'Player', 'Staff', 'NPC', 'Public Faceclaim Locks'].map(name => [name, []]));
const plan = (values = {}, data = tables()) => context.planNewPlayerPreview_({ ...input, ...values }, data, ['มนุษย์'], '2026-11-05');

test('new registration plans exactly four sheets with formulas and no commit', () => {
  const result = plan();
  assert.equal(result.errors.length, 0);
  assert.equal(result.canCommit, false);
  assert.deepEqual(Array.from(result.changes, change => change.sheet), ['Users', 'Characters', 'Player', 'log ลงทะเบียนตัวละคร']);
  assert.equal(result.changes[1].fields.CharID, 'C-999999-01');
  assert.equal(result.changes[2].fields['Exempt Note'], 'สมัคร 05/11/2026');
  assert.equal(result.changes[2].fields['Post Check'], true);
  assert.equal(result.changes[2].fields['Activity Check'], true);
  assert.equal(result.changes[3].fields['Affects Usage'], false);
  assert.equal(result.changes[3].fields['Effective Date'], '2026-11-05');
  assert.equal(result.changes[3].fields['User Status'], undefined);
  assert.equal(result.changes[0].fields.Status, undefined);
});

test('UID duplicates across current, archived and orphaned registries block preview', () => {
  for (const name of Object.keys(tables())) {
    const data = tables();
    data[name].push({ UserID: '0999999', 'Character Slot': '-' });
    const result = plan({}, data);
    assert.ok(result.errors.some(error => error.includes('UID')));
    assert.equal(result.changes.length, 0);
  }
  const data = tables();
  data.Characters.push({ UserID: '1', CharID: 'C-999999-01', 'Character Slot': '-' });
  assert.ok(plan({}, data).errors.some(error => error.includes('CharID')));
});

test('date, race, UID, post and URL validation is server-side', () => {
  for (const values of [{ date: '31/02/2026' }, { date: '05/11/2569' }, { date: '2026-11-05' }, { uid: '0' }, { uid: '1e3' }, { post: '-1' }, { race: 'unlisted' }, { url: 'javascript:alert(1)' }, { name: '' }, { faceclaim: '' }]) {
    assert.ok(plan(values).errors.length, JSON.stringify(values));
    assert.equal(plan(values).changes.length, 0);
  }
  assert.equal(context.parsePreviewDate_('29/02/2024'), '2024-02-29');
  assert.equal(context.parsePreviewDate_('29/02/2026'), '');
  assert.throws(() => plan({ uid: 123 }), /ชนิดข้อมูล/);
  assert.equal(plan({ uid: '0999999' }).changes[1].fields.CharID, 'C-999999-01');
});

test('faceclaim conflicts check NPCs, characters and paused or counting locks', () => {
  const data = tables();
  data.Characters.push({ UserID: '1', 'Character Faceclaim': ' UNUSED TEST FACE ', 'Character Slot': 'MAIN' });
  assert.ok(plan({}, data).errors.length);
  data.Characters[0]['Character Slot'] = '-';
  assert.equal(plan({}, data).errors.length, 0);
  data.NPC.push({ UserID: '2', Faceclaim: 'Unused Test Face' });
  assert.ok(plan({}, data).errors.length);
  for (const [status, end, blocked] of [
    ['พักนับ', '', true], ['กำลังนับ', '2026-11-05', true], ['กำลังนับ', '2026-11-04', false],
    ['กำลังนับ', '05/11/2026', true], ['กำลังนับ', '', true], ['ยกเลิก', '', false], ['หมดอายุ', '', false]
  ]) {
    const locks = tables();
    locks['Public Faceclaim Locks'].push({ UserID: '3', 'Lock Face Claim': 'Unused Test Face', Status: status, 'End Date': end });
    assert.equal(plan({}, locks).errors.length > 0, blocked, `${status} ${end}`);
  }
});

test('dialog JavaScript parses and does not contain a commit call', () => {
  const html = context.registrationPreviewHtml_();
  new vm.Script(html.match(/<script>([\s\S]*)<\/script>/)[1]);
  assert.match(html, /previewNewPlayerInCopy/);
  assert.doesNotMatch(source, /\.(setValues?|appendRow|insertRows?|setFormulas?|copyTo|clearContent)\s*\(/);
  assert.doesNotMatch(source, /function\s+(doGet|doPost|commit\w*)\s*\(/);
});
