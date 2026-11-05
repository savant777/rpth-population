(function(root) {
  "use strict";
  const actions = [
    {id:"register",group:"ทะเบียนตัวละคร",title:"ลงทะเบียนผู้เล่นใหม่",icon:"+",description:"เพิ่มผู้เล่นและตัวละครหลัก หลังตรวจประวัติเรียบร้อยแล้ว",sheets:["Users","Characters","Player","log ลงทะเบียนตัวละคร"]},
    {id:"edit",group:"ทะเบียนตัวละคร",title:"เปลี่ยนชื่อ / เฟซเคลม",icon:"✎",description:"แก้ข้อมูลตัวละครเดิม โดยคง CharID และสลอตเดิม",sheets:["Characters","Users","Player","log ลงทะเบียนตัวละคร"]},
    {id:"sub",group:"ทะเบียนตัวละคร",title:"ลงทะเบียนตัวละครรอง",icon:"⊕",description:"เพิ่มตัวละครรองใหม่ และสลับไปใช้งานทันที",sheets:["Characters","Player","log ลงทะเบียนตัวละคร"]},
    {id:"switch",group:"ทะเบียนตัวละคร",title:"สลับใช้งานตัวละคร",icon:"⇄",description:"เลือกตัวละครที่มีอยู่แล้วเพื่อสลับใช้งานหลัก–รอง",sheets:["Characters","Player","log ลงทะเบียนตัวละคร"]},
    {id:"main",group:"ทะเบียนตัวละคร",title:"เปลี่ยนตัวละครหลัก",icon:"◇",description:"สร้างตัวหลักใหม่ หรือเลื่อนตัวรองที่กำลังใช้อยู่เป็นตัวหลัก",sheets:["Characters","Users","Player","log ลงทะเบียนตัวละคร"]},
    {id:"race",group:"ทะเบียนตัวละคร",title:"เปลี่ยนเผ่าพันธุ์",icon:"◎",description:"บันทึกการเปลี่ยนเผ่าพันธุ์ที่ได้รับอนุมัติแล้ว",sheets:["Player","log ลงทะเบียนตัวละคร"]},
    {id:"reclaim",group:"ทะเบียนตัวละคร",title:"ยื่นเฟซเคลมหลุด",icon:"↻",description:"บันทึกผลการยื่น พร้อมแยกวันที่ลงฟอร์มและวันที่อนุมัติ",sheets:["Characters","Player","Users","log ลงทะเบียนตัวละคร","log Admin"]},
    {id:"npc",group:"ทะเบียนอื่น ๆ",title:"เพิ่ม NPC",icon:"♧",description:"เพิ่ม NPC ลงทะเบียน โดยไม่เพิ่มผู้เล่นหรือสร้าง log",sheets:["NPC"]},
    {id:"lock",group:"ทะเบียนอื่น ๆ",title:"ล็อก / ต่ออายุเฟซเคลม",icon:"⌑",description:"บันทึกสิทธิ์คุ้มครองจากหลักฐานที่ตรวจสอบแล้ว",sheets:["log เฟซเคลมล็อก"]},
    {id:"inactive",group:"จัดการสถานะ",title:"ปรับ Inactive หลายคน",icon:"⊖",description:"วางรายชื่อที่สรุปแล้ว ตรวจสอบก่อนปรับสถานะพร้อมกัน",sheets:["Player","Characters","log Admin"]}
  ];
  const races = ["มนุษย์","แวมไพร์","มนุษย์หมาป่า","พ่อมดแม่มด","แฟรี่","ชาวเงือก"];
  const clone = v => JSON.parse(JSON.stringify(v));
  const validChars = p => (p?.characters || []).filter(c=>c.slot==="MAIN" || /^SUB \d+$/.test(c.slot));
  const activeChar = p => validChars(p).find(c=>c.active) || validChars(p).find(c=>c.slot===p.activeSlot);
  const currentLocks = (data,uid) => data.locks.filter(l=>l.uid===uid && ["กำลังนับ","พักนับ"].includes(l.status));
  const norm = s => String(s||"").normalize("NFKC").trim().toLowerCase();
  const displayDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s||"") ? s.split("-").reverse().join("/") : s || "—";
  function isISODate(value) {
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value||""))return false;
    const [year,month,day]=value.split("-").map(Number);
    const date=new Date(Date.UTC(year,month-1,day));
    return year>=1000 && date.getUTCFullYear()===year && date.getUTCMonth()===month-1 && date.getUTCDate()===day;
  }
  function parseInputDate(value) {
    const match=String(value||"").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if(!match)return "";
    const iso=`${match[3]}-${match[2].padStart(2,"0")}-${match[1].padStart(2,"0")}`;
    return isISODate(iso)?iso:"";
  }
  function nextCharId(data,uid) {
    const ids = data.players.filter(p=>p.uid===uid).flatMap(p=>p.characters).map(c=>Number(c.id.split("-").at(-1))||0);
    return `C-${uid}-${String(Math.max(0,...ids)+1).padStart(2,"0")}`;
  }
  function nextSlot(p,extra=false) {
    const slots = new Set(validChars(p).map(c=>c.slot));
    for(let i=1;i<=(extra?100:2);i++) if(!slots.has(`SUB ${i}`)) return `SUB ${i}`;
    return "";
  }
  function batchMatch(text,data) {
    const seen = new Set();
    return text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean).map(input=>{
      const value = input.split("\t")[0].trim();
      if(["uid","ชื่อ","userid"].includes(norm(value))) return null;
      const matches=data.players.filter(p=>p.uid===value || norm(p.mainName)===norm(value) || validChars(p).some(c=>norm(c.name)===norm(value)));
      if(!matches.length) return {input,status:"ไม่พบชื่อหรือ UID"};
      if(matches.length>1) return {input,status:"ชื่อซ้ำ กรุณาใช้ UID"};
      const p=matches[0];
      if(seen.has(p.uid)) return {input,player:p,status:"ซ้ำในรายการ"};
      seen.add(p.uid);
      return {input,player:p,status:!p.status?"Inactive อยู่แล้ว":!activeChar(p)?"ไม่พบตัวละครที่ใช้งาน":"พร้อมปรับ"};
    }).filter(Boolean);
  }
  function plan(action,values,data) {
    const f = Object.fromEntries(Object.entries(values).map(([k,v])=>[k,typeof v==="string"?v.trim():v]));
    const patches=[],warnings=[],errors=[];
    const add=(sheet,label,fields)=>patches.push({sheet,label,fields});
    const requireField=(k,label)=>{if(!f[k]) errors.push(`กรุณาระบุ${label}`);};
    requireField("date","วันที่มีผล");
    if(f.date && !isISODate(f.date)) errors.push("วันที่มีผลไม่ถูกต้อง กรุณากรอก วัน/เดือน/ปี เช่น 05/11/2026");
    if(!["npc","inactive"].includes(action)) requireField("post","เลขโพสต์");
    const player=data.players.find(p=>p.uid===f.uid);
    const old=activeChar(player);
    const main=validChars(player).find(c=>c.slot==="MAIN");
    const target=validChars(player).find(c=>c.id===f.charId);
    if(!["register","npc","inactive"].includes(action) && !player) errors.push("กรุณาเลือกบัญชีจากรายชื่อประกอบ");
    if(errors.length) return {patches,warnings,errors};
    const regLog=(type,before,after,from,to,usage,extra={})=>add("log ลงทะเบียนตัวละคร","เพิ่มประวัติ",{
      "logID (#Post)":f.post,UserID:f.uid,Type:type,"Old Name":before?.name||"","New Name":after?.name||"",
      "Old Face Claim":before?.faceclaim||"","New Face Claim":after?.faceclaim||"","From Slot":from,"To Slot":to,
      "Effective Date":f.date,"Affects Usage":usage,"User Status":player?.status===false?"Inactive":"Active",Note:f.note||"",...extra
    });
    const charPatch=(c,fields)=>add("Characters",`${c.name} · ${c.id}`,{CharID:c.id,...fields});
    const renameMain=name=>{add("Users","แก้ชื่อบัญชี",{UserID:f.uid,Username:name});add("Player","แก้ชื่อหลัก",{UserID:f.uid,"Display Name":name});};
    const lockFor=(c,face=c?.faceclaim)=>currentLocks(data,f.uid).find(l=>l.charId===c?.id && norm(l.faceclaim)===norm(face));
    function lockEvent(lock,type) {
      add("log เฟซเคลมล็อก",`${type} · ${lock.faceclaim}`,{EventID:"สร้างเมื่อเชื่อมระบบ",LockID:lock.id,UserID:f.uid,CharID:lock.charId,"Lock Character Name":validChars(player).find(c=>c.id===lock.charId)?.name||"","Lock Face Claim":lock.faceclaim,"logID (#Post)":f.post,Type:type,"Effective Date":f.date});
      if(type!=="พักนับ") warnings.push("กลับมานับต่อ: ต้องยืนยันชื่อ Type ที่สูตรชีตรองรับก่อนเชื่อม Apps Script");
    }
    function outgoing(c) {
      if(!c) {errors.push("ไม่พบตัวละครที่กำลังใช้งาน");return;}
      const lock=lockFor(c);
      charPatch(c,{"Is Active Character":false,...(!lock?{"Character Faceclaim":""}:{})});
      if(lock) {warnings.push(`เก็บเฟซเคลม ${c.faceclaim} ของ ${c.name} เพราะยังมีสิทธิ์ล็อก`);if(lock.status==="พักนับ") lockEvent(lock,"กลับมานับต่อ (รอยืนยัน Type)");}
    }
    function incoming(c,face) {
      charPatch(c,{"Is Active Character":true,"Character Faceclaim":face});
      const lock=lockFor(c,face);
      if(lock?.status==="กำลังนับ") lockEvent(lock,"พักนับ");
      add("Player","แก้ตัวละครที่ใช้งาน",{UserID:f.uid,"Active Character":c.slot});
    }
    function newCharacter(slot) {
      requireField("name","ชื่อตัวละคร");requireField("faceclaim","เฟซเคลม");requireField("url","ลิงก์ประวัติตัวละคร");
      if(f.url && !/^https?:\/\//i.test(f.url)) errors.push("ลิงก์ประวัติต้องขึ้นต้นด้วย https:// หรือ http://");
      const c={id:nextCharId(data,f.uid),name:f.name,faceclaim:f.faceclaim,slot};
      add("Characters","เพิ่มตัวละครใหม่",{UserID:f.uid,CharID:c.id,"Character Name":c.name,"Character Slot":slot,"Character Faceclaim":c.faceclaim,"Character Url":f.url,"Is Active Character":true});
      return c;
    }
    const faceConflict=(face,uid)=>{
      if(data.players.some(p=>p.uid!==uid && validChars(p).some(c=>norm(c.faceclaim)===norm(face) && c.faceclaim)) || data.npcs.some(n=>norm(n.faceclaim)===norm(face)) || data.staffFaces.some(s=>norm(s)===norm(face)) || data.locks.some(l=>l.uid!==uid && ["กำลังนับ","พักนับ"].includes(l.status) && norm(l.faceclaim)===norm(face))) errors.push("เฟซเคลมนี้มีผู้ใช้งานหรือผู้คุ้มครองอื่นอยู่ในข้อมูลตัวอย่าง");
    };
    if(action==="register") {
      requireField("uid","UID");requireField("race","เผ่าพันธุ์");
      if(!/^\d+$/.test(f.uid)) errors.push("UID ต้องเป็นตัวเลข");
      if(data.userIds.includes(f.uid)) errors.push("UID นี้มีในทะเบียนแล้ว ให้เลือกฟอร์มของผู้ใช้เดิม");
      const c=newCharacter("MAIN");faceConflict(f.faceclaim,f.uid);
      add("Users","เพิ่มผู้เล่น",{UserID:f.uid,Username:c.name,UserType:"Player",Status:"ตามสูตร"});
      add("Player","เพิ่มทะเบียนผู้เล่น",{UserID:f.uid,"Display Name":c.name,Race:f.race,"Active Character":"MAIN","Post Check":true,"Activity Check":true,"Exempt Note":`สมัคร ${displayDate(f.date)}`,"สูตรวันใช้งาน / ค่าธรรมเนียม":"เติมตามแถวเดิม"});
      regLog("ลงทะเบียนตัวละครใหม่",null,c,"NEW","MAIN",false);
    }
    if(action==="npc") {
      requireField("name","ชื่อ NPC");requireField("faceclaim","เฟซเคลม");requireField("race","เผ่าพันธุ์");
      const allIds=new Set([...data.userIds,...data.npcs.map(n=>n.uid)]);
      let uid=f.uid;
      if(f.hasAccount==="yes") {requireField("uid","UID");if(!/^\d+$/.test(uid)) errors.push("UID ต้องเป็นตัวเลข");}
      else {uid="";for(let i=97;i<=122;i++) if(!allIds.has(String.fromCharCode(i))) {uid=String.fromCharCode(i);break;}if(!uid) errors.push("ใช้รหัส a–z ครบแล้ว ต้องกำหนดวิธีต่อรหัสก่อน");}
      if(data.npcs.some(n=>n.uid===uid || norm(n.name)===norm(f.name))) errors.push("พบ NPC นี้ในทะเบียนแล้ว");
      faceConflict(f.faceclaim,uid);
      if(f.url && !/^https?:\/\//i.test(f.url)) errors.push("ลิงก์ไม่ถูกต้อง");
      add("NPC","เพิ่ม NPC",{UserID:uid,"Display Name":f.name,Faceclaim:f.faceclaim,Race:f.race,Link:f.url||""});
    }
    if(["edit","race","lock"].includes(action) && !target) errors.push("กรุณาเลือกตัวละคร");
    if(action==="edit" && target) {
      if(!f.name && !f.faceclaim) errors.push("กรอกชื่อใหม่หรือเฟซเคลมใหม่อย่างน้อยหนึ่งช่อง");
      const paused=lockFor(target);
      if(f.faceclaim && paused?.status==="พักนับ" && norm(f.faceclaim)!==norm(target.faceclaim)) errors.push("ตัวละครกำลังพักนับสิทธิ์ล็อก ต้องตกลงวิธีจัดการสิทธิ์ก่อนเปลี่ยนเฟซเคลม");
      if(f.faceclaim) faceConflict(f.faceclaim,f.uid);
      charPatch(target,{...(f.name?{"Character Name":f.name}:{}),...(f.faceclaim?{"Character Faceclaim":f.faceclaim}:{})});
      if(f.name && target.slot==="MAIN") renameMain(f.name);
      regLog(f.name&&f.faceclaim?"เปลี่ยนชื่อ+เมจ":f.name?"เปลี่ยนชื่อ":"เปลี่ยนเมจ",target,{name:f.name||"",faceclaim:f.faceclaim||""},target.slot,target.slot,false);
    }
    if(action==="sub") {
      const slot=nextSlot(player,f.extra===true);
      if(!slot) errors.push("ตัวรองครบโควตาแล้ว ต้องมีสิทธิ์เพิ่มตัวรอง");
      const c=newCharacter(slot||"ยังไม่มีสลอต");faceConflict(f.faceclaim,f.uid);outgoing(old);incoming(c,c.faceclaim);
      regLog("ลงทะเบียนตัวละครรอง",old,c,old?.slot,c.slot,true);
    }
    if(action==="switch") {
      if(!target || target.id===old?.id) errors.push("กรุณาเลือกตัวละครปลายทางที่ต่างจากตัวปัจจุบัน");
      requireField("faceclaim","เฟซเคลมที่จะใช้งาน");faceConflict(f.faceclaim,f.uid);
      if(target && target.id!==old?.id) {outgoing(old);incoming(target,f.faceclaim);regLog("สลับตัวหลัก-รอง",old,{...target,faceclaim:f.faceclaim},old?.slot,target.slot,true);}
    }
    if(action==="main") {
      if(!main || !old) errors.push("บัญชีต้องมี MAIN และตัวละครที่ใช้งานอยู่");
      const isNew=f.mainMode!=="promote";
      if(!isNew && old?.slot==="MAIN") errors.push("กำลังใช้ MAIN อยู่ ให้สลับไปใช้ตัวรองที่ต้องการก่อน");
      const promoted=isNew?newCharacter("MAIN"):{...old,slot:"MAIN"};
      if(isNew) faceConflict(f.faceclaim,f.uid);
      if(main && old && (isNew || old.slot!=="MAIN")) {
        const keep=f.keepMain===true;
        let slot=!isNew?old.slot:nextSlot(player,f.extra===true);
        const replacement=validChars(player).find(c=>c.id===f.replaceId && c.slot!=="MAIN" && c.id!==promoted.id);
        if(keep && !slot && !replacement) errors.push("โควตาตัวรองเต็ม เลือกตัวรองที่จะทับ หรือระบุสิทธิ์เพิ่มตัวรอง");
        if(keep && !slot && replacement) {if(lockFor(replacement)) errors.push("ตัวที่จะนำออกยังมีสิทธิ์ล็อก ต้องจัดการก่อน");slot=replacement.slot;charPatch(replacement,{"Character Slot":"-","Is Active Character":false,"Character Faceclaim":""});}
        if(!keep && lockFor(main)) errors.push("ตัวหลักเดิมมีสิทธิ์ล็อก ต้องจัดการก่อนนำออก");
        if(old.id!==promoted.id) outgoing(old);
        charPatch(main,{"Character Slot":keep?slot:"-","Is Active Character":false,...(!lockFor(main)?{"Character Faceclaim":""}:{})});
        if(!isNew) incoming(promoted,promoted.faceclaim);
        charPatch(promoted,{"Character Slot":"MAIN","Is Active Character":true});
        renameMain(promoted.name);add("Player","ใช้งาน MAIN ใหม่",{UserID:f.uid,"Active Character":"MAIN"});
        regLog("เปลี่ยนตัวละครหลัก",old,promoted,isNew&&old.slot==="MAIN"?"NEW":old.slot,"MAIN",old.slot!=="MAIN");
        if(keep) regLog("ย้ายตัวละครหลักเดิมเป็นตัวรอง",{name:main.name,faceclaim:""},{name:main.name,faceclaim:""},"MAIN",slot,false);
        warnings.push("ค่าธรรมเนียมให้สูตร Player คำนวณจาก log ตามเดิม");
      }
    }
    if(action==="race" && target) {
      requireField("race","เผ่าพันธุ์ใหม่");if(f.race===player.race) errors.push("เผ่าพันธุ์ใหม่ตรงกับข้อมูลเดิม");
      add("Player","เปลี่ยนเผ่าพันธุ์",{UserID:f.uid,Race:f.race});regLog("เปลี่ยนเผ่าพันธุ์",target,null,target.slot,target.slot,false,{Note:`${player.race} > ${f.race}`});
    }
    if(action==="reclaim") {
      const c=validChars(player).find(c=>c.id===f.charId) || main;
      if(!c) errors.push("ไม่พบตัวละคร");
      const approved=f.result!=="rejected";
      const after={...c,name:f.name||c?.name,faceclaim:f.faceclaim||f.oldFace||c?.faceclaim};
      requireField("oldFace","เฟซเคลมเก่า");
      regLog(approved?"เฟซเคลมหลุด":"เฟซเคลมหลุด (ไม่สำเร็จ)",{...c,faceclaim:f.oldFace},{name:f.name||"",faceclaim:f.faceclaim||""},c?.slot,c?.slot,false,{"User Status":approved?"Active":"Inactive"});
      if(approved && c) {
        requireField("approvedDate","วันที่อนุมัติ");
        if(f.approvedDate && !isISODate(f.approvedDate)) errors.push("วันที่อนุมัติไม่ถูกต้อง กรุณากรอก วัน/เดือน/ปี");
        if(f.approvedDate && f.approvedDate<f.date) errors.push("วันที่อนุมัติต้องไม่ก่อนวันลงฟอร์ม");
        faceConflict(after.faceclaim,f.uid);charPatch(c,{"Character Name":after.name,"Character Faceclaim":after.faceclaim,"Is Active Character":true});
        if(f.name && c.slot==="MAIN") renameMain(f.name);
        add("Player","ยืนยัน Reclaim",{UserID:f.uid,"Reclaim Approved":true});
        add("log Admin","เพิ่มวันอนุมัติ",{LogID:"สร้างเมื่อเชื่อมระบบ",UserID:f.uid,Type:"ยืนยันเฟซเคลมหลุดผ่าน","Character Name":after.name,"Face Claim":after.faceclaim,"From Slot":c.slot,"To Slot":c.slot,"Effective Date":f.approvedDate,"Affects Usage":true,"User Status":"Active","Count As Main Change":false,"Count As Reclaim":true,Note:`#${f.post}${f.postUrl?` ${f.postUrl}`:""}`});
      }
    }
    if(action==="lock" && target) {
      const renewal=f.lockMode==="renew";
      const existing=currentLocks(data,f.uid).find(l=>l.id===f.lockId && l.charId===target.id);
      const face=renewal?existing?.faceclaim:f.faceclaim;
      if(!face) errors.push("กรุณาระบุเฟซเคลมหรือเลือกสิทธิ์ที่จะต่ออายุ");
      if(renewal && !existing) errors.push("กรุณาเลือกสิทธิ์ล็อกของตัวละครนี้");
      if(!renewal && currentLocks(data,f.uid).length>=2) errors.push("ใช้โควตาล็อกครบ 2 สิทธิ์แล้ว รวมสิทธิ์พักนับ");
      if(!renewal && currentLocks(data,f.uid).some(l=>l.charId===target.id && norm(l.faceclaim)===norm(face))) errors.push("ตัวละครนี้มีสิทธิ์ล็อกเฟซเคลมนี้แล้ว ให้เลือกต่ออายุ");
      if(renewal && existing?.status==="พักนับ") warnings.push("ต่ออายุระหว่างพักนับ: ต้องยืนยันวิธีคำนวณใน Apps Script ก่อนใช้งานจริง");
      const months=f.payment==="year"?12:Number(f.months);
      if(!Number.isInteger(months)||months<1) errors.push("จำนวนเดือนต้องเป็นจำนวนเต็มตั้งแต่ 1 เดือน");
      faceConflict(face,f.uid);
      add("log เฟซเคลมล็อก",renewal?"ต่ออายุสิทธิ์เดิม":"เริ่มสิทธิ์ใหม่",{EventID:"สร้างเมื่อเชื่อมระบบ",LockID:renewal?f.lockId:"สร้างใหม่เมื่อเชื่อมระบบ","logID (#Post)":f.post,CharID:target.id,UserID:f.uid,"Lock Character Name":target.name,"Lock Face Claim":face,Type:renewal?"ต่ออายุ":"เริ่มล็อก","Effective Date":f.date,"Lock Time (Month)":months,Note:f.note||""});
      warnings.push(`หลักฐานชำระที่แอดมินตรวจแล้ว: ${Number(f.payment==="year"?30000:months*3000).toLocaleString("en-US")} · ไม่ใช่การหักเงินจริง`);
      if(!renewal && target.active && norm(face)===norm(target.faceclaim)) warnings.push("ล็อกเฟซเคลมที่กำลังใช้: ต้องยืนยันขั้นเริ่มล็อกและพักนับในวันเดียวกันก่อนเชื่อมระบบ");
    }
    let batch=[];
    if(action==="inactive") {
      requireField("names","รายชื่อ");batch=batchMatch(f.names||"",data);
      if(!batch.some(r=>r.status==="พร้อมปรับ")) errors.push("ยังไม่มีรายชื่อที่พร้อมปรับ");
      if(batch.some(r=>["ไม่พบชื่อหรือ UID","ชื่อซ้ำ กรุณาใช้ UID","ไม่พบตัวละครที่ใช้งาน"].includes(r.status))) errors.push("แก้ไขรายชื่อที่หาไม่พบหรือกำกวมก่อนยืนยัน");
      for(const row of batch.filter(r=>r.status==="พร้อมปรับ")) {
        const p=row.player,c=activeChar(p);
        if(currentLocks(data,p.uid).length) warnings.push(`${p.mainName}: มีสิทธิ์ล็อก ต้องตกลงวิธีจัดการก่อนใช้ระบบจริง`);
        add("Player",`${p.mainName} → Inactive`,{UserID:p.uid,"สถานะที่ต้องการ":"Inactive","Post Check / Activity Check / Reclaim Approved":"รอกำหนดค่าช่องตรวจให้ตรงผลจริงก่อนเชื่อมระบบ"});
        charPatch(c,{"Character Faceclaim":"","Is Active Character":false});
        add("log Admin",`ปรับ inactive · ${p.mainName}`,{LogID:"สร้างเมื่อเชื่อมระบบ",UserID:p.uid,Type:"ปรับ inactive","Character Name":c.name,"Face Claim":c.faceclaim,"From Slot":c.slot,"To Slot":c.slot,"Effective Date":f.date,"Affects Usage":true,"User Status":"Inactive","Count As Main Change":false,"Count As Reclaim":false});
      }
    }
    return {patches,warnings:[...new Set(warnings)],errors:[...new Set(errors)],batch};
  }
  const api={actions,races,validChars,activeChar,currentLocks,nextCharId,nextSlot,batchMatch,plan,displayDate,parseInputDate,isISODate,clone};
  if(typeof module!=="undefined"&&module.exports) module.exports=api;else root.AdminModel=api;
})(typeof globalThis!=="undefined"?globalThis:this);
