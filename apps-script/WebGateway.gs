// Backend-to-backend only. Store RPTH_GATEWAY_SECRET in Script Properties.
// Never put that secret in HTML, Git or a query string.
var RPTH_WEB_CONTEXT_ = null;

function setupGatewaySecret() {
  inspectCopyStructure_(SpreadsheetApp.getActiveSpreadsheet());
  var properties = PropertiesService.getScriptProperties();
  var secret = properties.getProperty('RPTH_GATEWAY_SECRET');
  if (!secret) { secret = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, ''); properties.setProperty('RPTH_GATEWAY_SECRET', secret); }
  if (!/^[a-f0-9]{64}$/.test(secret)) throw new Error('รูปแบบ RPTH_GATEWAY_SECRET เดิมไม่ตรง กรุณาตรวจ Script Properties ก่อน');
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(
    '<div style="font:14px sans-serif;padding:16px"><h2>กุญแจเชื่อม backend</h2><p>คัดลอกเก็บไว้ในเครื่อง แล้วนำไปใส่ช่อง RPTH_GATEWAY_SECRET บน Render ภายหลัง ไม่ต้องส่งกุญแจนี้ในแชต</p><input readonly style="width:100%;box-sizing:border-box;font:13px monospace;padding:10px" value="' + secret + '"><p>กุญแจถูกเก็บใน Script Properties แล้ว ไม่ต้องวางในไฟล์โค้ด</p></div>'
  ).setWidth(650).setHeight(260), 'RPTH · ตั้งค่ากุญแจ');
}

