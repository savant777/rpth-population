/** @OnlyCurrentDoc */
// Add as a SECOND script file. Keep Code.gs from the inspection step.
// Default dialog is read-only. Optional write mode requires RegistrationWriteTest.gs.
// Both modes are bound to the test copy; neither provides a public web API.
function openRegistrationPreview() {
  var book = adminTestBook_();
  var inspection = inspectCopyStructure_(book);
  if (!inspection.headersMatch) throw new Error('หัวคอลัมน์เปลี่ยน กรุณารัน inspectTestWorkbook ใหม่');
  var html = HtmlService.createHtmlOutput(registrationPreviewHtml_()).setWidth(740).setHeight(680);
  SpreadsheetApp.getUi().showModalDialog(html, 'RPTH · ทดลองสรุปลงทะเบียนผู้เล่นใหม่');
}

function previewNewPlayerInCopy(input) {
  var book = adminTestBook_();
  var inspection = inspectCopyStructure_(book); // Includes the exact test-copy ID guard.
  if (!inspection.headersMatch) throw new Error('หัวคอลัมน์เปลี่ยน กรุณารัน inspectTestWorkbook ใหม่');
  if (inspection.timezone !== 'Asia/Bangkok') throw new Error('เขตเวลาชีตต้องเป็น Asia/Bangkok');
  var player = book.getSheetByName('Player');
  var raceRule = player.getRange('C2').getDataValidation();
  if (!raceRule || String(raceRule.getCriteriaType()) !== 'VALUE_IN_LIST') throw new Error('ไม่พบรายการเผ่าพันธุ์ใน Player C2');
  var races = raceRule.getCriteriaValues()[0].map(String);
  var tables = {};
  [
    ['Users', ['UserID']],
    ['Characters', ['UserID', 'CharID', 'Character Name', 'Character Slot', 'Character Faceclaim', 'Character Url', 'Is Active Character']],
    ['Player', ['UserID']],
    ['Staff', ['UserID']],
    ['NPC', ['UserID', 'Display Name', 'Faceclaim']],
    ['Public Faceclaim Locks', ['UserID', 'Lock Character Name', 'Lock Face Claim', 'End Date', 'CharID', 'LockID', 'Status']]
  ].forEach(function (definition) { tables[definition[0]] = readPreviewTable_(book, definition[0], definition[1]); });
  var today = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');
  tables['Public Faceclaim Locks'].forEach(function (row) {
    var end = row['End Date'];
    if (end instanceof Date) row['End Date'] = Utilities.formatDate(end, 'Asia/Bangkok', 'yyyy-MM-dd');
  });
  var formulaColumns = { Users: ['D'], Player: ['D', 'F', 'G', 'I', 'J', 'L', 'P', 'Q', 'S', 'T', 'U', 'V'], 'log ลงทะเบียนตัวละคร': ['L'] };
  Object.keys(formulaColumns).forEach(function (name) {
    var entry = inspection.sheets.filter(function (sheet) { return sheet.name === name; })[0];
    formulaColumns[name].forEach(function (column) {
      var formula = entry.sampleFormulas[column + '2'];
      if (!formula || /DUMMYFUNCTION|COMPUTED_VALUE/.test(formula)) throw new Error('สูตรต้นแบบไม่พร้อม: ' + name + ' ' + column + '2');
    });
  });
  if (player.getRange('H2').getFormula()) throw new Error('Player H2 ต้องเป็นผลลัพธ์จาก G2 กรุณาตรวจสูตรใหม่');
  var plan = planNewPlayerPreview_(input, tables, races, today);
  plan.formulaPolicy = {
    templateColumns: formulaColumns,
    spillOutput: 'Player H เป็นผลลัพธ์จากสูตร G ห้ามเขียนหรือเติมสูตรแยก',
    method: 'ขั้นบันทึกจะใช้สูตร native จากชีตและเลื่อนเฉพาะอ้างอิงสัมพัทธ์ ไม่ใช้สูตรจาก Excel',
    registrationStatus: 'log User Status ใช้สูตรเดิมใน L ไม่ใส่ค่า Active ทับสูตร'
  };
  return plan;
}

