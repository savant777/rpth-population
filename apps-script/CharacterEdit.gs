// Existing characters only. All writes remain bound to the agreed test copy.
function previewCharacterEditInCopy_(input) {
  var book = adminTestBook_(), report = inspectCopyStructure_(book);
  if (!report.headersMatch || report.timezone !== 'Asia/Bangkok') throw new Error('โครงสร้างหรือเขตเวลาชีตสำเนาเปลี่ยน');
  var snapshot = registrationSnapshot_(book);
  // Required fields must still be read through the strict formula-error reader.
  [['Users', ['UserID', 'Username']], ['Characters', ['UserID', 'CharID', 'Character Name', 'Character Slot', 'Character Faceclaim', 'Character Url', 'Is Active Character']],
    ['Player', ['UserID', 'Display Name', 'Race', 'Status', 'Active Character']], ['NPC', ['UserID', 'Display Name', 'Faceclaim']],
    ['Public Faceclaim Locks', ['UserID', 'Lock Character Name', 'Lock Face Claim', 'End Date', 'CharID', 'LockID', 'Status']]]
    .forEach(function (definition) { readPreviewTable_(book, definition[0], definition[1]); });
  return planCharacterEdit_(input, snapshot, Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd'));
}

function planCharacterEdit_(input, snapshot, today) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('ข้อมูลฟอร์มไม่ถูกต้อง');
  var f = {}, errors = [], warnings = [], changes = [];
  ['uid', 'charId', 'post', 'date', 'name', 'faceclaim', 'note'].forEach(function (key) {
    if (input[key] != null && typeof input[key] !== 'string') throw new Error('ชนิดข้อมูลไม่ถูกต้อง: ' + key);
    f[key] = (input[key] || '').trim();
    if (f[key].length > 2000) errors.push('ข้อมูลยาวเกินไป: ' + key);
  });
  var id = function (value) { return String(value == null ? '' : value).trim().replace(/^0+(?=\d)/, ''); };
  var norm = function (value) { return String(value || '').normalize('NFKC').trim().toLowerCase(); };
  var date = parsePreviewDate_(f.date);
  if (!date) errors.push('วันที่ต้องมีอยู่จริง ใช้ dd/MM/yyyy ปี ค.ศ.');
  if (!/^[0-9]{1,15}$/.test(f.uid) || !/[1-9]/.test(f.uid)) errors.push('UID ไม่ถูกต้อง');
  if (!/^[1-9][0-9]{0,14}$/.test(f.post)) errors.push('เลขโพสต์ไม่ถูกต้อง');
  f.uid = id(f.uid);
  var tables = {};
  snapshot.forEach(function (table) {
    tables[table.name] = table.values.slice(1).map(function (values, index) {
      var row = { row: index + 2 };
      table.values[0].forEach(function (header, column) { row[header] = values[column]; });
      return row;
    }).filter(function (row) { return row.UserID !== '' && row.UserID != null; });
  });
  ['Users', 'Characters', 'Player', 'NPC', 'Public Faceclaim Locks'].forEach(function (name) { if (!tables[name]) throw new Error('ไม่พบตาราง ' + name); });
  var chars = tables.Characters.filter(function (row) { return id(row.UserID) === f.uid && String(row.CharID).trim() === f.charId; });
  var target = chars[0];
  if (chars.length !== 1 || tables.Characters.filter(function (row) { return String(row.CharID).trim() === f.charId; }).length !== 1 || !target || !/^(MAIN|SUB [1-9][0-9]*)$/.test(String(target['Character Slot']))) errors.push('ไม่พบตัวละครในสลอตปัจจุบัน หรือ CharID ซ้ำ');
  var users = tables.Users.filter(function (row) { return id(row.UserID) === f.uid; });
  var players = tables.Player.filter(function (row) { return id(row.UserID) === f.uid; });
  if (users.length !== 1 || players.length !== 1) errors.push('ทะเบียนผู้เล่นไม่ครบหรือ UID ซ้ำ กรุณาตรวจชีตก่อน');
  if (errors.length) return { action: 'edit', errors: errors, warnings: warnings, changes: [], canCommit: false };
  var slot = String(target['Character Slot']);
  var active = tables.Characters.filter(function (row) { return id(row.UserID) === f.uid && row['Is Active Character'] === true; });
  if (active.length !== 1 || active[0].CharID !== target.CharID || players[0]['Active Character'] !== slot) errors.push('เปลี่ยนชื่อหรือเฟซเคลมได้เฉพาะตัวละครที่กำลังใช้งาน กรุณาสลับใช้งานก่อน หรือแก้ข้อมูลสลอตที่ไม่ตรงกัน');
  if (tables.Characters.filter(function (row) { return id(row.UserID) === f.uid && row['Character Slot'] === slot; }).length !== 1) errors.push('พบตัวละครซ้ำในสลอตเดียวกัน');
  var nameChanged = !!f.name && f.name !== String(target['Character Name']);
  var faceChanged = !!f.faceclaim && f.faceclaim !== String(target['Character Faceclaim'] || '');
  if (!nameChanged && !faceChanged) errors.push('กรอกชื่อใหม่หรือเฟซเคลมใหม่ที่แตกต่างจากเดิมอย่างน้อยหนึ่งช่อง');
  var locks = tables['Public Faceclaim Locks'].filter(function (row) {
    var status = String(row.Status).trim(), end = row['End Date'];
    if (end instanceof Date) end = Utilities.formatDate(end, 'Asia/Bangkok', 'yyyy-MM-dd');
    else end = /^\d{4}-\d{2}-\d{2}$/.test(String(end)) ? String(end) : parsePreviewDate_(String(end || ''));
    return status === 'พักนับ' || (status === 'กำลังนับ' && (!end || end >= today));
  });
  if (faceChanged) {
    if (locks.some(function (row) { return id(row.UserID) === f.uid && String(row.CharID) === f.charId && norm(row['Lock Face Claim']) === norm(target['Character Faceclaim']); })) errors.push('ตัวละครนี้มีสิทธิ์ล็อกเฟซเคลมเดิม ระบบยกเลิกสิทธิ์พร้อมเปลี่ยนเมจยังไม่พร้อม กรุณารอ flow ล็อก');
    if (locks.some(function (row) { return id(row.UserID) === f.uid && String(row.CharID) === f.charId && norm(row['Lock Face Claim']) === norm(f.faceclaim); })) errors.push('เฟซเคลมใหม่มีสิทธิ์ล็อกของตัวละครนี้ ต้องใช้ flow พักนับที่ยืนยันกติกาแล้ว');
    if (tables.Characters.some(function (row) { return row.row !== target.row && row['Character Slot'] !== '-' && norm(row['Character Faceclaim']) === norm(f.faceclaim); }) || tables.NPC.some(function (row) { return norm(row.Faceclaim) === norm(f.faceclaim); })) errors.push('เฟซเคลมนี้มีผู้ใช้งานในทะเบียนแล้ว');
    if (locks.some(function (row) { return norm(row['Lock Face Claim']) === norm(f.faceclaim) && (id(row.UserID) !== f.uid || String(row.CharID) !== f.charId); })) errors.push('เฟซเคลมนี้มีสิทธิ์ล็อกของตัวละครอื่น');
  }
  if (date > today) warnings.push('วันที่ลงฟอร์มอยู่ในอนาคต กรุณาตรวจวันที่ก่อนใช้งานจริง');
  if (!errors.length) {
    var fields = {};
    if (nameChanged) fields['Character Name'] = f.name;
    if (faceChanged) fields['Character Faceclaim'] = f.faceclaim;
    changes.push({ sheet: 'Characters', row: target.row, fields: fields });
    if (nameChanged && slot === 'MAIN') {
      changes.push({ sheet: 'Users', row: users[0].row, fields: { Username: f.name } });
      changes.push({ sheet: 'Player', row: players[0].row, fields: { 'Display Name': f.name } });
    }
    changes.push({ sheet: 'log ลงทะเบียนตัวละคร', fields: {
      'logID (#Post)': f.post, UserID: f.uid, Type: nameChanged && faceChanged ? 'เปลี่ยนชื่อ+เมจ' : nameChanged ? 'เปลี่ยนชื่อ' : 'เปลี่ยนเมจ',
      'Old Name': String(target['Character Name']), 'New Name': nameChanged ? f.name : '',
      'Old Face Claim': String(target['Character Faceclaim'] || ''), 'New Face Claim': faceChanged ? f.faceclaim : '',
      'From Slot': slot, 'To Slot': slot, 'Effective Date': date, 'Affects Usage': false, Note: f.note
    }, formulas: ['User Status'] });
  }
  return { action: 'edit', uid: f.uid, charId: f.charId, errors: errors, warnings: warnings, changes: changes, canCommit: false };
}

function previewRegistryAction_(input, action) {
  if (!action || action === 'register') return previewNewPlayerInCopy(input);
  if (action === 'edit') return previewCharacterEditInCopy_(input);
  if (action === 'npc' || action === 'race') return previewOtherRegistryForm_(input, action);
  if (action === 'sub' || action === 'switch') return previewCharacterSwitchInCopy_(input, action);
  throw new Error('ฟอร์มนี้ยังไม่รองรับการบันทึก');
}
