// Test-copy only. NPC and race changes share the existing transaction protocol.
function previewOtherRegistryForm_(input, action) {
  var book = adminTestBook_(), report = inspectCopyStructure_(book);
  if (!report.headersMatch || report.timezone !== 'Asia/Bangkok') throw new Error('โครงสร้างหรือเขตเวลาชีตสำเนาเปลี่ยน');
  var rule = book.getSheetByName('Player').getRange('C2').getDataValidation();
  if (!rule || String(rule.getCriteriaType()) !== 'VALUE_IN_LIST') throw new Error('ไม่พบรายการเผ่าพันธุ์ใน Player C2');
  [['Users', ['UserID']], ['Characters', ['UserID', 'CharID', 'Character Name', 'Character Slot', 'Character Faceclaim', 'Character Url', 'Is Active Character']],
    ['Player', ['UserID', 'Display Name', 'Race', 'Status', 'Active Character']], ['Staff', ['UserID']],
    ['NPC', ['UserID', 'Display Name', 'Faceclaim', 'Race', 'Link']],
    ['Public Faceclaim Locks', ['UserID', 'Lock Character Name', 'Lock Face Claim', 'End Date', 'CharID', 'LockID', 'Status']]]
    .forEach(function (definition) { readPreviewTable_(book, definition[0], definition[1]); });
  return planOtherRegistryForm_(input, action, registrationSnapshot_(book), rule.getCriteriaValues()[0].map(String), Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd'));
}

function planOtherRegistryForm_(input, action, snapshot, races, today) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || ['npc', 'race'].indexOf(action) < 0) throw new Error('ฟอร์มไม่ถูกต้อง');
  var f = {}, errors = [], warnings = [], changes = [];
  ['uid', 'charId', 'post', 'date', 'name', 'faceclaim', 'race', 'url', 'hasAccount'].forEach(function (key) {
    if (input[key] != null && typeof input[key] !== 'string') throw new Error('ชนิดข้อมูลไม่ถูกต้อง: ' + key);
    f[key] = (input[key] || '').trim();
    if (f[key].length > 2000) errors.push('ข้อมูลยาวเกินไป: ' + key);
  });
  var id = function (value) { return String(value == null ? '' : value).trim().replace(/^0+(?=\d)/, ''); };
  var norm = function (value) { return String(value || '').normalize('NFKC').trim().toLowerCase(); };
  var numericId = function (value) { return /^[0-9]{1,15}$/.test(value) && /[1-9]/.test(value); };
  var date = parsePreviewDate_(f.date);
  if (!date) errors.push('วันที่ต้องมีอยู่จริง ใช้ dd/MM/yyyy ปี ค.ศ.');
  if (races.indexOf(f.race) < 0) errors.push('เผ่าพันธุ์ไม่ตรงกับตัวเลือกในชีต');
  if (date > today) warnings.push('วันที่อยู่ในอนาคต กรุณาตรวจสอบก่อนยืนยัน');
  var tables = {};
  snapshot.forEach(function (table) {
    tables[table.name] = table.values.slice(1).map(function (values, index) {
      var row = { row: index + 2 };
      table.values[0].forEach(function (header, column) { row[header] = values[column]; });
      return row;
    }).filter(function (row) { return row.UserID !== '' && row.UserID != null; });
  });
  ['Users', 'Characters', 'Player', 'Staff', 'NPC', 'Public Faceclaim Locks'].forEach(function (name) { if (!tables[name]) throw new Error('ไม่พบตาราง ' + name); });
  f.uid = id(f.uid);
  var charId = '';
  if (action === 'npc') {
    if (['yes', 'no'].indexOf(f.hasAccount) < 0) errors.push('กรุณาระบุว่ามีบัญชี NPC หรือไม่');
    if (f.hasAccount === 'yes' && !numericId(f.uid)) errors.push('UID ต้องเป็นเลขจำนวนเต็มบวกไม่เกิน 15 หลัก');
    if (f.hasAccount === 'no') {
      var used = [];
      Object.keys(tables).forEach(function (name) { tables[name].forEach(function (row) { used.push(id(row.UserID)); }); });
      f.uid = '';
      for (var code = 97; code <= 122; code++) if (used.indexOf(String.fromCharCode(code)) < 0) { f.uid = String.fromCharCode(code); break; }
      if (!f.uid) errors.push('รหัส a–z ถูกใช้ครบแล้ว ต้องกำหนดวิธีต่อรหัสก่อน');
    }
    if (!f.name || !f.faceclaim) errors.push('กรุณากรอกชื่อ NPC และเฟซเคลม');
    if (f.url && !/^https?:\/\/[^\s/?#]+(?:[/?#][^\s]*)?$/i.test(f.url)) errors.push('ลิงก์ต้องเป็น http:// หรือ https:// หรือเว้นว่าง');
    if (tables.NPC.some(function (row) { return id(row.UserID) === f.uid || norm(row['Display Name']) === norm(f.name); })) errors.push('พบ UID หรือชื่อ NPC นี้แล้ว');
    var face = norm(f.faceclaim);
    if (face && (tables.NPC.some(function (row) { return norm(row.Faceclaim) === face; }) || tables.Characters.some(function (row) { return row['Character Slot'] !== '-' && norm(row['Character Faceclaim']) === face; }))) errors.push('เฟซเคลมนี้มีผู้ใช้งานในทะเบียนแล้ว');
    if (face && tables['Public Faceclaim Locks'].some(function (row) {
      if (norm(row['Lock Face Claim']) !== face) return false;
      if (row.Status === 'พักนับ') return true;
      var end = row['End Date'];
      if (end instanceof Date) end = Utilities.formatDate(end, 'Asia/Bangkok', 'yyyy-MM-dd');
      else end = /^\d{4}-\d{2}-\d{2}$/.test(String(end)) ? String(end) : parsePreviewDate_(String(end || ''));
      return row.Status === 'กำลังนับ' && (!end || end >= today);
    })) errors.push('เฟซเคลมนี้ยังมีสิทธิ์ล็อกอยู่');
    if (!errors.length) changes.push({ sheet: 'NPC', fields: { UserID: f.uid, 'Display Name': f.name, Faceclaim: f.faceclaim, Race: f.race, Link: f.url } });
  } else {
    if (!numericId(f.uid) || !/^[1-9][0-9]{0,14}$/.test(f.post)) errors.push('UID หรือเลขโพสต์ไม่ถูกต้อง');
    var players = tables.Player.filter(function (row) { return id(row.UserID) === f.uid; });
    var chars = tables.Characters.filter(function (row) { return id(row.UserID) === f.uid && row['Is Active Character'] === true; });
    var current = chars[0], player = players[0];
    if (players.length !== 1 || chars.length !== 1 || !current || !player || current.CharID !== f.charId || current['Character Slot'] !== player['Active Character'] || !/^(MAIN|SUB [1-9][0-9]*)$/.test(String(current['Character Slot']))) errors.push('ไม่พบตัวละครที่กำลังใช้งานตรงกับสลอตใน Player');
    if (!errors.length && tables.Characters.filter(function (row) { return row.CharID === current.CharID; }).length !== 1) errors.push('CharID ซ้ำ กรุณาตรวจทะเบียนก่อน');
    if (player && f.race === player.Race) errors.push('เผ่าพันธุ์ใหม่ตรงกับข้อมูลเดิม');
    if (!errors.length) {
      charId = current.CharID;
      changes.push({ sheet: 'Player', row: player.row, fields: { Race: f.race } });
      changes.push({ sheet: 'log ลงทะเบียนตัวละคร', fields: { 'logID (#Post)': f.post, UserID: f.uid, Type: 'เปลี่ยนเผ่าพันธุ์',
        'Old Name': current['Character Name'], 'New Name': '', 'Old Face Claim': current['Character Faceclaim'] || '', 'New Face Claim': '',
        'From Slot': current['Character Slot'], 'To Slot': current['Character Slot'], 'Effective Date': date, 'Affects Usage': false,
        Note: player.Race + ' > ' + f.race }, formulas: ['User Status'] });
    }
  }
  return { action: action, uid: f.uid, charId: charId, errors: errors, warnings: warnings, changes: errors.length ? [] : changes, canCommit: false };
}
