const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
function fixture(){
  const c=vm.createContext({});
  for(const file of ['RegistrationPreview.gs','CharacterEdit.gs','OtherRegistryForms.gs','RegistrationWriteTest.gs'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../apps-script',file),'utf8'),c);
  const defs=[
    ['Users',['UserID','Username','UserType','Status'],[[42,'Main','Player','Active']]],
    ['Characters',['UserID','CharID','Character Name','Character Slot','Character Faceclaim','Character Url','Is Active Character'],[[42,'C-42-01','Main','MAIN','Used Face','https://roleplayth.com/',true],[42,'C-42-02','Sub','SUB 1','','',false]]],
    ['Player',['UserID','Display Name','Race','Status','Active Character'],[[42,'Main','มนุษย์',true,'MAIN']]],
    ['Staff',['UserID'],[[99]]],
    ['NPC',['UserID','Display Name','Faceclaim','Race','Link'],[['a','Existing NPC','NPC Face','มนุษย์','']]],
    ['Public Faceclaim Locks',['UserID','Lock Character Name','Lock Face Claim','End Date','CharID','LockID','Status'],[[99,'Other','Locked Face','','C-99-01','L-99','พักนับ']]],
    ['log ลงทะเบียนตัวละคร',['logID (#Post)','UserID','Type','Old Name','New Name','Old Face Claim','New Face Claim','From Slot','To Slot','Effective Date','Affects Usage','User Status','Note'],[[1,42,'ลงทะเบียนตัวละครใหม่','','Main','','Used Face','NEW','MAIN','2026-01-01',false,'Active','']]]
  ];
  const snapshot=defs.map(([name,headers,data],i)=>({name,sheetId:i+1,maxRows:1000,values:[headers,...data],formulas:[headers.map(()=>''),...data.map(()=>headers.map((_,j)=>name==='log ลงทะเบียนตัวละคร'&&j===11?'=A2':''))],formats:headers.map(()=>'General')}));
  const npc={hasAccount:'no',uid:'',name:'New NPC',faceclaim:'New Face',race:'มนุษย์',url:'',date:'06/11/2026'};
  const race={uid:'42',charId:'C-42-01',post:'22',date:'06/11/2026',race:'แฟรี่'};
  const plan=(action,values={})=>c.planOtherRegistryForm_({...({npc,race}[action]),...values},action,snapshot,['มนุษย์','แฟรี่'],'2026-11-06');
  return {c,snapshot,npc,race,plan};
}
test('NPC allocates the next unused letter, writes one sheet and preserves letter versus numeric IDs',()=>{
  const f=fixture(),before=JSON.stringify(f.snapshot),p=f.plan('npc');
  assert.equal(p.errors.length,0);assert.equal(p.uid,'b');assert.equal(p.changes.length,1);assert.equal(p.changes[0].sheet,'NPC');
  let b=f.c.buildRegistrationBatch_(p,f.snapshot);
  assert.equal(Object.keys(b.rows).join(','),'NPC');
  assert.equal(b.requests.find(r=>r.updateCells?.start.columnIndex===0).updateCells.rows[0].values[0].userEnteredValue.stringValue,'b');
  const numeric=f.plan('npc',{hasAccount:'yes',uid:'000123'});
  assert.equal(numeric.uid,'123');
  b=f.c.buildRegistrationBatch_(numeric,f.snapshot);
  assert.equal(b.requests.find(r=>r.updateCells?.start.columnIndex===0).updateCells.rows[0].values[0].userEnteredValue.numberValue,123);
  assert.equal(JSON.stringify(f.snapshot),before);
});
test('NPC rejects duplicates, used faces, paused rights, bad inputs and exhausted a-z',()=>{
  const f=fixture();
  f.snapshot[1].values.push([99,'C-99-01','Staff','MAIN','Staff Face','',true]);
  for(const values of [{name:'Existing NPC'},{faceclaim:' USED FACE '},{faceclaim:'Staff Face'},{faceclaim:'NPC Face'},{faceclaim:'Locked Face'},{race:'unlisted'},{hasAccount:'yes',uid:'0'},{url:'javascript:alert(1)'},{hasAccount:'unknown'},{date:'31/02/2026'},{name:'x'.repeat(2001)}]){
    const p=f.plan('npc',values);assert.ok(p.errors.length,JSON.stringify(values));assert.equal(p.changes.length,0);
  }
  const users=f.snapshot[0];
  for(let i=98;i<=122;i++)users.values.push([String.fromCharCode(i),'','','']);
  assert.ok(f.plan('npc').errors.some(e=>e.includes('a–z')));
  assert.throws(()=>f.plan('npc',{name:123}),/ชนิดข้อมูล/);
  for(const [status,end,blocked] of [['กำลังนับ','2026-11-05',false],['กำลังนับ','2026-11-06',true],['กำลังนับ','',true],['หมดอายุ','',false]]){
    const g=fixture();g.snapshot[5].values[1][3]=end;g.snapshot[5].values[1][6]=status;
    assert.equal(g.plan('npc',{faceclaim:'Locked Face'}).errors.length>0,blocked,`${status} ${end}`);
  }
});
test('race changes Player Race and log only, derives old facts from the current character and uses FALSE',()=>{
  const f=fixture(),p=f.plan('race');assert.equal(p.errors.length,0);
  assert.deepEqual(Array.from(p.changes,x=>x.sheet),['Player','log ลงทะเบียนตัวละคร']);
  assert.equal(p.changes[0].fields.Race,'แฟรี่');assert.equal(p.changes[0].row,2);
  const log=p.changes[1].fields;
  assert.equal(log.Type,'เปลี่ยนเผ่าพันธุ์');assert.equal(log.Note,'มนุษย์ > แฟรี่');assert.equal(log['Old Name'],'Main');assert.equal(log['Old Face Claim'],'Used Face');
  assert.equal(log['From Slot'],'MAIN');assert.equal(log['To Slot'],'MAIN');assert.equal(log['Affects Usage'],false);assert.equal(log['New Name'],'');
  const b=f.c.buildRegistrationBatch_(p,f.snapshot);
  assert.equal(b.requests[0].updateCells.start.columnIndex,2);
  assert.ok(b.requests.filter(r=>r.copyPaste).every(r=>r.copyPaste.destination.sheetId===7));
  assert.ok(!b.requests.some(r=>r.updateCells?.start.sheetId===2));
});
test('race rejects unchanged races, inactive targets, ambiguous/mismatched active state and formula overwrites',()=>{
  const f=fixture();
  for(const values of [{race:'มนุษย์'},{charId:'C-42-02'},{post:'0'},{uid:'99'},{date:'29/02/2026'}])assert.equal(f.plan('race',values).changes.length,0);
  f.snapshot[1].values[2][6]=true;assert.equal(f.plan('race').changes.length,0);
  f.snapshot[1].values[1][6]=false;f.snapshot[2].values[1][4]='SUB 1';
  assert.equal(f.plan('race',{charId:'C-42-02'}).errors.length,0);
  const p=f.plan('race',{charId:'C-42-02'});p.changes[0].fields['Display Name']='must not write';
  assert.throws(()=>f.c.buildRegistrationBatch_(p,f.snapshot),/ห้ามเขียน/);
});
test('native reader contract validates race choices and every contiguous header before preview',()=>{
  const f=fixture();
  const book={getSheetByName:name=>{const t=f.snapshot.find(t=>t.name===name);return {getMaxColumns:()=>t.values[0].length,getLastRow:()=>t.values.length,getRange:(row,col,height,width)=>row==='C2'?{getDataValidation:()=>({getCriteriaType:()=> 'VALUE_IN_LIST',getCriteriaValues:()=>[['มนุษย์','แฟรี่']]})}:{getDisplayValues:()=>t.values.slice(row-1,row-1+height).map(r=>r.slice(col-1,col-1+width).map(String)),getValues:()=>t.values.slice(row-1,row-1+height).map(r=>r.slice(col-1,col-1+width))}};}};
  Object.assign(f.c,{adminTestBook_:()=>book,inspectCopyStructure_:()=>({headersMatch:true,timezone:'Asia/Bangkok'}),registrationSnapshot_:()=>f.snapshot,Utilities:{formatDate:()=> '2026-11-06'}});
  assert.equal(f.c.previewOtherRegistryForm_(f.npc,'npc').uid,'b');assert.equal(f.c.previewOtherRegistryForm_(f.race,'race').errors.length,0);
  f.snapshot[4].values[1][2]='#REF!';assert.throws(()=>f.c.previewOtherRegistryForm_(f.npc,'npc'),/NPC.*Faceclaim/);
});
test('single-sheet NPC commit has a durable receipt and cannot double write after lost response',()=>{
  const f=fixture(),cache=new Map(),receipts=new Map();let count=0;
  const book={getId:()=> 'copy',getDeveloperMetadata:()=>[...receipts].map(([k,v])=>({getKey:()=>k,getValue:()=>v}))};
  Object.assign(f.c,{adminTestBook_:()=>book,adminTestOwner_:()=> 'owner',inspectCopyStructure_:()=>({}),adminTestLock_:()=>({tryLock:()=>true,releaseLock(){}}),Utilities:{getUuid:()=>crypto.randomUUID()},CacheService:{getUserCache:()=>({put:(k,v)=>cache.set(k,v),get:k=>cache.get(k)})},registrationSnapshot_:()=>f.snapshot,registrationDigest_:v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex'),previewOtherRegistryForm_:(input,action)=>f.c.planOtherRegistryForm_(input,action,f.snapshot,['มนุษย์','แฟรี่'],'2026-11-06'),Sheets:{Spreadsheets:{batchUpdate:({requests})=>{count++;const m=requests.at(-1).createDeveloperMetadata.developerMetadata;receipts.set(m.metadataKey,m.metadataValue);throw new Error('lost response');}}}});
  const p=f.c.prepareRegistrationWriteTest(f.npc,'Admin','npc'),req={requestId:p.requestId,previewToken:p.previewToken};
  assert.throws(()=>f.c.commitRegistrationWriteTest(req),/lost response/);cache.clear();
  const receipt=f.c.commitRegistrationWriteTest(req);assert.equal(receipt.uid,'b');assert.equal(receipt.charId,'');assert.equal(receipt.action,'npc');assert.equal(count,1);
  f.c.Sheets.Spreadsheets.Values={batchGet:(id,options)=>({valueRanges:[{values:[options.valueRenderOption==='FORMULA'?['b','New NPC','New Face','มนุษย์','']:['b','New NPC','New Face','มนุษย์','']]}]})};
  assert.equal(f.c.registrationVerifiedReceipt_(book,receipt).verification.ok,true);
});
