const {test} = require('node:test');
const assert = require('node:assert/strict');
const M = require('../admin-model.js');

test('UI and demo edit use one active character consistent with Player slot', () => {
  const p = {uid:'42',mainName:'Main',activeSlot:'MAIN',characters:[
    {id:'C-42-01',name:'Main',slot:'MAIN',active:true},
    {id:'C-42-02',name:'Sub',slot:'SUB 1',active:false}
  ]};
  const data = {players:[p],userIds:['42'],npcs:[],staffFaces:[],locks:[]};
  assert.equal(M.editableChar(p).id,'C-42-01');
  assert.ok(M.plan('edit',{uid:'42',charId:'C-42-02',post:'1',date:'2026-11-06',name:'Changed'},data).errors.some(e=>e.includes('เฉพาะตัวละครที่กำลังใช้งาน')));
  p.characters[0].active=false; p.characters[1].active=true; p.activeSlot='SUB 1';
  assert.equal(M.editableChar(p).id,'C-42-02');
  p.characters[0].active=true;
  assert.equal(M.editableChar(p),undefined);
  p.characters[0].active=false; p.activeSlot='MAIN';
  assert.equal(M.editableChar(p),undefined);
});
