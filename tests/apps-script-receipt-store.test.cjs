const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
function fixture(){
  const state={sheets:[],metadata:[],business:0};
  const context=vm.createContext({});
  for(const name of ['ReceiptStore.gs','RegistrationWriteTest.gs'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../apps-script',name),'utf8'),context);
  const wrap=s=>({getName:()=>s.title,getSheetId:()=>s.id,getMaxColumns:()=>6,getMaxRows:()=>s.maxRows,getLastRow:()=>s.rows.length,getRange:(r,c,h,w)=>({getValues:()=>Array.from({length:h},(_,i)=>Array.from({length:w},(_,j)=>s.rows[r-1+i]?.[c-1+j]??''))})});
  const book={getId:()=> '1jR8P-z62t3I95hNCkBBvzUsSA9kwHsD9w5Lo0jlX2QY',getSheets:()=>state.sheets.map(wrap),getDeveloperMetadata:()=>state.metadata.filter(m=>m.location.spreadsheet).map(m=>({getId:()=>m.metadataId,getKey:()=>m.metadataKey,getValue:()=>m.metadataValue}))};
  let failAfter=false;
  const apply=payload=>{
    const staged=structuredClone(state);
    for(const req of payload.requests){
      if(req.addSheet){const p=req.addSheet.properties;if(staged.sheets.some(s=>s.id===p.sheetId||s.title===p.title))throw Error('duplicate sheet');staged.sheets.push({id:p.sheetId,title:p.title,hidden:p.hidden,maxRows:p.gridProperties.rowCount,rows:[]});}
      if(req.appendDimension)staged.sheets.find(s=>s.id===req.appendDimension.sheetId).maxRows+=req.appendDimension.length;
      if(req.updateCells){const u=req.updateCells;if(u.start.sheetId===999){staged.business++;continue;}const s=staged.sheets.find(s=>s.id===u.start.sheetId);if(!s)throw Error('unknown sheet');u.rows.forEach((r,i)=>{s.rows[u.start.rowIndex+i]??=[];r.values.forEach((v,j)=>s.rows[u.start.rowIndex+i][u.start.columnIndex+j]=v.userEnteredValue.stringValue);});}
      if(req.createDeveloperMetadata){const m=JSON.parse(JSON.stringify(req.createDeveloperMetadata.developerMetadata));if(staged.metadata.some(x=>x.metadataId===m.metadataId))throw Error('duplicate metadata ID');staged.metadata.push(m);}
      if(req.updateDeveloperMetadata){const u=req.updateDeveloperMetadata,m=staged.metadata.find(m=>m.metadataId===u.dataFilters[0].developerMetadataLookup.metadataId);if(!m)throw Error('unknown metadata');Object.assign(m,JSON.parse(JSON.stringify(u.developerMetadata)));}
    }
    Object.assign(state,staged);if(failAfter){failAfter=false;throw Error('response lost');}
  };
  Object.assign(context,{Sheets:{Spreadsheets:{batchUpdate:apply}},adminTestBook_:()=>book,inspectCopyStructure_:()=>({}),adminTestLock_:()=>({tryLock:()=>true,releaseLock(){}}),SpreadsheetApp:{flush(){}},console:{log(){}}});
  const receipt=(requestId=crypto.randomUUID())=>({requestId,owner:'owner-1',operator:'Admin',action:'main',rows:{Characters:[2,3],'log ลงทะเบียนตัวละคร':[4,5]},expected:[{sheet:'Characters',row:2,fields:{2:'Name',4:'Face'}}],note:'บันทึกแล้ว'});
  return {context,state,book,apply,receipt,lose:()=>failAfter=true};
}
test('hidden ledger stores full receipts with tiny row-scoped markers and reads them without cache',()=>{
  const f=fixture(),r=f.receipt(),requests=f.context.registrationReceiptRequests_(f.book,r);f.apply({requests});
  assert.equal(f.state.sheets[0].hidden,true);const marker=f.state.metadata[0];assert.equal(marker.metadataKey,'r');assert.equal(marker.metadataValue,undefined);assert.equal(marker.location.dimensionRange.startIndex,1);
  assert.equal(JSON.stringify(f.context.findRegistrationReceipt_(f.book,r.requestId)),JSON.stringify(r));
  assert.equal(f.state.metadata.reduce((n,m)=>n+m.metadataKey.length+(m.metadataValue||'').length,0),1);
});
test('marker collision fails the entire business/receipt batch; retry after lost response returns original receipt',()=>{
  const f=fixture(),r=f.receipt('12345678-0000-4000-8000-000000000001');f.lose();
  assert.throws(()=>f.apply({requests:[{updateCells:{start:{sheetId:999},rows:[]}},...f.context.registrationReceiptRequests_(f.book,r)]}),/response lost/);assert.equal(f.state.business,1);
  assert.equal(f.context.findRegistrationReceipt_(f.book,r.requestId).requestId,r.requestId);
  const collision=f.receipt('12345678-0000-4000-8000-000000000002');assert.throws(()=>f.apply({requests:[{updateCells:{start:{sheetId:999},rows:[]}},...f.context.registrationReceiptRequests_(f.book,collision)]}),/duplicate metadata ID/);
  assert.equal(f.state.business,1);assert.equal(f.state.sheets[0].rows.length,2);assert.equal(f.context.findRegistrationReceipt_(f.book,collision.requestId),null);
});
test('legacy migration preserves exact receipts, metadata IDs and owner checks without business writes or deletions',()=>{
  const f=fixture(),receipts=[f.receipt(),f.receipt()];receipts[0].note='🙂'.repeat(25000);
  f.state.metadata=receipts.map((r,i)=>({metadataId:i+1,metadataKey:'rpth_reg_'+r.requestId,metadataValue:JSON.stringify(r),visibility:'DOCUMENT',location:{spreadsheet:true}}));
  f.context.migrateRegistrationReceiptsInCopy();assert.equal(f.state.business,0);assert.equal(f.state.metadata.length,2);assert.deepEqual(f.state.metadata.map(m=>m.metadataId),[1,2]);assert.ok(f.state.metadata.every(m=>m.metadataKey==='r'&&m.metadataValue===''));
  for(const r of receipts)assert.equal(JSON.stringify(f.context.findRegistrationReceipt_(f.book,r.requestId)),JSON.stringify(r));
  f.context.adminTestOwner_=()=> 'other-owner';assert.throws(()=>f.context.commitRegistrationWriteTest({requestId:receipts[0].requestId,previewToken:crypto.randomUUID()}),/ผู้ใช้อื่น/);
  const before=JSON.stringify(f.state);f.context.migrateRegistrationReceiptsInCopy();assert.equal(JSON.stringify(f.state),before);
});
test('ledger shards before row 10001, preserving bounded per-sheet metadata and existing rows',()=>{
  const f=fixture(),r=f.receipt();f.apply({requests:f.context.registrationReceiptRequests_(f.book,r)});
  f.state.sheets[0].rows.length=10000;const next=f.receipt();f.apply({requests:f.context.registrationReceiptRequests_(f.book,next)});
  assert.equal(f.state.sheets.length,2);assert.equal(f.state.sheets[1].title,'_RPTH Receipts 0002');assert.equal(f.state.sheets[1].rows.length,2);assert.equal(f.context.findRegistrationReceipt_(f.book,next.requestId).requestId,next.requestId);
});
test('ledger rejects malformed schema, duplicate UUIDs and mismatched owner payloads',()=>{
  const f=fixture(),r=f.receipt();f.apply({requests:f.context.registrationReceiptRequests_(f.book,r)});
  const row=f.state.sheets[0].rows[1];row[1]='wrong';assert.throws(()=>f.context.findRegistrationReceipt_(f.book,r.requestId),/เจ้าของ/);row[1]=r.owner;
  f.state.sheets[0].rows.push(row.slice());assert.throws(()=>f.context.findRegistrationReceipt_(f.book,r.requestId),/ซ้ำ/);f.state.sheets[0].rows.pop();
  f.state.sheets[0].rows[0][0]='Changed';assert.throws(()=>f.context.registrationReceiptRequests_(f.book,f.receipt()),/โครงสร้าง/);
});
test('shared commit retries a ledger receipt after response loss and cache eviction, without repeating business writes',()=>{
  const f=fixture(),cache=new Map();let owner='owner-1';
  const plan=()=>({action:'main',uid:'42',charId:'C-42-01',errors:[],warnings:[],changes:[{sheet:'Characters',fields:{UserID:'42'}}]});
  Object.assign(f.context,{
    adminTestOwner_:()=>owner,Utilities:{getUuid:()=>crypto.randomUUID()},
    CacheService:{getUserCache:()=>({put:(k,v)=>cache.set(k,v),get:k=>cache.get(k)})},
    previewRegistryAction_:plan,registrationSnapshot_:()=>[],registrationDigest_:s=>JSON.stringify(s),
    buildRegistrationBatch_:()=>({requests:[{updateCells:{start:{sheetId:999},rows:[]}}],rows:{Characters:[2]},expected:[]}),
    registrationVerifiedReceipt_:(_book,r)=>r
  });
  const prepared=f.context.prepareRegistrationWriteTest({},'Admin','main'),req={requestId:prepared.requestId,previewToken:prepared.previewToken};f.lose();
  assert.throws(()=>f.context.commitRegistrationWriteTest(req),/response lost/);cache.clear();assert.equal(f.state.business,1);
  assert.equal(f.context.commitRegistrationWriteTest(req).requestId,prepared.requestId);assert.equal(f.state.business,1);assert.equal(f.state.metadata.length,1);
  owner='someone-else';assert.throws(()=>f.context.commitRegistrationWriteTest(req),/ผู้ใช้อื่น/);
});
