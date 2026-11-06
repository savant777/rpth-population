const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');
const secret = 'test-only-gateway-key-not-a-real-secret';
const sign = payload => crypto.createHmac('sha256', secret).update(payload).digest('hex');
test('backend gateway signs requests and verifies matching signed responses', async () => {
  const { createGateway } = await import('../admin-gateway.mjs');
  let tamper = false;
  const gateway = createGateway({ url: 'https://script.google.com/macros/s/test123/exec', secret, fetchImpl: async (url, options) => {
    const envelope = JSON.parse(options.body);
    assert.equal(envelope.signature, sign(envelope.payload));
    const input = JSON.parse(envelope.payload);
    assert.equal(input.operator, 'Admin');
    assert.equal(input.command, 'bootstrap');
    const payload = JSON.stringify({ ok: true, nonce: input.nonce, result: { players: [] } });
    return { ok: true, text: async () => JSON.stringify({ payload, signature: tamper ? '0'.repeat(64) : sign(payload) }) };
  } });
  assert.equal(gateway.configured, true);
  assert.deepEqual(await gateway.call('bootstrap', {}, { operator: 'Admin', owner: '1'.repeat(64) }), { players: [] });
  tamper = true;
  await assert.rejects(gateway.call('bootstrap', {}, { operator: 'Admin', owner: '1'.repeat(64) }), /ลายเซ็น/);
  for (const url of ['http://localhost/exec', 'https://evil.example/exec', 'https://script.google.com/macros/s/test/dev', 'https://script.google.com/macros/s/test/exec?key=secret']) assert.equal(createGateway({ url, secret }).configured, false);
});
test('Apps Script gateway rejects unsigned, stale, repeated and wrong-operator requests', () => {
  const nonces = new Map(); let calls = 0;
  const context = vm.createContext({
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => secret }) },
    Utilities: { Charset: { UTF_8: 'UTF-8' }, computeHmacSha256Signature: (payload, key, charset) => {
      assert.equal(charset, 'UTF-8');
      return new Int8Array(crypto.createHmac('sha256', key).update(payload, 'utf8').digest());
    } },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    CacheService: { getScriptCache: () => ({ get: key => nonces.get(key), put: (key, value) => nonces.set(key, value) }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: text => ({ text, setMimeType() { return this; } }) },
    assertTestOperator_: operator => { if (operator !== 'Admin') throw new Error('Bad operator'); }
  });
  vm.runInContext(fs.readFileSync(require('node:path').join(__dirname, '../apps-script/WebGateway.gs'), 'utf8'), context);
  assert.equal(context.gatewaySignature_('RPTH gateway UTF-8 ทดสอบ', 'public-test-key'), 'b15f2be4e87dd88fa49d04d82ab6cd18096ed566e9fc4f9cee9526e5ea4cb539');
  for (const payload of ['ASCII', JSON.stringify({ name: 'ตัวละครทดสอบ', face: 'ไทย 🎭', note: 'e\u0301' })]) {
    assert.equal(context.gatewaySignature_(payload, secret), sign(payload));
  }
  context.gatewayBootstrap_ = () => { calls++; return { mode: 'test-copy' }; };
  const base = { version: 1, issuedAt: Date.now(), nonce: 'a'.repeat(48), owner: 'b'.repeat(64), command: 'bootstrap', operator: 'Admin', request: {} };
  function invoke(values = {}, signature) {
    const payload = JSON.stringify({ ...base, ...values });
    const response = context.doPost({ postData: { contents: JSON.stringify({ payload, signature: signature || sign(payload) }) } });
    const envelope = JSON.parse(response.text);
    assert.equal(envelope.signature, sign(envelope.payload));
    return JSON.parse(envelope.payload);
  }
  assert.equal(invoke({}, '0'.repeat(64)).ok, false);
  assert.equal(invoke({ issuedAt: Date.now() - 300000 }).ok, false);
  assert.equal(invoke({ operator: 'unknown' }).ok, false);
  assert.equal(invoke().ok, true);
  assert.equal(invoke().ok, false);
  assert.equal(calls, 1);
  let prepared;
  context.prepareRegistrationWriteTest = (values, operator, action) => { prepared = { values, operator, action }; return { canCommit: true }; };
  assert.equal(invoke({ nonce: 'c'.repeat(48), command: 'preview', request: { action: 'edit', values: { date: '2026-11-06', uid: '42' } } }).ok, true);
  assert.equal(prepared.action, 'edit');
  assert.equal(prepared.operator, 'Admin');
  assert.equal(prepared.values.date, '06/11/2026');
  assert.equal(invoke({ nonce: 'd'.repeat(48), command: 'preview', request: { action: 'inactive', values: {} } }).ok, false);
  assert.equal(context.RPTH_WEB_CONTEXT_, null);
});
