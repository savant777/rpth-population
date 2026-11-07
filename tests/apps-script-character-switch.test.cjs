const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
function fixture() {
  const context = vm.createContext({});
  for (const file of ['RegistrationPreview.gs','CharacterSwitch.gs','CharacterSwitchWrite.gs','RegistrationWriteTest.gs']) vm.runInContext(fs.readFileSync(path.join(__dirname,'../apps-script',file),'utf8'),context);
  const defs = [
    ['Users',['UserID','Username','UserType','Status'],[[42,'Main','Player','Active']],[]],
    ['Characters',['UserID','CharID','Character Name','Character Slot','Character Faceclaim','Character Url','Is Active Character'],[[42,'C-42-01','Main','MAIN','Main Face','https://roleplayth.com/main',true],[42,'C-42-02','Sub','SUB 1','','https://roleplayth.com/sub',false],[42,'C-42-09','Retired','-','','',false]],[]],
    ['Player',['UserID','Display Name','Race','Status','Active Character','Switch Date','Main Usage Days','Sub Usage Days','2026 Sub Excess Months','2026 Crystal Required','2026 Crystal Status','Quick Search','Post Check','Activity Check','Reclaim Approved','Reclaim Approved At','Exempt Until','Exempt Note','Reclaim History','Reclaim Fee','Main Char Change','Main Char Change Fee','Admin Note'],[[42,'Main','มนุษย์',true,'MAIN']],[3,5,6,8,9,11,15,16,18,19,20,21]],
    ['log ลงทะเบียนตัวละคร',['logID (#Post)','UserID','Type','Old Name','New Name','Old Face Claim','New Face Claim','From Slot','To Slot','Effective Date','Affects Usage','User Status','Note'],[[1,42,'ลงทะเบียนตัวละครใหม่','','Main','','Main Face','NEW','MAIN','2026-01-01',false]],[11]],
    ['NPC',['UserID','Display Name','Faceclaim'],[['a','NPC','NPC Face']],[]],
    ['log เฟซเคลมล็อก',['EventID','LockID','logID (#Post)','CharID','UserID','Lock Character Name','Lock Face Claim','Type','Effective Date','Lock Time (Month)','Note','Previous Event Row','State After Event','Days After Event','End Date After Event','Check','Event Row'],[],[11,12,13,14,15,16]]
  ];
  const snapshot = defs.map(([name,headers,data,formula],i)=>{const values=[headers,...data.map(r=>headers.map((_,c)=>r[c]??''))];if(values.length===1)values.push(headers.map(()=>''));return {name,sheetId:i+1,maxRows:1000,values,formulas:values.map((_,r)=>headers.map((_,c)=>r&&formula.includes(c)?'=native2':'')),formats:headers.map(()=> 'General')};});
  const table=name=>snapshot.find(t=>t.name===name);
  const input={uid:'42',charId:'C-42-02',post:'55',date:'07/11/2026',faceclaim:'Sub Face',name:'New Sub',url:'https://roleplayth.com/new',note:''};
  const plan=(action='switch',values={})=>context.planCharacterSwitch_({...input,...values},action,snapshot,['MAIN','SUB 1','SUB 2','SUB 3'],'2026-11-07');
  const event=(charId,face,state,end='2026-12-01',lockId='L-42-01')=>{ const t=table('log เฟซเคลมล็อก');const r=['E-'+lockId,lockId,4,charId,42,charId,face,state==='พักนับ'?'พักนับ':'เริ่มล็อก','2026-10-01','', '',0,state,40,end,'OK',t.values.length+1]; if(!t.values[1][0]){t.values[1]=r;}else{t.values.push(r);t.formulas.push(t.formulas[1].slice());}return r;};
  return {context,snapshot,table,input,plan,event};
}
test('switch updates both flags/Player slot and usage log, clears unprotected outgoing face, preserves URLs and names',()=>{
  const f=fixture(),before=JSON.stringify(f.snapshot),p=f.plan();assert.deepEqual(Array.from(p.errors),[]);
  assert.equal(p.changes[0].fields['Character Faceclaim'],'');assert.equal(p.changes[0].fields['Is Active Character'],false);
  assert.equal(p.changes[1].fields['Is Active Character'],true);assert.equal(p.changes[2].fields['Active Character'],'SUB 1');
  assert.equal(p.changes[3].fields['Affects Usage'],true);assert.equal(p.changes[3].fields['Old Face Claim'],'Main Face');
  assert.equal(p.changes[3].fields['From Slot'],'MAIN');assert.equal(p.changes[3].fields['To Slot'],'SUB 1');
  const b=f.context.buildRegistrationBatch_(p,f.snapshot);assert.deepEqual(Array.from(b.rows.Characters),[2,3]);assert.equal(b.expected.length,4);
  assert.ok(!b.requests.some(r=>r.updateCells&&r.updateCells.start.sheetId===2&&[2,3,5].includes(r.updateCells.start.columnIndex)));
  assert.equal(JSON.stringify(f.snapshot),before);
});
test('new sub allocates free slot, new ID after archived IDs, URL and immediate active switch; works when outgoing is SUB',()=>{
  const f=fixture();f.table('Characters').values[1][6]=false;f.table('Characters').values[2][6]=true;f.table('Characters').values[2][4]='Sub Face';f.table('Player').values[1][4]='SUB 1';
  const p=f.plan('sub',{faceclaim:'New Face'});assert.deepEqual(Array.from(p.errors),[]);assert.equal(p.charId,'C-42-10');
  assert.equal(p.changes[1].fields['Character Slot'],'SUB 2');assert.equal(p.changes[1].fields['Character Url'],f.input.url);
  assert.equal(p.changes[3].fields['From Slot'],'SUB 1');assert.equal(p.changes[3].fields.Type,'ลงทะเบียนตัวละครรอง');
  const b=f.context.buildRegistrationBatch_(p,f.snapshot);assert.deepEqual(Array.from(b.rows.Characters),[3,5]);
});
test('matching outgoing paused lock keeps face/resumes; incoming counting lock pauses in same atomic batch',()=>{
  const f=fixture();f.event('C-42-01','Main Face','พักนับ','');f.event('C-42-02','Sub Face','กำลังนับ','2026-12-01','L-42-02');
  // Prefilled formulas must not force appending beyond the input rows.
  const log=f.table('log เฟซเคลมล็อก');for(let i=0;i<8;i++){log.values.push(log.values[0].map(()=>''));log.formulas.push(log.formulas[1].slice());}
  const p=f.plan();assert.deepEqual(Array.from(p.errors),[]);assert.equal(p.changes[0].fields['Character Faceclaim'],'Main Face');
  assert.deepEqual(Array.from(p.changes.slice(4),c=>c.fields.Type),['เริ่มนับต่อ','พักนับ']);
  assert.ok(p.changes.slice(4).every(c=>c.fields['Lock Time (Month)']===''));
  const b=f.context.buildRegistrationBatch_(p,f.snapshot);assert.deepEqual(Array.from(b.rows['log เฟซเคลมล็อก']),[4,5]);
  assert.equal(b.requests.filter(r=>r.copyPaste?.pasteType==='PASTE_FORMULA'&&r.copyPaste.destination.sheetId===6).length,12);
});
test('lock matching cannot inherit rights by face/name/slot alone; expired lock does not retain face',()=>{
  const f=fixture();const r=f.event('C-42-09','Main Face','พักนับ','');r[5]='Main';assert.equal(f.plan().changes[0].fields['Character Faceclaim'],'');
  r[3]='C-42-01';r[4]=99;assert.equal(f.plan().changes[0].fields['Character Faceclaim'],'');
  r[4]=42;r[12]='กำลังนับ';r[14]='2026-11-06';assert.equal(f.plan().changes[0].fields['Character Faceclaim'],'');
});
test('reject current/foreign/retired target, invalid active source, conflicts, duplicate post and out of order dates',()=>{
  for(const values of [{charId:'C-42-01'},{charId:'C-42-09'},{charId:'C-99-01'},{faceclaim:'NPC Face'},{faceclaim:'Main Face'},{date:'31/02/2026'},{date:'08/11/2026'},{post:'1'}])assert.ok(fixture().plan('switch',values).errors.length);
  const f=fixture();f.table('Player').values[1][4]='SUB 1';assert.ok(f.plan().errors.length);
  const g=fixture();g.table('Characters').values[2][6]=true;assert.ok(g.plan().errors.length);
  const h=fixture();h.event('C-42-02','Sub Face','กำลังนับ','2026-11-07');assert.ok(h.plan().errors.some(e=>e.includes('คงเหลือ')));
  const j=fixture();j.event('C-42-01','Main Face','พักนับ','')[8]='2026-11-08';assert.ok(j.plan().errors.length);
});
test('extra subs use common native slot list; no unchecked permission flags; full list and duplicate identity fail closed',()=>{
  const f=fixture();const c=f.table('Characters');c.values.push([42,'C-42-03','Second','SUB 2','','',false]);c.formulas.push(c.formulas[1].slice());
  assert.equal(f.plan('sub').changes[1].fields['Character Slot'],'SUB 3');
  c.values.push([42,'C-42-04','Third','SUB 3','','',false]);c.formulas.push(c.formulas[1].slice());assert.ok(f.plan('sub').errors.length);
  const g=fixture();g.table('Characters').values[2][3]='MAIN';assert.ok(g.plan().errors.length);
});
test('writer refuses formula edits, wrong row identity, unsupported sheet, and missing native lock formulas',()=>{
  const f=fixture(),p=f.plan();p.changes[0].fields['Character Url']='bad';assert.throws(()=>f.context.buildRegistrationBatch_(p,f.snapshot),/ห้ามเขียน/);
  const g=fixture(),q=g.plan();q.changes[0].charId='wrong';assert.throws(()=>g.context.buildRegistrationBatch_(q,g.snapshot),/CharID/);
  const h=fixture();h.event('C-42-02','Sub Face','กำลังนับ');const r=h.plan();h.table('log เฟซเคลมล็อก').formulas[1][12]='';assert.throws(()=>h.context.buildRegistrationBatch_(r,h.snapshot),/native/);
});
test('readback checks every changed character and both lock rows; mismatch or native Check failure cannot report success',()=>{
  const f=fixture();f.event('C-42-01','Main Face','พักนับ','');f.event('C-42-02','Sub Face','กำลังนับ','2026-12-01','L-42-02');
  const batch=f.context.buildRegistrationBatch_(f.plan(),f.snapshot),receipt={action:'switch',uid:'42',expected:batch.expected,rows:batch.rows};
  let bad=false;f.context.Sheets={Spreadsheets:{Values:{batchGet:(_id,opts)=>({valueRanges:batch.expected.map(e=>{const raw=[];Object.entries(e.fields).forEach(([c,v])=>raw[c]=v);if(e.sheet==='log เฟซเคลมล็อก')raw[15]=bad?'ผิดพลาด':'OK';if(opts.valueRenderOption==='FORMULA')e.formulas.forEach(c=>raw[c]='=native');return {values:[raw]};})})}}};
  assert.equal(f.context.verifyCharacterSwitchReceipt_({getId:()=> 'copy'},receipt).verification.ok,true);
  bad=true;assert.equal(f.context.verifyCharacterSwitchReceipt_({getId:()=> 'copy'},receipt).verification.ok,false);
});
