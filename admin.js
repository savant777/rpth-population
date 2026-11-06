(async function() {
  "use strict";
  await window.AdminAccess.ready;
  const M=window.AdminModel;
  // Optional local-only fixture. The deployed UI must not depend on a sample file.
  const live=window.AdminAccess.live;
  if(!live&&["localhost","127.0.0.1","[::1]"].includes(location.hostname)){
    try{await import("./admin-sample-data.js");}catch{/* No local sample: show the UI without registry records. */}
  }
  const data=(live?window.AdminAccess.bootstrap:window.AdminSampleData)||{players:[],userIds:[],npcs:[],staffFaces:[],locks:[]};
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const icon=name=>`<span class="material-symbols-rounded" aria-hidden="true">${name}</span>`;
  const actionIcons={register:"person_add",edit:"edit",sub:"group_add",switch:"swap_horiz",main:"manage_accounts",race:"diversity_3",reclaim:"restore",npc:"smart_toy",lock:"lock",inactive:"person_off"};
  const today=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Bangkok",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const storage={get(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}},set(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}};
  let action="register",pending=null,history=storage.get("rpth-admin-demo-history",[]),toastTimer;
  function values(){const result=Object.fromEntries(new FormData($("adminForm")));$("adminForm").querySelectorAll('input[type="checkbox"]').forEach(el=>result[el.name]=el.checked);$("adminForm").querySelectorAll('[data-date-display]').forEach(el=>{if(!el.disabled)result[el.name]=M.parseInputDate(el.value)||el.value.trim();});return result;}
  const field=(name,label,opts={})=>{
    const labelText=`${label}${opts.required?'<b class="required">*</b>':'<em class="optional">ไม่บังคับ</em>'}`;
    if(opts.type==="date")return `<div class="field ${opts.wide?"wide":""}"><label for="${name}">${labelText}</label><span class="date-control"><input type="text" name="${name}" id="${name}" data-date-display placeholder="dd/MM/yyyy" maxlength="10" value="${esc(M.displayDate(opts.value||"")==="—"?"":M.displayDate(opts.value))}" ${opts.required?"required":""} aria-describedby="${name}-format" autocomplete="off"><input type="date" id="${name}-picker" class="native-date-picker" tabindex="-1" aria-hidden="true" value="${esc(opts.value||"")}"><button type="button" class="date-picker-button" data-date-target="${name}" aria-label="เลือก${label}จากปฏิทิน">${icon("calendar_today")}</button></span><small id="${name}-format">วัน/เดือน/ปี ค.ศ. · เช่น 05/11/2026</small></div>`;
    return `<label class="field ${opts.wide?"wide":""}"><span>${labelText}</span>${opts.html||`<input name="${name}" id="${name}" type="${opts.type||"text"}" ${opts.required?"required":""} ${opts.readonly?"readonly":""} ${opts.min?`min="${opts.min}"`:""} ${opts.step?`step="${opts.step}"`:""} placeholder="${esc(opts.placeholder||"")}" value="${esc(opts.value||"")}" ${opts.list?`list="${opts.list}"`:""}>`}${opts.help?`<small>${opts.help}</small>`:""}</label>`;
  };
  const select=(name,label,options,opts={})=>field(name,label,{...opts,html:`<span class="select-control"><select id="${name}" name="${name}" ${opts.required?"required":""}>${options.map(([v,t])=>`<option value="${esc(v)}">${esc(t)}</option>`).join("")}</select><span class="material-symbols-rounded select-arrow" aria-hidden="true">keyboard_arrow_down</span></span>`});
  const choice=(name,label,checked=false)=>`<label class="choice"><input type="checkbox" name="${name}" id="${name}" ${checked?"checked":""}>${label}</label>`;
  const section=(n,title,body)=>`<section class="field-section"><h3><span class="section-number">${String(n).padStart(2,"0")}</span>${title}</h3><div class="field-grid">${body}</div></section>`;
  const note=(s,warning=false)=>`<p class="inline-note ${warning?"warning":""} wide">${s}</p>`;
  const raceField=()=>select("race","เผ่าพันธุ์",[["","เลือกเผ่าพันธุ์"],...M.races.map(r=>[r,r])],{required:true});
  const personField=()=>field("account","ค้นหาผู้เล่น / UID",{required:true,wide:true,list:"accountOptions",placeholder:"พิมพ์ UID หรือชื่อตัวละครหลัก",help:data.players.length?`บัญชีตัวอย่างจากทะเบียนล่าสุด ${data.players.length} บัญชี`:"ยังไม่มีข้อมูลบัญชี · รอเชื่อม Apps Script"})+`<datalist id="accountOptions">${data.players.map(p=>`<option value="${esc(p.uid+" · "+p.mainName)}"></option>`).join("")}</datalist><input type="hidden" name="uid" id="uid">`;
  const charSelect=()=>select("charId","ตัวละคร / สลอต",[["","เลือกบัญชีก่อน"]],{required:true,wide:true});
  const newFields=(url=true)=>field("name",action==="npc"?"ชื่อ NPC":"ชื่อตัวละคร",{required:true,placeholder:"เช่น Evelyn R. Ashford"})+field("faceclaim","เฟซเคลม",{required:true,placeholder:"ชื่อบุคคล / ชื่อวง (ถ้ามี)"})+(url?field("url","ลิงก์ประวัติตัวละคร",{required:true,wide:true,type:"url",placeholder:"https://roleplayth.com/showthread.php?..."}):"");
  function renderNav(){
    const groups=[...new Set(M.actions.map(a=>a.group))];
    $("actionSelect").innerHTML=groups.map(group=>`<optgroup label="${group}">${M.actions.filter(a=>a.group===group&&(!live||data.supportedActions.includes(a.id))).map(a=>`<option value="${a.id}" ${a.id===action?"selected":""}>${a.title}</option>`).join("")}</optgroup>`).join("");
  }
  function renderForm(next) {
    action=next;pending=null;renderNav();setStep(1);
    const config=M.actions.find(a=>a.id===action);
    $("formGroup").textContent=config.group;$("formTitle").textContent=config.title;$("formDescription").textContent=config.description;$("formSymbol").textContent=actionIcons[action];
    const meta=section(1,action==="inactive"?"วันที่ปรับสถานะ":"ข้อมูลอ้างอิง",(action!=="npc"&&action!=="inactive"?field("post","เลขโพสต์",{required:true,placeholder:"เช่น 1120"}):"")+field("date",action==="lock"?"วันที่อนุมัติ":action==="inactive"?"วันที่ปรับ Inactive":action==="npc"?"วันที่บันทึกทดลอง":"วันที่ลงฟอร์ม",{type:"date",required:true,value:today()}));
    let body="";
    if(action==="register") body=section(2,"ข้อมูลผู้เล่นและตัวละครหลัก",field("uid","UID ผู้สมัคร",{required:true,placeholder:"UID จากบัญชีที่ลงฟอร์ม",help:"ตรวจไม่ให้ซ้ำกับผู้ใช้เดิม"})+raceField()+newFields()+note("MAIN · ใช้งานทันที · Post Check และ Activity Check จะถูกติ๊กให้ · งดตรวจ 3 เดือนตามสูตร"));
    else if(action==="npc") body=section(2,"ข้อมูล NPC",select("hasAccount","มีบัญชีบนเว็บไซต์หรือไม่",[["no","ไม่มีบัญชี · ใช้รหัสตัวอักษรอัตโนมัติ"],["yes","มีบัญชี · ระบุ UID"]],{required:true,wide:true})+`<div id="npcUidField" class="wide" hidden>${field("uid","UID ของ NPC",{placeholder:"เช่น 219"})}</div>`+newFields(false)+raceField()+field("url","ลิงก์ประวัติ",{type:"url",placeholder:"เว้นว่างได้"})+note("เพิ่มเฉพาะชีต NPC · ไม่สร้าง Users, Characters หรือ log"));
    else if(action==="inactive") body=section(2,"รายชื่อที่ตรวจสอบเรียบร้อยแล้ว",field("names","รายชื่อหรือ UID",{required:true,wide:true,html:'<textarea name="names" id="names" rows="7" placeholder="หนึ่งคนต่อบรรทัด เช่น&#10;503&#10;637&#10;หรือวางตารางจากสคริปต์ตรวจโพสต์"></textarea>',help:"รองรับหนึ่งคนต่อบรรทัด หรือวางผล TSV จากสคริปต์ โดยอ่าน UID คอลัมน์แรก"})+`<div class="wide"><button type="button" class="secondary" id="sampleNames">ใส่รายชื่อตัวอย่าง</button></div>`+note("ใช้รายชื่อที่สรุปผลแล้ว ไม่ต้องตรวจโพสต์หรือกิจกรรมซ้ำในหน้านี้ · ชื่อที่ไม่พบหรือกำกวมต้องแก้ก่อนยืนยัน"));
    else {
      body=section(2,"บัญชีและตัวละคร",personField()+(["edit","switch","race","reclaim","lock"].includes(action)?charSelect():"")+ '<div id="accountContext" class="inline-account wide" hidden><div class="context-heading"><h3>ข้อมูลตัวละครปัจจุบัน</h3><span class="small-pill">ข้อมูลตัวอย่าง</span></div><div id="contextContent"></div></div>');
      if(action==="edit") body+=section(3,"ข้อมูลที่ต้องการเปลี่ยน",field("name","ชื่อตัวละครใหม่",{placeholder:"เว้นว่างเพื่อใช้ชื่อเดิม"})+field("faceclaim","เฟซเคลมใหม่",{placeholder:"เว้นว่างเพื่อใช้เฟซเคลมเดิม"})+note("From / To เป็นสลอตเดียวกัน · คง CharID · ไม่เปลี่ยนลิงก์ประวัติ"));
      if(action==="sub") body+=section(3,"ตัวละครรองใหม่",newFields()+`<div class="wide">${choice("extra","มีสิทธิ์เพิ่มตัวรองเกินโควตาปกติ")}</div>`+note("สลับจากตัวที่ใช้อยู่ไปตัวใหม่ทันที · ระบบจะแสดงรายการพักนับ / นับต่อของสิทธิ์ล็อกในหน้าสรุป"));
      if(action==="switch") body+=section(3,"เฟซเคลมที่จะใช้งาน",field("faceclaim","เฟซเคลมของตัวปลายทาง",{required:true,wide:true,placeholder:"ระบุเฟซเคลมที่จะใช้งาน"})+note("ตัวปลายทางต้องมีอยู่แล้ว · เฟซเคลมต้นทางจะถูกล้างเฉพาะเมื่อไม่มีสิทธิ์ล็อก · ไม่เปลี่ยนลิงก์ประวัติ"));
      if(action==="main") body+=section(3,"ตัวละครหลักใหม่",select("mainMode","รูปแบบการเปลี่ยน",[["new","สร้างตัวละครหลักใหม่"],["promote","เลื่อนตัวรองที่กำลังใช้อยู่เป็นตัวหลัก"]],{required:true,wide:true})+`<div id="newMainFields" class="field-grid wide">${newFields()}</div><div class="wide">${choice("keepMain","เก็บตัวละครหลักเดิมเป็นตัวรอง",true)}</div><div id="mainOptions" class="field-grid wide"><div class="wide">${choice("extra","มีสิทธิ์เพิ่มตัวรองเกินโควตาปกติ")}</div>${select("replaceId","ตัวรองที่จะถูกแทนที่เมื่อโควตาเต็ม",[["","ไม่แทนที่ · ใช้สลอตว่างก่อน"]],{wide:true})}</div>`+note("ตัวละครใหม่จะได้ CharID ใหม่ · ตัวที่นำออกเก็บ Slot เป็น - · ค่าธรรมเนียมคำนวณจาก log ตามเดิม"));
      if(action==="race") body+=section(3,"เผ่าพันธุ์ใหม่",raceField()+note("เปลี่ยนเฉพาะ Race ใน Player และเพิ่ม log พร้อมเผ่าพันธุ์เก่า → ใหม่ · ไม่เปลี่ยนตัวที่ใช้งาน"));
      if(action==="reclaim") body+=section(3,"ผลการยื่นเฟซเคลมหลุด",select("result","ผลพิจารณา",[["approved","ผ่าน"],["rejected","ไม่ผ่าน · บันทึกเฉพาะ log"]],{required:true})+field("oldFace","เฟซเคลมเก่า",{required:true,placeholder:"เมจเดิมก่อนถูกถอน"})+field("name","ชื่อใหม่",{placeholder:"เว้นว่างเพื่อใช้ชื่อเดิม"})+field("faceclaim","เฟซเคลมใหม่",{placeholder:"เว้นว่างเพื่อใช้เมจเดิม"})+`<div id="approvalFields" class="field-grid wide">${field("approvedDate","วันที่อนุมัติผ่าน",{type:"date",required:true,value:today()})+field("postUrl","ลิงก์โพสต์ที่ยื่น",{type:"url",placeholder:"ใช้เป็น Note ใน log Admin"})}</div>`+note("log ลงทะเบียนใช้วันที่ลงฟอร์ม · log Admin ใช้วันที่อนุมัติผ่าน · ไม่ใช้ลิงก์ประวัติตัวละคร"));
      if(action==="lock") body+=section(3,"สิทธิ์คุ้มครอง",select("lockMode","ประเภทรายการ",[["start","เริ่มล็อกใหม่"],["renew","ต่ออายุสิทธิ์เดิม"]],{required:true,wide:true})+`<div id="lockFaceField" class="wide">${field("faceclaim","เฟซเคลมที่ต้องการล็อก",{required:true,placeholder:"เฟซเคลมของตัวละครนี้"})}</div><div id="existingLockField" class="wide" hidden>${select("lockId","สิทธิ์เดิม",[["","เลือกตัวละครก่อน"]],{wide:true})}</div>`+select("payment","รูปแบบชำระที่ตรวจแล้ว",[["monthly","รายเดือน · 3,000 ต่อเดือน"],["year","เหมาจ่าย · 30,000 / 12 เดือน"]],{required:true})+`<div id="monthField">${field("months","จำนวนเดือน",{type:"number",required:true,value:"1",min:"1",step:"1"})}</div>`+note("ไม่เกิน 2 สิทธิ์ รวมรายการพักนับ · สิทธิ์ผูกกับ CharID · ไม่มีการรับเงินในหน้านี้"));
    }
    if(!["inactive"].includes(action)) body+=section(action==="register"||action==="npc"?3:4,"หมายเหตุ",field("note","หมายเหตุเพิ่มเติม",{wide:true,html:'<textarea name="note" id="note" rows="2" placeholder="ระบุรายละเอียดเพิ่มเติม ถ้ามี"></textarea>'}));
    $("formFields").innerHTML=meta+body;
    $("formErrors").hidden=true;
    restoreDraft();updateDynamic();renderContext();
  }
  function selectedPlayer(){return data.players.find(p=>p.uid===$("uid")?.value);}
  function setOptions(el,options){if(!el)return;const previous=el.value;el.innerHTML=options.map(([v,t])=>`<option value="${esc(v)}">${esc(t)}</option>`).join("");if(options.some(([v])=>v===previous))el.value=previous;}
  function updateAccount(){
    const value=$("account")?.value.trim()||"";
    const previousUid=$("uid")?.value;
    const matches=data.players.filter(p=>value===p.uid || value===`${p.uid} · ${p.mainName}` || value.toLowerCase()===p.mainName.toLowerCase());
    if($("account"))$("uid").value=matches.length===1?matches[0].uid:"";
    if(previousUid!==$("uid")?.value){
      if(["switch","lock"].includes(action)&&$("faceclaim"))$("faceclaim").value="";
      if(action==="reclaim"&&$("oldFace"))$("oldFace").value="";
    }
    const p=selectedPlayer(),chars=M.validChars(p),current=M.activeChar(p);
    const list=action==="switch"?chars.filter(c=>c.id!==current?.id):chars;
    setOptions($("charId"),[["","เลือกตัวละคร"],...list.map(c=>[c.id,`${c.name} · ${c.slot}`])]);
    if($("charId")&&!$("charId").value && action!=="switch" && current)$("charId").value=current.id;
    setOptions($("replaceId"),[["","ไม่แทนที่ · ใช้สลอตว่างก่อน"],...chars.filter(c=>c.slot!=="MAIN").map(c=>[c.id,`${c.name} · ${c.slot}`])]);
    if(action==="reclaim" && current && !$("oldFace").value)$("oldFace").value=current.faceclaim;
    updateLocks();renderContext();
  }
  function updateLocks(){const p=selectedPlayer();setOptions($("lockId"),[["","เลือกสิทธิ์ล็อก"],...M.currentLocks(data,p?.uid).filter(l=>l.charId===$("charId")?.value).map(l=>[l.id,`${l.faceclaim} · ${l.status} · ${l.id}`])]);}
  function updateDynamic(){
    if($("npcUidField"))$("npcUidField").hidden=$("hasAccount").value!=="yes";
    if($("newMainFields"))$("newMainFields").hidden=$("mainMode").value==="promote";
    if($("mainOptions"))$("mainOptions").hidden=!$("keepMain").checked;
    if($("approvalFields"))$("approvalFields").hidden=$("result").value==="rejected";
    if($("lockFaceField")){$("lockFaceField").hidden=$("lockMode").value==="renew";$("existingLockField").hidden=$("lockMode").value!=="renew";$("monthField").hidden=$("payment").value==="year";}
    document.querySelectorAll("#formFields input,#formFields select,#formFields textarea").forEach(el=>{if(el.closest("[hidden]"))el.disabled=true;else el.disabled=false;});
  }
  function renderContext(){
    if(!$("contextContent"))return;
    const p=selectedPlayer();
    $("accountContext").hidden=!p;
    const profile=p?`<div class="person-header"><span class="person-avatar">${icon("account_circle")}</span><div><strong>${esc(p.mainName)}</strong><small>UID ${esc(p.uid)} · ${p.status?"Active":"Inactive"}</small></div></div><div class="context-divider"></div><div class="context-label">ตัวละครในบัญชี</div><div class="roster-grid">${M.validChars(p).map(c=>`<article class="roster-item"><div class="roster-top"><span class="slot">${esc(c.slot)}</span>${c.active?`<span class="active-indicator">${icon("check_circle")}กำลังใช้</span>`:""}</div><strong class="roster-name">${esc(c.name)}</strong><div class="roster-face">${icon("face")}<span>${esc(c.faceclaim||"ยังไม่มีเฟซเคลม")}</span></div><div class="roster-id">${icon("badge")}<span>${esc(c.id)}</span></div><div class="roster-locks">${M.currentLocks(data,p.uid).filter(l=>l.charId===c.id).map(l=>`<div class="lock-info">${icon(l.status==="พักนับ"?"pause_circle":"lock")}<span>${esc(l.faceclaim)} · ${esc(l.status)}</span></div>`).join("")}</div></article>`).join("")}</div>`:"";
    $("contextContent").innerHTML=profile+`<p class="snapshot-note">ข้อมูลตัวอย่าง ณ ${esc(M.displayDate(data.snapshotDate))} · ไม่ใช่ข้อมูลสด</p>`;
  }
  function saveDraft(){storage.set(`rpth-admin-draft-${action}`,values());$("draftStatus").textContent="เก็บแบบร่างในเบราว์เซอร์นี้แล้ว · ยังไม่ได้บันทึกลงทะเบียน";}
  function restoreDraft(){
    const draft=storage.get(`rpth-admin-draft-${action}`,null);if(!draft)return;
    for(const [key,value]of Object.entries(draft)){
      const el=$("adminForm").elements.namedItem(key);
      if(!el||["charId","lockId","replaceId"].includes(key))continue;
      if(el.type==="checkbox")el.checked=value;
      else if(el.hasAttribute("data-date-display")){
        el.value=M.isISODate(value)?M.displayDate(value):value;
        $(`${key}-picker`).value=M.parseInputDate(el.value);
      }else el.value=value;
    }
    if($("account"))updateAccount();for(const key of ["charId","lockId","replaceId"]){const el=$(key);if(el&&draft[key])el.value=draft[key];}updateLocks();if($("lockId")&&draft.lockId)$("lockId").value=draft.lockId;$("draftStatus").textContent="กู้คืนแบบร่างในเบราว์เซอร์นี้แล้ว";
  }
  function setStep(step){["stepForm","stepReview","stepDone"].forEach((id,i)=>$(id).classList.toggle("current",i===step-1));}
  function showErrors(errors){$("formErrors").classList.remove("success");$("formErrors").innerHTML=`<ul>${errors.map(s=>`<li>${esc(s)}</li>`).join("")}</ul>`;$("formErrors").hidden=false;$("formErrors").scrollIntoView({behavior:"smooth",block:"center"});}
  function showReview(plan,f){
    if(live){
      $("reviewContent").innerHTML=`<p class="review-meta">${esc(M.actions.find(item=>item.id===action).title)} · วันที่ ${esc(M.displayDate(f.date))} · บัญชี ${esc(plan.operator)}<br>ยืนยันแล้วจะบันทึกข้อมูลลงชีตสำเนาทดสอบ</p>${plan.warnings.map(w=>`<p class="review-warning">${esc(w)}</p>`).join("")}${plan.changes.map(change=>`<section class="review-sheet"><h3>${esc(change.sheet)}${change.row?` · แก้ไขแถว ${esc(change.row)}`:" · เพิ่มแถวใหม่"}</h3><div class="change-item"><dl>${Object.entries(change.fields).map(([key,value])=>`<dt>${esc(key)}</dt><dd>${esc(value===""?"(ว่าง)":value)}</dd>`).join("")}</dl>${change.formulas?`<p>ใช้สูตรเดิม: ${change.formulas.map(esc).join(", ")}</p>`:""}</div></section>`).join("")}`;
      pending={action,values:f,plan};setStep(2);$("reviewDialog").showModal();return;
    }
    const config=M.actions.find(a=>a.id===action),sheets=[...new Set(plan.patches.map(p=>p.sheet))];
    $("reviewContent").innerHTML=`<p class="review-meta"><strong>${esc(config.title)}</strong><br>วันที่มีผล ${esc(M.displayDate(f.date))}${f.post?` · โพสต์ #${esc(f.post)}`:""}<br>${plan.patches.length} รายการ ใน ${sheets.length} ชีต · เป็นการทดลองเท่านั้น</p>${plan.batch?.length?`<div class="bulk-table-wrap"><table class="bulk-table"><thead><tr><th>รายชื่อที่วาง</th><th>UID</th><th>ผลจับคู่</th></tr></thead><tbody>${plan.batch.map(r=>`<tr><td>${esc(r.input)}</td><td>${esc(r.player?.uid||"—")}</td><td class="${r.status!=="พร้อมปรับ"?"bad":""}">${esc(r.status)}</td></tr>`).join("")}</tbody></table></div>`:""}${plan.warnings.map(w=>`<p class="review-warning">${esc(w)}</p>`).join("")}${sheets.map(sheet=>`<section class="review-sheet"><h3>${esc(sheet)}<small>${plan.patches.filter(p=>p.sheet===sheet).length} รายการ</small></h3>${plan.patches.filter(p=>p.sheet===sheet).map(p=>`<div class="change-item"><strong>${esc(p.label)}</strong><dl>${Object.entries(p.fields).map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v===true?"TRUE":v===false?"FALSE":v===""?"(ว่าง)":v)}</dd>`).join("")}</dl></div>`).join("")}</section>`).join("")}<p class="inline-note">ยืนยันเพื่อทดลองขั้นตอนเท่านั้น ยังไม่มีการส่งข้อมูลไป Apps Script หรือเปลี่ยนทะเบียนจริง</p>`;
    pending={action,values:f,plan};setStep(2);$("reviewDialog").showModal();
  }
  function showToast(message){clearTimeout(toastTimer);$("toast").textContent=message;$("toast").hidden=false;toastTimer=setTimeout(()=>$("toast").hidden=true,6500);}
  function renderHistory(){const valid=Array.isArray(history)?history:[];$("historyCount").textContent=valid.length;$("historyContent").innerHTML=valid.length?valid.map(h=>`<article class="history-card"><strong>${esc(M.actions.find(a=>a.id===h.action)?.title||h.action)}</strong><p>${esc(new Date(h.time).toLocaleString("th-TH"))} · ${h.count} รายการ · ${esc(h.who)}</p><span class="small-pill">ทดลองแล้ว · ไม่ได้แก้ชีตจริง</span></article>`).join(""):'<div class="context-empty"><strong>ยังไม่มีประวัติทดลอง</strong><p>กรอกข้อมูลและยืนยันในหน้าสรุปเพื่อทดลองขั้นตอน</p></div>';}
  $("actionSelect").addEventListener("change",event=>{saveDraft();renderForm(event.target.value);});
  $("adminForm").addEventListener("input",event=>{if(event.target.id==="account")updateAccount();updateDynamic();saveDraft();$("formErrors").hidden=true;pending=null;setStep(1);});
  $("adminForm").addEventListener("change",event=>{
    if(event.target.classList.contains("native-date-picker")){
      const display=event.target.closest('.date-control').querySelector('[data-date-display]');
      display.value=event.target.value?M.displayDate(event.target.value):"";
      display.dispatchEvent(new Event("input",{bubbles:true}));
    }
    if(event.target.id==="charId") {updateLocks();const c=M.validChars(selectedPlayer()).find(c=>c.id===$("charId").value);if(c&&["switch","lock"].includes(action)&&$("faceclaim"))$("faceclaim").value=c.faceclaim;if(c&&action==="reclaim")$("oldFace").value=c.faceclaim;}
    updateDynamic();saveDraft();
  });
  $("adminForm").addEventListener("focusout",event=>{
    if(!event.target.hasAttribute("data-date-display"))return;
    const iso=M.parseInputDate(event.target.value);
    if(iso){event.target.value=M.displayDate(iso);$(`${event.target.id}-picker`).value=iso;}
  });
  $("adminForm").addEventListener("click",event=>{
    const calendar=event.target.closest("[data-date-target]");
    if(calendar){const display=$(calendar.dataset.dateTarget),picker=$(`${display.id}-picker`);picker.value=M.parseInputDate(display.value);if(typeof picker.showPicker==="function")picker.showPicker();else display.focus();}
    if(event.target.closest("#sampleNames")){$("names").value=data.players.filter(p=>p.status&&M.activeChar(p)).slice(0,3).map(p=>p.uid).join("\n");saveDraft();}
  });
  $("adminForm").addEventListener("submit",async event=>{
    event.preventDefault();updateDynamic();
    try{await window.AdminAccess.verify();}catch{return;}
    const badDates=[...$("adminForm").querySelectorAll('[data-date-display]')].filter(el=>!el.disabled&&el.value.trim()&&!M.parseInputDate(el.value));
    if(badDates.length){showErrors(["กรุณาระบุวันที่ที่มีอยู่จริงในรูปแบบ วัน/เดือน/ปี ค.ศ. เช่น 05/11/2026"]);return;}
    const f=values();
    if(live){const button=$("adminForm").querySelector('button[type="submit"]');button.disabled=true;try{const plan=await window.AdminAccess.preview(action,f);if(JSON.stringify(values())!==JSON.stringify(f)){showErrors(["ข้อมูลเปลี่ยนระหว่างตรวจ กรุณาตรวจสอบและสรุปใหม่"]);return;}if(plan.errors.length){showErrors(plan.errors);return;}if(!plan.canCommit)throw new Error("ยังไม่พร้อมยืนยันบันทึก");showReview(plan,f);}catch(error){showErrors([error.message]);}finally{button.disabled=false;}return;}
    const plan=M.plan(action,f,data);if(plan.errors.length){showErrors(plan.errors);return;}$("formErrors").hidden=true;showReview(plan,f);
  });
  $("resetButton").addEventListener("click",()=>{storage.set(`rpth-admin-draft-${action}`,null);renderForm(action);$("draftStatus").innerHTML='ช่องที่มี <span>*</span> จำเป็นต้องกรอก';});
  document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>{if(b.dataset.close==="reviewDialog"&&$("confirmButton").disabled)return;$(b.dataset.close).close();}));
  $("reviewDialog").addEventListener("cancel",event=>{if($("confirmButton").disabled)event.preventDefault();});
  $("reviewDialog").addEventListener("close",()=>{if(pending)setStep(1);});
  $("confirmButton").addEventListener("click",async()=>{if(!pending)return;const button=$("confirmButton");button.disabled=true;try{const session=await window.AdminAccess.verify();if(!pending)return;if(live){const receipt=await window.AdminAccess.commit({requestId:pending.plan.requestId,previewToken:pending.plan.previewToken});pending=null;$("reviewDialog").close();setStep(3);$("formErrors").classList.toggle("success",receipt.verification?.ok===true);$("formErrors").innerHTML=`<p>${esc(receipt.note)}</p><pre style="white-space:pre-wrap">${esc(JSON.stringify({requestId:receipt.requestId,rows:receipt.rows,verification:receipt.verification},null,2))}</pre>`;$("formErrors").hidden=false;showToast(receipt.note);try{Object.assign(data,await window.AdminAccess.refresh());}catch{showToast("บันทึกแล้ว แต่โหลดข้อมูลใหม่ไม่ได้ กรุณาโหลดหน้าใหม่ก่อนทำรายการต่อ");}return;}history=Array.isArray(history)?history:[];history.unshift({action,time:new Date().toISOString(),count:pending.plan.patches.length,who:session.operator});history=history.slice(0,50);const saved=storage.set("rpth-admin-demo-history",history);pending=null;$("reviewDialog").close();setStep(3);renderHistory();showToast(saved?"ทดลองยืนยันแล้ว · เก็บเฉพาะประวัติในเครื่องนี้ ทะเบียนจริงไม่เปลี่ยน":"ทดลองยืนยันแล้ว แต่เบราว์เซอร์ไม่อนุญาตให้เก็บประวัติ · ทะเบียนจริงไม่เปลี่ยน");}catch(error){if(live)showToast(`${error.message} · หากการเชื่อมต่อขาด ให้กดยืนยันคำขอเดิมซ้ำ`);else pending=null;}finally{button.disabled=false;}});
  $("historyButton").addEventListener("click",()=>{renderHistory();$("historyDialog").showModal();});
  $("clearHistory").addEventListener("click",()=>{history=[];storage.set("rpth-admin-demo-history",history);renderHistory();});
  if(!data.players.length)$("demoDataStatus").textContent="ยังไม่เชื่อมข้อมูลทะเบียน · ยังตรวจความซ้ำในข้อมูลจริงไม่ได้";
  if(live){$("demoDataStatus").textContent="ข้อมูลสดจากชีตสำเนา · เลือกได้เฉพาะฟอร์มที่ server รองรับ";document.querySelector(".demo-banner strong").textContent="เชื่อมชีตสำเนาทดสอบ · ยืนยันแล้วเขียนข้อมูลในสำเนา";$("confirmButton").textContent="ยืนยันบันทึกลงชีตสำเนา";$("stepDone").lastChild.textContent="บันทึกในสำเนา";$("historyButton").hidden=true;}
  renderForm(action);renderHistory();
})();
