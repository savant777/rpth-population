// Native formulas inspected on the agreed copy, 2026-11-07. Never writes summary/Public sheets.
function previewCharacterSwitchInCopy_(input, action) {
  var book = adminTestBook_(), report = inspectCopyStructure_(book);
  if (!report.headersMatch || report.timezone !== 'Asia/Bangkok') throw new Error('โครงสร้างหรือเขตเวลาชีตสำเนาเปลี่ยน');
  var snapshot = registrationSnapshot_(book, true);
  snapshot.forEach(function (table) {
    var width = { Users: 1, Characters: 7, Player: 5, Staff: 1, NPC: 3, 'Public Faceclaim Locks': 7, 'log ลงทะเบียนตัวละคร': 11, 'log เฟซเคลมล็อก': 17 }[table.name];
    readPreviewTable_(book, table.name, table.values[0].slice(0, width));
  });
  var slots = ['Characters', 'Player'].map(function (name) {
    var rule = book.getSheetByName(name).getRange(name === 'Characters' ? 'D2' : 'E2').getDataValidation();
    if (!rule || String(rule.getCriteriaType()) !== 'VALUE_IN_LIST') throw new Error('ไม่พบตัวเลือกสลอตใน ' + name);
    return rule.getCriteriaValues()[0].map(String);
  });
  var allowed = slots[0].filter(function (slot) { return slots[1].indexOf(slot) >= 0; });
  var plan = planCharacterSwitch_(input, action, snapshot, allowed, Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd'));
  if (action === 'main') plan.characterSlotOptions = slots[0];
  return plan;
}

function planCharacterSwitch_(input, action, snapshot, slots, today) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || ['sub', 'switch', 'main'].indexOf(action) < 0) throw new Error('ฟอร์มไม่ถูกต้อง');
  var f = {}, errors = [], warnings = [], changes = [];
  ['uid', 'charId', 'post', 'date', 'name', 'faceclaim', 'url', 'note', 'mainMode', 'replaceId'].forEach(function (key) {
    if (input[key] != null && typeof input[key] !== 'string') throw new Error('ชนิดข้อมูลไม่ถูกต้อง: ' + key);
    f[key] = (input[key] || '').trim();
    if (f[key].length > 2000) errors.push('ข้อมูลยาวเกินไป: ' + key);
  });
  var mainAction = action === 'main', promote = mainAction && f.mainMode === 'promote';
  var newTarget = action === 'sub' || (mainAction && f.mainMode === 'new');
  if (mainAction && ['new', 'promote'].indexOf(f.mainMode) < 0) errors.push('กรุณาเลือกรูปแบบเปลี่ยน MAIN');
  if (mainAction && typeof input.keepMain !== 'boolean') errors.push('กรุณาระบุว่าจะเก็บตัวหลักเดิมหรือไม่');
  var id = function (v) { return String(v == null ? '' : v).trim().replace(/^0+(?=\d)/, ''); };
  var norm = function (v) { return String(v || '').normalize('NFKC').trim().toLowerCase(); };
  var iso = function (v) {
    if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Bangkok', 'yyyy-MM-dd');
    if (typeof v === 'number' && Number.isFinite(v)) return new Date(Date.UTC(1899, 11, 30) + v * 86400000).toISOString().slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? String(v) : parsePreviewDate_(String(v || ''));
  };
  var date = parsePreviewDate_(f.date);
  f.uid = id(f.uid);
  if (!/^[1-9][0-9]{0,14}$/.test(f.uid)) errors.push('UID ไม่ถูกต้อง');
  if (!/^[1-9][0-9]{0,14}$/.test(f.post)) errors.push('เลขโพสต์ไม่ถูกต้อง');
  if (!date) errors.push('วันที่ต้องมีอยู่จริง ใช้ dd/MM/yyyy ปี ค.ศ.');
  if (date > today) errors.push('ยังสลับใช้งานล่วงหน้าไม่ได้ กรุณาระบุวันที่มีผลแล้ว');
  if (!f.faceclaim && !promote) errors.push('กรุณาระบุเฟซเคลมที่จะใช้งาน');
  var tables = {};
  snapshot.forEach(function (table) {
    tables[table.name] = table.values.slice(1).map(function (values, index) {
      var row = { row: index + 2 };
      table.values[0].forEach(function (header, column) { row[header] = values[column]; });
      return row;
    });
  });
  ['Users', 'Characters', 'Player', 'NPC', 'log ลงทะเบียนตัวละคร', 'log เฟซเคลมล็อก'].forEach(function (name) { if (!tables[name]) throw new Error('ไม่พบตาราง ' + name); });
  var players = tables.Player.filter(function (r) { return id(r.UserID) === f.uid; });
  var users = tables.Users.filter(function (r) { return id(r.UserID) === f.uid; });
  var chars = tables.Characters.filter(function (r) { return id(r.UserID) === f.uid; });
  var active = chars.filter(function (r) { return r['Is Active Character'] === true; });
  var valid = chars.filter(function (r) { return /^(MAIN|SUB [1-9][0-9]*)$/.test(String(r['Character Slot'])); });
  if (players.length !== 1 || users.length !== 1 || players[0].Status !== true || active.length !== 1 || players[0]['Active Character'] !== active[0]['Character Slot'] || valid.indexOf(active[0]) < 0) errors.push('ทะเบียนหรือสถานะตัวที่ใช้งานไม่ตรงกัน กรุณาตรวจชีตก่อน');
  if (valid.filter(function (r) { return r['Character Slot'] === 'MAIN'; }).length !== 1 || valid.some(function (r, i) { return valid.some(function (s, j) { return i !== j && (s.CharID === r.CharID || s['Character Slot'] === r['Character Slot']); }); })) errors.push('CharID หรือสลอตซ้ำ หรือไม่มี MAIN เพียงหนึ่งตัว');
  if (tables['log ลงทะเบียนตัวละคร'].some(function (r) { return id(r.UserID) === f.uid && r['Affects Usage'] === true && iso(r['Effective Date']) > date; })) errors.push('มีประวัติการใช้งานหลังวันที่นี้ กรุณาตรวจลำดับเหตุการณ์ก่อน');
  if (tables['log ลงทะเบียนตัวละคร'].some(function (r) { return id(r.UserID) === f.uid && String(r['logID (#Post)']) === f.post; })) errors.push('โพสต์นี้บันทึกทะเบียนของบัญชีนี้แล้ว');
  var current = active[0], target, charId, oldMain = valid.filter(function (r) { return r['Character Slot'] === 'MAIN'; })[0];
  var free = slots.filter(function (slot) { return /^SUB [1-9][0-9]*$/.test(slot) && !valid.some(function (r) { return r['Character Slot'] === slot; }); }).sort(function (a, b) { return Number(a.slice(4)) - Number(b.slice(4)); })[0];
  if (newTarget) {
    if (!f.name) errors.push('กรุณาระบุชื่อตัวละครใหม่');
    if (!/^https?:\/\/[^\s]+$/i.test(f.url)) errors.push('กรุณาระบุลิงก์ประวัติตัวละครใหม่');
    if (tables.Characters.some(function (r) { return r['Character Slot'] !== '-' && norm(r['Character Name']) === norm(f.name); }) || tables.NPC.some(function (r) { return norm(r['Display Name']) === norm(f.name); })) errors.push('ชื่อตัวละครนี้มีในทะเบียนแล้ว');
    if (action === 'sub' && !free) errors.push('ไม่มีสลอตว่างที่ทั้ง Characters และ Player รองรับ');
    // IDs are permanent even for retired rows. Never reuse an archived ID.
    var max = 0;
    chars.forEach(function (r) { var match = String(r.CharID).match(new RegExp('^C-' + f.uid + '-([0-9]+)$')); if (match) max = Math.max(max, Number(match[1])); });
    if (!Number.isSafeInteger(max) || max >= 999999) errors.push('เลข CharID เกินขอบเขต กรุณาตรวจทะเบียน');
    charId = 'C-' + f.uid + '-' + ('0' + (max + 1)).slice(-Math.max(2, String(max + 1).length));
    if (tables.Characters.some(function (r) { return r.CharID === charId; })) errors.push('CharID ซ้ำ');
    target = { CharID: charId, 'Character Name': f.name, 'Character Slot': mainAction ? 'MAIN' : free, 'Character Faceclaim': '', 'Character Url': f.url };
  } else if (promote) {
    target = current; charId = current && current.CharID;
    if (!current || !/^SUB [1-9][0-9]*$/.test(current['Character Slot'])) errors.push('ต้องสลับไปใช้ตัวรองที่จะเลื่อนเป็น MAIN ก่อน');
    if (f.charId && f.charId !== charId) errors.push('เลื่อนเป็น MAIN ได้เฉพาะตัวรองที่กำลังใช้อยู่');
    if (current) f.faceclaim = String(current['Character Faceclaim'] || '');
    if (!f.faceclaim) errors.push('ตัวรองที่กำลังใช้งานต้องมีเฟซเคลม');
  } else {
    var matches = valid.filter(function (r) { return r.CharID === f.charId; });
    target = matches[0]; charId = f.charId;
    if (matches.length !== 1 || !target || target === current || slots.indexOf(target['Character Slot']) < 0 || tables.Characters.filter(function (r) { return r.CharID === f.charId; }).length !== 1) errors.push('กรุณาเลือกตัวละครอื่นของบัญชีนี้ในสลอตที่รองรับ');
  }
  var result = function () { return { action: action, uid: f.uid, charId: charId || '', errors: errors, warnings: warnings, changes: errors.length ? [] : changes, canCommit: false }; };
  if (errors.length) return result();
  if (tables.Characters.some(function (r) { return r !== current && r.CharID === current.CharID; })) errors.push('CharID ตัวที่ใช้งานซ้ำ');
  var oldMainSlot, replacement;
  if (mainAction) {
    if (slots.indexOf('MAIN') < 0) errors.push('Player/Characters ต้องรองรับ MAIN');
    oldMainSlot = promote ? current['Character Slot'] : free;
    if (input.keepMain && !oldMainSlot) {
      replacement = valid.filter(function (r) { return r.CharID === f.replaceId && r['Character Slot'] !== 'MAIN'; })[0];
      if (!replacement) errors.push('ไม่มีสลอตรองว่าง กรุณาเลือกตัวรองที่จะถูกแทนที่');
      else oldMainSlot = replacement['Character Slot'];
    } else if (f.replaceId) errors.push('ใช้สลอตว่างหรือสลอตที่เลื่อนขึ้น MAIN ได้ ไม่ต้องเลือกแทนที่ตัวรอง');
  }
  var events = tables['log เฟซเคลมล็อก'].filter(function (r) { return String(r.LockID || '').trim(); });
  var latest = {}, eventIds = {}, owners = {};
  events.forEach(function (r) {
    if (!r.EventID || eventIds[String(r.EventID)]) errors.push('EventID ว่างหรือซ้ำ กรุณาตรวจ log ล็อก');
    eventIds[String(r.EventID)] = true;
    if (r.Check !== 'OK') errors.push('log ล็อกแถว ' + r.row + ' ยังไม่ผ่าน Check');
    if (!iso(r['Effective Date']) || ['กำลังนับ', 'พักนับ', 'ยกเลิก'].indexOf(r['State After Event']) < 0 || (r['State After Event'] === 'กำลังนับ' && !iso(r['End Date After Event']))) errors.push('วันที่หรือสถานะ log ล็อกไม่สมบูรณ์');
    var owner = owners[String(r.LockID)];
    if (!owner) owners[String(r.LockID)] = { uid: id(r.UserID), charId: r.CharID, face: String(r['Lock Face Claim'] || '') };
    else {
      if (id(r.UserID) !== owner.uid || r.CharID !== owner.charId || (r['Lock Face Claim'] && norm(r['Lock Face Claim']) !== norm(owner.face))) errors.push('เจ้าของหรือเฟซเคลมของสิทธิ์ล็อกเปลี่ยนข้ามเหตุการณ์');
      // Native Check permits blank G on subsequent events. Resolve from start;
      // never treat a blank continuation as missing protection.
      if (!r['Lock Face Claim']) r['Lock Face Claim'] = owner.face;
    }
    latest[String(r.LockID)] = r;
  });
  var liveLocks = Object.keys(latest).map(function (key) { return latest[key]; }).filter(function (r) {
    return r['State After Event'] === 'พักนับ' || (r['State After Event'] === 'กำลังนับ' && iso(r['End Date After Event']) >= date);
  });
  // Lock ownership always includes UID + CharID + face, never the name or slot.
  var own = function (r, c, face) { return id(r.UserID) === f.uid && r.CharID === c.CharID && norm(r['Lock Face Claim']) === norm(face); };
  var outgoing = liveLocks.filter(function (r) { return own(r, current, current['Character Faceclaim']); });
  var incoming = liveLocks.filter(function (r) { return own(r, target, f.faceclaim); });
  if (outgoing.length > 1 || incoming.length > 1) errors.push('พบสิทธิ์ล็อกซ้ำของตัวละครเดียวกัน');
  // Confirmed 2026-11-08: an unlocked face can move from the current character
  // only because this same atomic plan clears that exact source row.
  var releasesCurrentFace = !promote && outgoing.length === 0;
  if (tables.Characters.some(function (r) { return r.CharID !== target.CharID && r['Character Slot'] !== '-' && norm(r['Character Faceclaim']) === norm(f.faceclaim) && !(r.row === current.row && releasesCurrentFace); }) || tables.NPC.some(function (r) { return norm(r.Faceclaim) === norm(f.faceclaim); })) errors.push('เฟซเคลมนี้มีผู้ใช้งานในทะเบียนแล้ว');
  if (liveLocks.some(function (r) { return norm(r['Lock Face Claim']) === norm(f.faceclaim) && !own(r, target, f.faceclaim); })) errors.push('เฟซเคลมนี้มีสิทธิ์ล็อกของตัวละครอื่น');
  var targetOther = liveLocks.filter(function (r) { return id(r.UserID) === f.uid && r.CharID === target.CharID && !own(r, target, f.faceclaim); });
  if (targetOther.some(function (r) { return r['State After Event'] === 'พักนับ'; })) errors.push('ตัวปลายทางมีสิทธิ์พักนับอีกเฟซเคลม กรุณาจัดการสิทธิ์เดิมก่อนสลับ');
  if (events.some(function (r) { return id(r.UserID) === f.uid && (r.CharID === current.CharID || r.CharID === target.CharID) && iso(r['Effective Date']) > date; })) errors.push('มีเหตุการณ์ล็อกหลังวันที่นี้ กรุณาตรวจลำดับก่อน');
  var editChar = function (c, fields) {
    var existing = changes.filter(function (change) { return change.sheet === 'Characters' && change.row === c.row; })[0];
    if (!existing) { existing = { sheet: 'Characters', row: c.row, charId: c.CharID, fields: {} }; changes.push(existing); }
    Object.keys(fields).forEach(function (key) { existing.fields[key] = fields[key]; });
  };
  var hasAnyLock = function (c) { return liveLocks.some(function (r) { return id(r.UserID) === f.uid && r.CharID === c.CharID; }); };
  if (!promote) editChar(current, { 'Is Active Character': false, 'Character Faceclaim': outgoing.length ? String(current['Character Faceclaim']) : '' });
  if (!newTarget) editChar(target, mainAction ? { 'Character Slot': 'MAIN', 'Is Active Character': true } : { 'Is Active Character': true, 'Character Faceclaim': f.faceclaim });
  if (mainAction) {
    [!input.keepMain && oldMain, replacement].filter(Boolean).forEach(function (c) {
      if (hasAnyLock(c)) errors.push('ตัวที่จะออกจากทะเบียนยังมีสิทธิ์ล็อก กรุณาจัดการสิทธิ์ก่อน: ' + c['Character Name']);
      if (events.some(function (r) { return id(r.UserID) === f.uid && r.CharID === c.CharID && iso(r['Effective Date']) > date; })) errors.push('มีเหตุการณ์ล็อกหลังวันที่นี้ของตัวที่จะนำออก');
      editChar(c, { 'Character Slot': '-', 'Is Active Character': false, 'Character Faceclaim': '' });
      warnings.push('นำออกจากทะเบียนปัจจุบัน: ' + c['Character Name'] + ' (' + c.CharID + ') เก็บประวัติและลิงก์เดิม');
    });
    if (input.keepMain) editChar(oldMain, { 'Character Slot': oldMainSlot, 'Is Active Character': false, 'Character Faceclaim': liveLocks.some(function (r) { return own(r, oldMain, oldMain['Character Faceclaim']); }) ? String(oldMain['Character Faceclaim'] || '') : '' });
    changes.push({ sheet: 'Users', row: users[0].row, fields: { Username: String(target['Character Name']) } });
    changes.push({ sheet: 'Player', row: players[0].row, fields: { 'Display Name': String(target['Character Name']), 'Active Character': 'MAIN' } });
    warnings.push('ค่าธรรมเนียมและจำนวนครั้งให้สูตร Player คำนวณจาก log ตามเดิม');
  } else changes.push({ sheet: 'Player', row: players[0].row, fields: { 'Active Character': target['Character Slot'] } });
  if (newTarget) changes.splice(1, 0, { sheet: 'Characters', fields: { UserID: f.uid, CharID: charId, 'Character Name': f.name, 'Character Slot': target['Character Slot'], 'Character Faceclaim': f.faceclaim, 'Character Url': f.url, 'Is Active Character': true } });
  changes.push({ sheet: 'log ลงทะเบียนตัวละคร', fields: { 'logID (#Post)': f.post, UserID: f.uid, Type: mainAction ? 'เปลี่ยนตัวละครหลัก' : action === 'sub' ? 'ลงทะเบียนตัวละครรอง' : 'สลับตัวหลัก-รอง', 'Old Name': String(current['Character Name']), 'New Name': String(target['Character Name']), 'Old Face Claim': String(current['Character Faceclaim'] || ''), 'New Face Claim': f.faceclaim, 'From Slot': mainAction && newTarget && current['Character Slot'] === 'MAIN' ? 'NEW' : current['Character Slot'], 'To Slot': mainAction ? 'MAIN' : target['Character Slot'], 'Effective Date': date, 'Affects Usage': !mainAction || current['Character Slot'] !== 'MAIN', Note: f.note } });
  if (mainAction && input.keepMain) changes.push({ sheet: 'log ลงทะเบียนตัวละคร', fields: { 'logID (#Post)': f.post, UserID: f.uid, Type: 'ย้ายตัวละครหลักเดิมเป็นตัวรอง', 'Old Name': String(oldMain['Character Name']), 'New Name': String(oldMain['Character Name']), 'Old Face Claim': '', 'New Face Claim': '', 'From Slot': 'MAIN', 'To Slot': oldMainSlot, 'Effective Date': date, 'Affects Usage': false, Note: f.note } });
  var addEvent = function (r, type) {
    if (iso(r['Effective Date']) > date) errors.push('วันที่เหตุการณ์ล็อกย้อนหลัง');
    if (type === 'พักนับ' && iso(r['End Date After Event']) <= date) { errors.push('สิทธิ์ล็อกไม่มีวันคงเหลือสำหรับพักนับในวันที่นี้'); return; }
    var eventId = 'SW-' + f.post + '-' + String(r.LockID) + '-' + (type === 'พักนับ' ? 'P' : 'R');
    if (eventIds[eventId]) errors.push('มีเหตุการณ์ล็อกของโพสต์นี้แล้ว');
    changes.push({ sheet: 'log เฟซเคลมล็อก', fields: { EventID: eventId, LockID: String(r.LockID), 'logID (#Post)': f.post, CharID: String(r.CharID), UserID: f.uid, 'Lock Character Name': String(r['Lock Character Name']), 'Lock Face Claim': String(r['Lock Face Claim']), Type: type, 'Effective Date': date, 'Lock Time (Month)': '', Note: 'อัตโนมัติจากการสลับใช้งาน #' + f.post } });
    warnings.push(type + 'สิทธิ์ ' + r.LockID + ' อัตโนมัติพร้อมบันทึกตัวละคร');
  };
  if (!promote) outgoing.forEach(function (r) { if (r['State After Event'] === 'พักนับ') addEvent(r, 'เริ่มนับต่อ'); });
  incoming.forEach(function (r) { if (r['State After Event'] === 'กำลังนับ') addEvent(r, 'พักนับ'); });
  if (outgoing.length) warnings.push('คงเฟซเคลมต้นทางไว้ เพราะมีสิทธิ์ล็อกตรงกับ CharID');
  return result();
}