function readPreviewTable_(book, name, headers) {
  var sheet = book.getSheetByName(name);
  if (!sheet || sheet.getMaxColumns() < headers.length) throw new Error('ไม่พบตาราง ' + name);
  var actual = sheet.getRange(1, 1, 1, headers.length).getDisplayValues()[0];
  if (actual.some(function (value, index) { return value !== headers[index]; })) throw new Error('หัวคอลัมน์เปลี่ยน: ' + name);
  var end = sheet.getLastRow();
  if (end > 10000) throw new Error('ตาราง ' + name + ' เกินขอบเขตตรวจทดลอง 10,000 แถว');
  if (end < 2) return [];
  return sheet.getRange(2, 1, end - 1, headers.length).getValues().map(function (values, rowIndex) {
    var row = {};
    headers.forEach(function (header, index) {
      if (typeof values[index] === 'string' && /^#(REF!|N\/A|VALUE!|ERROR!|DIV\/0!|NAME\?|NUM!|SPILL!)/.test(values[index])) throw new Error('พบข้อผิดพลาดสูตรใน ' + name + ' แถว ' + (rowIndex + 2) + ' คอลัมน์ ' + header + ': ' + values[index]);
      row[header] = values[index];
    });
    return row;
  }).filter(function (row) { return String(row.UserID).trim() !== ''; });
}

function planNewPlayerPreview_(input, tables, races, today) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('ข้อมูลฟอร์มไม่ถูกต้อง');
  var f = {}, errors = [], warnings = [];
  ['uid', 'post', 'date', 'name', 'faceclaim', 'race', 'url', 'note'].forEach(function (key) {
    if (input[key] != null && typeof input[key] !== 'string') throw new Error('ชนิดข้อมูลไม่ถูกต้อง: ' + key);
    f[key] = (input[key] || '').trim();
    if (f[key].length > 2000) errors.push('ข้อมูลยาวเกินไป: ' + key);
  });
  var id = function (value) { return String(value == null ? '' : value).trim().replace(/^0+(?=\d)/, ''); };
  var norm = function (value) { return String(value || '').normalize('NFKC').trim().toLowerCase(); };
  var date = parsePreviewDate_(f.date);
  if (!date) errors.push('วันที่ต้องมีอยู่จริง ใช้ dd/MM/yyyy ปี ค.ศ.');
  if (!/^[0-9]{1,15}$/.test(f.uid) || !/[1-9]/.test(f.uid)) errors.push('UID ต้องเป็นเลขจำนวนเต็มบวก ไม่เกิน 15 หลัก');
  if (!/^[1-9][0-9]{0,14}$/.test(f.post)) errors.push('เลขโพสต์ต้องเป็นเลขจำนวนเต็มบวก ไม่เกิน 15 หลัก');
  ['name', 'faceclaim', 'race', 'url'].forEach(function (key) { if (!f[key]) errors.push('กรุณากรอก ' + ({ name: 'ชื่อตัวละคร', faceclaim: 'เฟซเคลม', race: 'เผ่าพันธุ์', url: 'ลิงก์ประวัติ' })[key]); });
  if (f.race && races.indexOf(f.race) < 0) errors.push('เผ่าพันธุ์ไม่ตรงกับตัวเลือกในชีต');
  if (f.url && !/^https?:\/\/[^\s/?#]+(?:[/?#][^\s]*)?$/i.test(f.url)) errors.push('ลิงก์ประวัติต้องเป็น http:// หรือ https:// ที่ถูกต้อง');
  f.uid = id(f.uid);
  if (['Users', 'Characters', 'Player', 'Staff', 'NPC', 'Public Faceclaim Locks'].some(function (name) {
    return tables[name].some(function (row) { return id(row.UserID) === f.uid; });
  })) errors.push('UID นี้มีข้อมูลเดิมแล้ว ไม่เพิ่มผู้เล่นซ้ำ');
  var face = norm(f.faceclaim);
  if (face && (tables.Characters.some(function (row) {
    return String(row['Character Slot']).trim() !== '-' && norm(row['Character Faceclaim']) === face;
  }) || tables.NPC.some(function (row) { return norm(row.Faceclaim) === face; }))) errors.push('เฟซเคลมนี้มีผู้ใช้งานในทะเบียนแล้ว');
  if (face && tables['Public Faceclaim Locks'].some(function (row) {
    if (norm(row['Lock Face Claim']) !== face) return false;
    var status = String(row.Status).trim();
    if (status === 'พักนับ') return true;
    if (status !== 'กำลังนับ') return false;
    var end = /^\d{4}-\d{2}-\d{2}$/.test(String(row['End Date'])) ? row['End Date'] : parsePreviewDate_(String(row['End Date']));
    return !end || end >= today; // Unknown dates must be reviewed, never assumed free.
  })) errors.push('เฟซเคลมนี้ยังมีสิทธิ์ล็อกหรือข้อมูลวันสิ้นสุดต้องตรวจสอบ');
  var charId = 'C-' + f.uid + '-01';
  if (tables.Characters.some(function (row) { return String(row.CharID).trim() === charId; })) errors.push('CharID นี้เคยถูกใช้แล้ว');
  if (date && date > today) warnings.push('วันที่ลงฟอร์มอยู่ในอนาคต กรุณาตรวจวันที่ก่อนใช้งานจริง');
  warnings.push('CharID เป็นค่าที่เสนอ ยังไม่จอง ID และยังไม่มี preview token สำหรับยืนยันบันทึก');
  var changes = [];
  if (!errors.length) {
    changes = [
      { sheet: 'Users', fields: { UserID: f.uid, Username: f.name, UserType: 'Player' }, formulas: ['Status'] },
      { sheet: 'Characters', fields: { UserID: f.uid, CharID: charId, 'Character Name': f.name, 'Character Slot': 'MAIN', 'Character Faceclaim': f.faceclaim, 'Character Url': f.url, 'Is Active Character': true } },
      { sheet: 'Player', fields: { UserID: f.uid, 'Display Name': f.name, Race: f.race, 'Active Character': 'MAIN', 'Post Check': true, 'Activity Check': true, 'Reclaim Approved': false, 'Exempt Note': 'สมัคร ' + date.split('-').reverse().join('/') }, formulas: ['Status', 'Switch Date', 'Main Usage Days → Sub Usage Days', '2026 Sub Excess Months', '2026 Crystal Required', 'Quick Search', 'Reclaim Approved At', 'Exempt Until', 'Reclaim History', 'Reclaim Fee', 'Main Char Change', 'Main Char Change Fee'] },
      { sheet: 'log ลงทะเบียนตัวละคร', fields: { 'logID (#Post)': f.post, UserID: f.uid, Type: 'ลงทะเบียนตัวละครใหม่', 'Old Name': '', 'New Name': f.name, 'Old Face Claim': '', 'New Face Claim': f.faceclaim, 'From Slot': 'NEW', 'To Slot': 'MAIN', 'Effective Date': date, 'Affects Usage': false, Note: f.note }, formulas: ['User Status'] }
    ];
  }
  return { mode: 'PREVIEW_ONLY', canCommit: false, errors: errors, warnings: warnings, changes: changes, note: 'ยังไม่มีการเขียนชีต ข้อมูลที่แสดงเป็นสรุปทดลอง' };
}

function parsePreviewDate_(text) {
  var match = String(text).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return '';
  var year = Number(match[3]), month = Number(match[2]), day = Number(match[1]);
  var date = new Date(Date.UTC(year, month - 1, day));
  if (year < 1900 || year > 2100 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return '';
  return match[3] + '-' + match[2] + '-' + match[1];
}

function registrationPreviewHtml_(writeTest) {
  return `<!doctype html><html lang="th"><head><meta charset="utf-8"><style>
  body{font:14px sans-serif;background:#131313;color:#eee;margin:0;padding:20px}main{background:#fff;color:#222;border-radius:10px;padding:22px}h1{font-size:20px;margin:0 0 12px}p{line-height:1.7}form{display:grid;grid-template-columns:1fr 1fr;gap:14px}label{display:grid;gap:6px}input,select,textarea,button{font:inherit;padding:10px;border:1px solid #ccc;border-radius:5px;min-width:0}button{background:#a47b35;color:white;cursor:pointer}.wide{grid-column:1/-1}button:disabled{opacity:.5;cursor:wait}section{border:1px solid #ddd;border-radius:5px;padding:12px;margin-top:12px}dl{display:grid;grid-template-columns:1fr 2fr;gap:8px;font-size:12px}dd{margin:0;overflow-wrap:anywhere;white-space:pre-wrap}dt{color:#666}.bad{color:#a23e32}.notice{color:#826024}#report{width:100%;box-sizing:border-box;height:130px;margin-top:12px}#output{overflow-wrap:anywhere}@media(max-width:500px){form{grid-template-columns:1fr}}
  </style></head><body><main><h1>ทดลองลงทะเบียนผู้เล่นใหม่</h1><p>อ่านข้อมูลสดจากชีตสำเนาเพื่อเตรียมสรุป 4 ชีต ยังไม่มีการบันทึก ขั้นนี้ใช้บัญชี Google ที่เปิดชีต ไม่ใช่ระบบ login ทีมของหน้าเว็บ</p>
  <form id="form"><label>UID<input name="uid" required inputmode="numeric" maxlength="15"></label><label>เลขโพสต์<input name="post" required inputmode="numeric" maxlength="30"></label><label>วันที่ลงฟอร์ม ค.ศ.<input name="date" required placeholder="05/11/2026" maxlength="10"></label><label>ชื่อตัวละคร<input name="name" required maxlength="200"></label><label>เฟซเคลม<input name="faceclaim" required maxlength="200"></label><label>เผ่าพันธุ์<select name="race" required><option value="">เลือกเผ่าพันธุ์</option><option>พ่อมดแม่มด</option><option>แวมไพร์</option><option>มนุษย์หมาป่า</option><option>ชาวเงือก</option><option>แฟรี่</option><option>มนุษย์</option></select></label><label class="wide">ลิงก์ประวัติ<input name="url" type="url" required maxlength="2000"></label><label class="wide">หมายเหตุ<textarea name="note" maxlength="2000"></textarea></label><button class="wide" id="submit">ตรวจสอบและสรุป (ไม่บันทึก)</button></form>
  ${writeTest ? '<label style="margin-top:14px">บัญชี<input id="operator" value="Admin" readonly></label><p class="notice">โหมดทดสอบเขียน: ปุ่มยืนยันจะเพิ่มข้อมูลในชีตสำเนาเท่านั้น กรุณาใช้ข้อมูลสมมติและหยุดแก้ชีตด้วยมือระหว่างทดสอบ</p><button type="button" id="commit" hidden>ยืนยันเพิ่มลงชีตสำเนา</button>' : ''}
  <p id="status" role="status"></p><div id="output"></div><textarea id="report" aria-label="รายงานสำหรับคัดลอก" readonly hidden></textarea></main><script>
  const writeTest=${writeTest ? 'true' : 'false'};
  const form=document.getElementById('form'),status=document.getElementById('status'),output=document.getElementById('output'),report=document.getElementById('report'),button=document.getElementById('submit');
  const commit=document.getElementById('commit'),operator=document.getElementById('operator');let pending=null;
  const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const invalidate=()=>{pending=null;if(commit)commit.hidden=true;output.replaceChildren();report.hidden=true;report.value='';status.textContent='แก้ข้อมูลแล้ว กรุณาตรวจสอบและสรุปใหม่';};form.addEventListener('input',invalidate);if(operator)operator.addEventListener('change',invalidate);
  form.addEventListener('submit',event=>{event.preventDefault();button.disabled=true;const controls=[...form.elements];const values=Object.fromEntries(new FormData(form));controls.forEach(el=>el.disabled=true);output.replaceChildren();report.hidden=true;status.textContent='กำลังตรวจข้อมูลล่าสุดจากชีตสำเนา…';
    pending=null;if(commit)commit.hidden=true;if(operator)operator.disabled=true;
    const runner=google.script.run.withSuccessHandler(result=>{controls.forEach(el=>el.disabled=false);if(operator)operator.disabled=false;status.textContent=result.errors.length?'ยังสรุปไม่ได้ กรุณาแก้ข้อมูล':'เตรียมสรุปครบ 4 ชีตแล้ว · ยังไม่ได้บันทึก';
      output.innerHTML=result.errors.map(error=>'<p class="bad">'+esc(error)+'</p>').join('')+result.warnings.map(warning=>'<p class="notice">'+esc(warning)+'</p>').join('')+result.changes.map(change=>'<section><h2>'+esc(change.sheet)+'</h2><dl>'+Object.entries(change.fields).map(([key,value])=>'<dt>'+esc(key)+'</dt><dd>'+esc(value===''?'(ว่าง)':value)+'</dd>').join('')+'</dl>'+(change.formulas?'<p class="notice">ใช้สูตรเดิม: '+change.formulas.map(esc).join(', ')+'</p>':'')+'</section>').join('');
      const summary={mode:result.mode,canCommit:result.canCommit,errors:result.errors,warnings:result.warnings,sheets:result.changes.map(change=>change.sheet),formulaPolicy:result.formulaPolicy};report.value=JSON.stringify(summary,null,2);report.hidden=false;
      if(commit&&result.canCommit){pending={requestId:result.requestId,previewToken:result.previewToken};commit.hidden=false;}
    }).withFailureHandler(error=>{controls.forEach(el=>el.disabled=false);if(operator)operator.disabled=false;status.textContent=error.message||'ตรวจสอบไม่สำเร็จ';});
    if(writeTest)runner.prepareRegistrationWriteTest(values,operator.value);else runner.previewNewPlayerInCopy(values);
  });
  if(commit)commit.addEventListener('click',()=>{if(!pending)return;commit.disabled=true;[...form.elements].forEach(el=>el.disabled=true);operator.disabled=true;status.textContent='กำลังบันทึกลงสำเนา กรุณารอ…';
    google.script.run.withSuccessHandler(receipt=>{pending=null;commit.hidden=true;commit.disabled=false;[...form.elements].forEach(el=>el.disabled=false);operator.disabled=false;status.textContent=receipt.note;report.value=JSON.stringify({mode:receipt.mode,requestId:receipt.requestId,operator:receipt.operator,committedAt:receipt.committedAt,rows:receipt.rows,verification:receipt.verification,note:receipt.note},null,2);report.hidden=false;output.replaceChildren();
    }).withFailureHandler(error=>{commit.disabled=false;[...form.elements].forEach(el=>el.disabled=false);operator.disabled=false;status.textContent=(error.message||'ยังไม่ทราบผลบันทึก')+' · หากการเชื่อมต่อขาด ให้กดปุ่มยืนยันเดิมซ้ำก่อนแก้ฟอร์ม ห้ามปิดหน้าต่างจนทราบผล';}).commitRegistrationWriteTest(pending);
  });
  </script></body></html>`;
}