function adminTestBook_() {
  return RPTH_WEB_CONTEXT_ ? SpreadsheetApp.openById('1jR8P-z62t3I95hNCkBBvzUsSA9kwHsD9w5Lo0jlX2QY') : SpreadsheetApp.getActiveSpreadsheet();
}
function adminTestOwner_() {
  return RPTH_WEB_CONTEXT_ ? RPTH_WEB_CONTEXT_.owner : Session.getTemporaryActiveUserKey();
}
function adminTestLock_() {
  // Bound dialogs and web requests must share the same lock.
  return LockService.getScriptLock();
}
function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ service: 'RPTH test-copy gateway', authenticated: false })).setMimeType(ContentService.MimeType.JSON);
}
function doPost(event) {
  var secret = PropertiesService.getScriptProperties().getProperty('RPTH_GATEWAY_SECRET') || '';
  var nonce = '';
  try {
    if (secret.length < 32) throw new Error('Gateway is not configured');
    var text = event && event.postData && event.postData.contents;
    if (typeof text !== 'string' || text.length > 16000) throw new Error('Invalid request');
    var envelope = JSON.parse(text);
    if (typeof envelope.payload !== 'string' || !gatewaySafeEqual_(gatewaySignature_(envelope.payload, secret), envelope.signature)) throw new Error('Unauthorized');
    var input = JSON.parse(envelope.payload);
    if (input.version !== 1 || typeof input.issuedAt !== 'number' || Math.abs(Date.now() - input.issuedAt) > 120000 || !/^[a-f0-9]{48}$/.test(input.nonce || '') || !/^[a-f0-9]{64}$/.test(input.owner || '')) throw new Error('Invalid or expired request');
    assertTestOperator_(input.operator);
    if (['bootstrap', 'preview', 'commit'].indexOf(input.command) < 0) throw new Error('Unsupported command');
    nonce = input.nonce;
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) throw new Error('Gateway busy');
    try {
      var cache = CacheService.getScriptCache();
      if (cache.get('rpth-nonce-' + nonce)) throw new Error('Repeated gateway request');
      cache.put('rpth-nonce-' + nonce, '1', 300);
    } finally { lock.releaseLock(); }
    RPTH_WEB_CONTEXT_ = { owner: input.owner, operator: input.operator };
    var result;
    if (input.command === 'bootstrap') result = gatewayBootstrap_();
    else if (input.command === 'preview') {
      if (!input.request || ['register', 'edit', 'npc', 'race', 'sub', 'switch', 'main'].indexOf(input.request.action) < 0) throw new Error('ฟอร์มนี้ยังไม่รองรับการบันทึก');
      var values = input.request.values;
      if (!values || !/^\d{4}-\d{2}-\d{2}$/.test(values.date || '')) throw new Error('Expected ISO date');
      values.date = values.date.split('-').reverse().join('/');
      result = prepareRegistrationWriteTest(values, input.operator, input.request.action);
    } else result = commitRegistrationWriteTest(input.request);
    return gatewayResponse_({ ok: true, nonce: nonce, result: result }, secret);
  } catch (error) {
    return gatewayResponse_({ ok: false, nonce: nonce, error: secret.length < 32 ? 'Gateway is not configured' : error.message }, secret);
  } finally { RPTH_WEB_CONTEXT_ = null; }
}
function gatewaySignature_(text, secret) {
  // Match Node's UTF-8 bytes explicitly, including Thai registry responses.
  var bytes = Utilities.computeHmacSha256Signature(text, secret, Utilities.Charset.UTF_8);
  return Array.prototype.map.call(bytes, function (byte) {
    return ('0' + (byte & 255).toString(16)).slice(-2);
  }).join('');
}
function gatewaySafeEqual_(expected, actual) {
  if (typeof actual !== 'string' || actual.length !== expected.length) return false;
  var difference = 0;
  for (var i = 0; i < expected.length; i++) difference |= expected.charCodeAt(i) ^ actual.charCodeAt(i);
  return difference === 0;
}
function gatewayResponse_(result, secret) {
  var payload = JSON.stringify(result);
  return ContentService.createTextOutput(JSON.stringify({ payload: payload, signature: gatewaySignature_(payload, secret) })).setMimeType(ContentService.MimeType.JSON);
}
function gatewayBootstrap_() {
  var book = adminTestBook_();
  var report = inspectCopyStructure_(book);
  if (!report.headersMatch || report.timezone !== 'Asia/Bangkok') throw new Error('โครงสร้างชีตสำเนาเปลี่ยน');
  // Bootstrap needs only IDs. Users.Status is a derived formula and does not
  // determine eligibility for registering a new user; Player supplies status.
  var users = readPreviewTable_(book, 'Users', ['UserID']);
  var chars = readPreviewTable_(book, 'Characters', ['UserID', 'CharID', 'Character Name', 'Character Slot', 'Character Faceclaim', 'Character Url', 'Is Active Character']);
  var players = readPreviewTable_(book, 'Player', ['UserID', 'Display Name', 'Race', 'Status', 'Active Character']);
  var npcs = readPreviewTable_(book, 'NPC', ['UserID', 'Display Name', 'Faceclaim', 'Race', 'Link']);
  var staff = readPreviewTable_(book, 'Staff', ['UserID']);
  var locks = readPreviewTable_(book, 'Public Faceclaim Locks', ['UserID', 'Lock Character Name', 'Lock Face Claim', 'End Date', 'CharID', 'LockID', 'Status']);
  var uid = function (value) { return String(value).trim().replace(/^0+(?=\d)/, ''); };
  var date = function (value) { return value instanceof Date ? Utilities.formatDate(value, 'Asia/Bangkok', 'yyyy-MM-dd') : String(value || ''); };
  return {
    mode: 'test-copy', supportedActions: ['register', 'edit', 'npc', 'race', 'sub', 'switch', 'main'], snapshotDate: Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd'),
    userIds: users.map(function (row) { return uid(row.UserID); }),
    players: players.map(function (row) {
      return { uid: uid(row.UserID), mainName: String(row['Display Name']), race: String(row.Race), status: row.Status === true, activeSlot: String(row['Active Character']),
        characters: chars.filter(function (c) { return uid(c.UserID) === uid(row.UserID); }).map(function (c) { return { id: String(c.CharID), name: String(c['Character Name']), slot: String(c['Character Slot']), faceclaim: String(c['Character Faceclaim'] || ''), url: String(c['Character Url'] || ''), active: c['Is Active Character'] === true }; }) };
    }),
    npcs: npcs.map(function (row) { return { uid: uid(row.UserID), name: String(row['Display Name']), faceclaim: String(row.Faceclaim || '') }; }),
    staffFaces: chars.filter(function (c) { return staff.some(function (s) { return uid(s.UserID) === uid(c.UserID); }); }).map(function (c) { return String(c['Character Faceclaim'] || ''); }).filter(Boolean),
    locks: locks.map(function (row) { return { id: String(row.LockID), uid: uid(row.UserID), charId: String(row.CharID), faceclaim: String(row['Lock Face Claim'] || ''), status: String(row.Status), endDate: date(row['End Date']) }; })
  };
}
