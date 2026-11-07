# ส่งมอบงานให้ Codex อีกเครื่อง

## 8 พฤศจิกายน — กติกาใช้เฟซเคลมเดิม ยืนยันแล้ว

ผู้ดูแลตอบอนุญาต: สลับไปอีกตัว/เพิ่มตัวรอง/สร้าง MAIN ใหม่ ใช้เมจเดียวกับตัวปัจจุบันได้ ถ้าเมจนั้นไม่มีสิทธิ์ล็อกและล้างเมจต้นทางใน atomic batch เดียวกัน แก้ CharacterSwitch.gs ให้ยกเว้น duplicate เฉพาะแถวcurrentที่กำลังclear ไม่ยกเว้นผู้ใช้อื่น/NPC/สิทธิ์ล็อกของตัวอื่น ไม่โอนล็อก Tests87/87 (tracked72+local15) build36functionsผ่าน รวม switch/sub/newMAIN keep/retire และ locked/other-owner/NPC reject

**ยังไม่ deploy กติกานี้:** รอบ8พ.ย.เครื่องมือ CUA เห็นเฉพาะ IAB/MCP Apps ไม่มี Chrome extension จึงยังเข้า AppsScript/Admin ที่ผู้ดูแลloginไว้ไม่ได้ ขอผู้ดูแลเชื่อมChromeแล้ว (คำถามasyncChromeพร้อม) ออนไลน์ยังv12/source855d778 ต้องวางbundleใหม่และอัปเดต deployment URLเดิม ไม่ต้องrestartRenderเพราะแก้gs-only และไม่เปลี่ยนsecret อย่าอ้างว่าเมจเดิมผ่านGoogleออนไลน์แล้ว

## 7 พฤศจิกายน — ฟอร์มเปลี่ยน MAIN ผ่านออนไลน์แล้ว

ขยาย shared CharacterSwitch planner/writer รองรับmainแล้ว local86/86 (tracked71+local15) builder36functionsผ่าน source855d778 pushแล้ว AppsScript v12/Render855d778 Live URLเดิม ผู้ดูแลloginใหม่แล้ว: newMAINได้IDใหม่+URLใหม่, promoteเฉพาะSUBที่activeคงID/URL/เมจ, Users/Playerชื่อMAINsync, logmain NEW→MAIN FALSEเมื่อใช้MAINเดิม/SUB→MAIN TRUEเมื่อใช้SUB, logย้ายMAINเก่าแถวสอง FALSE, keep/retire/replacementเลือกชัดเจนและblockretireตัวมีlock, copylognativeLและคงสูตรfeeเดิม

Native Characters D2ไม่มี'-' จึงwriterเพิ่มตัวเลือกนี้เฉพาะเซลล์Dของแถวretire (strictlistตัวเลือกเดิม+'-') ไม่ขยายdropdownทั้งคอลัมน์; row2templateคงเดิม ไม่แตะsummaryหรือชีตหลัก UIliveไม่มีcheckboxextraที่ไม่มีปลายทาง และhideตัวเลือกreplacementเมื่อpromoteเพราะใช้สลอตที่เพิ่งว่าง

ผ่านออนไลน์แล้ว: สร้างMAINใหม่จากMAINเก็บตัวเดิม (ID04), promote currentSUB2(ID03), สร้างMAINใหม่จากSUBไม่เก็บMAINเดิม (ID05/retire03), สลอตเต็มเลือกแทนที่ตัวไม่มีล็อก (ID06/retire04/oldMAIN05→SUB2), และคืนตัวเดิมID01เป็นMAINซึ่งกำลังพักนับอยู่โดยไม่เพิ่มpause/resumeซ้ำ ทุกใบรับverificationok รายละเอียดrequestIdsในdocs/admin-test-matrix.md; negativepromoteขณะใช้MAIN/ไม่เลือกreplacementเมื่อเต็ม/เลือกตัวมีล็อก ถูกserverปฏิเสธไม่เขียน

NativeInspectorยืนยันfeeครั้งแรก1/0, ครั้งสอง2/5000, หลังreplacement4/5000 และfinal5/5000 ซึ่งเป็นประวัติQAสังเคราะห์เท่านั้น ไม่resetลบlog. สถานะQA99061101สุดท้าย: Users357/Player296ชื่อRPTH QA 20261106 A/MAIN active/raceมนุษย์/checkTRUE TRUE FALSE/exempt06/02/2027/usage2,0; Characters406ID01MAINtruefaceเดิม,407ID02SUB1falseคงlockedface,408ID03'-'falseเมจว่างURLrootเดิม,409ID04'-'falseเมจว่างURL?qa-main=Aเดิม,410ID05SUB2falseเมจว่างURL?qa-main=B,411ID06SUB3falseเมจว่างURL?qa-main=C. D408/D409มี'-'เพิ่มเฉพาะเซลล์ ตัวเลือกเซลล์อื่นคงเดิม. Native/Public locksMAINพัก365วัน Start07/11/2026 PreviousEnd07/11/2027, SUB1นับถึง07/11/2027; event31พักตอนswitchกลับตัวID01และไม่มีeventซ้ำตอนpromote Logทะเบียน1184ท้ายสุด. ล้างdraftmain/switch เปิดmainว่างพร้อมตรวจ รูป/ผลlocal-delivery/main-*. UI backlogเพิ่ม010/011รวม11ข้อ เก็บไว้ท้ายสุด

คำถามเมจเดิมได้รับคำตอบอนุญาตแล้ว ดูหัวข้อ8พ.ย. ไม่ถามซ้ำ งานหลักที่เหลือถัดไปล็อก/ต่ออายุ+editที่มีล็อก, reclaim, inactive ใช้สำเนาเดิมและไม่เดากติกา

## 7 พฤศจิกายน — เพิ่มตัวรอง/สลับใช้งาน พร้อมให้ตรวจบนสำเนา

อ่าน native L:Q ครบแล้วด้วย InspectSwitchCopy.gs ที่เพิ่มเป็นไฟล์ diagnostic แยกใน Apps Script เดิม ไม่แก้ properties/manifest/ชีต รายละเอียด `docs/native-switch-schema.md` และรายงาน local ignored `local-delivery/switch-native-log.txt` พบ Player รองรับ SUB1–3 แต่ Characters ถึง SUB6 จึงใช้ intersection ไม่ขยาย validation เอง; pause ต้อง End > วันพักตาม native Check ไม่เดากติกา zero-day

เพิ่ม CharacterSwitch.gs / CharacterSwitchWrite.gs: sub ใหม่สร้าง CharID ใหม่ไม่ใช้เลข retired, switch ใช้ตัวเดิมคง URL, ตรวจ current flag/Player slot, คงเมจ outgoing เฉพาะล็อกตรง UID+CharID+face, auto เริ่มนับต่อ/พักนับ แสดงใน preview และเขียนพร้อมกันผ่าน shared atomic transaction/receipt/stale guard บันทึก native L:Q และตรวจทุกแถวกลับ ไม่แตะ summary/Public; event append นับ input A:K ไม่ใช่สูตร prefill ห้ามเกิน5000เพราะสูตร pause display; ไม่รับ future switch หรือย้อนหลังข้าม usage/lock event ที่มีแล้ว ไม่เก็บ extra permission แยก

Local tests81/81 (tracked66 + local15) builder36functions จาก8sources ผ่านทั้งชุด Render40b0b0f Live26.4s URLเดิม ผู้ดูแลloginใหม่แล้ว AppsScriptล่าสุดv11 เพิ่มรองรับเมจว่างในlogต่อมาโดยresolveจากเริ่มล็อก และตรวจUID/CharIDคงเดิมข้ามLockIDhistory ผ่านpositivecommitออนไลน์v11แล้ว ไม่ต้องrestartRenderสำหรับgs-only/sessionยังใช้อยู่ ไม่มีsecretใหม่

ออนไลน์ MAIN→SUB1, SUB1→MAINพร้อมresume/pause, สร้างSUB2ใหม่ ID03+URL, SUB2→SUB1ล้างเมจไม่มีล็อก และคืนSUB1→MAINบนv11 สำเร็จทั้งหมด ใบรับreadbackผ่าน log1168–1172 event24–29 รายละเอียดrequestIdsในdocs/admin-test-matrix.md; เมจซ้ำกับล็อกตัวอื่นถูกปฏิเสธก่อนpreview ไม่เขียนแถวจากรายการนั้น

Lock fixtureเฉพาะQA ผ่าน SeedSwitchQaLocks.gs (ไฟล์แยกในeditor ไม่ใช่ flowซื้อ): event21–23 L-99061101-QA01/QA02 CheckOK ห้ามรันseedซ้ำ guardปฏิเสธ ใช้inspectSwitchQaResultsอ่านผลได้ ฟังก์ชันinspectอ่านอย่างเดียวและเลือกเฉพาะUIDQA; หลังเปลี่ยนฟังก์ชันในeditorให้รอstateยืนยันก่อนกดRun (ครั้งหนึ่งUIยังใช้seedเดิม แต่guardปฏิเสธก่อนเขียน)

สถานะสุดท้ายQA99061101: Characters406 MAINactive faceเดิม/407 SUB1inactiveคงเมจเพราะล็อก/408 SUB2inactiveเมจว่าง ID03 URLคงเดิม; Player296/PublicPlayer MAIN Active usage2/0 exempt06/02/2027; FaceclaimLocks12/13และPublicLocks10/11 MAINพัก365วันStart07/11/2026 PreviousEnd07/11/2027, SUB1นับถึง07/11/2027 NativeCheckOKครบ event29ท้ายสุด เก็บQAเป็นหลักฐาน ล้างdraftsub/switchแล้ว หน้าadminเปิดฟอร์มsubว่างให้ผู้ดูแลตรวจ รูป/รายงานlocal-delivery/switch-final-native-results.txt และsub-register-success.jpg

ถัดไปเมื่อผู้ดูแลตรวจสองฟอร์มนี้: ทำเปลี่ยนMAINตามflowเดิม จากนั้นซื้อ/ต่ออายุล็อกและเชื่อมeditเมจเดิมที่ยังblock, reclaim, inactive ห้ามอ้างว่าพร้อมทั้งระบบ RobustnessGoogleจริงบางเคสยังค้างตามmatrix UI9รายการยังเก็บไว้ท้ายสุด อ่าน8sourcesในbuilder ไม่เพิ่มไฟล์sourceซ้ำในeditor (รหัส.gsยังเป็นbundleเดียว)

อัปเดต 6 พฤศจิกายน 2026 (Asia/Bangkok) ผู้ดูแลพักแล้ว ให้ใช้เอกสารนี้ทำงานต่อโดยไม่ต้องให้ผู้ดูแลเล่าประวัติใหม่

## เริ่มที่นี่

### ฟอร์ม NPC / เปลี่ยนเผ่าพันธุ์ — พร้อมส่งตรวจบนสำเนา

เพิ่ม OtherRegistryForms.gs และ shared transaction รองรับ npc/race แล้ว tests71/71 (56 tracked +15 เฉพาะเครื่อง) builder32functions ฟอร์ม NPC ไม่มีบัญชีเลือก a–z ไม่ซ้ำทุกทะเบียน มีบัญชีเก็บ UID จริง เพิ่มเฉพาะNPC; race ยึดตัวที่ใช้อยู่ เปลี่ยนPlayer Race +log Noteเก่า>ใหม่ From=To/AffectsUsageFALSE ไม่ใช้ลิงก์/หมายเหตุเพิ่มเติม จึงซ่อนช่องหมายเหตุที่ไม่มีปลายทางบันทึกในสองฟอร์มนี้ ทดสอบออนไลน์แล้วทั้งNPCรหัสa/UID99061121, UID/ชื่อ/เมจซ้ำ, allocator b previewแล้วcancel, raceไปแฟรี่และกลับมนุษย์, raceซ้ำถูกปฏิเสธ พร้อมตรวจทีละฟอร์มบนสำเนา ยังไม่ประกาศพร้อมทั้งระบบ

รอบนี้ commit61577cb: Render deploy Live สำเร็จ26.8s / AppsScriptเวอร์ชัน9 deployสำเร็จ URLเดิม โค้ดสำรอง local-delivery/Code-before-npc-race.gs ไม่มีการแก้ properties หรือ manifest ผู้ดูแลกำลัง login admin ใหม่หลัง restart ก่อนทดสอบออนไลน์ อ่าน native Public NPC!A1 แล้วใช้ FILTER(NPC!A2:E,NPC!A2:A<>"") มีหัวคอลัมน์5ช่อง ไม่ใช่ QUERY จึงไม่แก้สูตรใด ๆ ยังต้องตรวจแถว QA หลังเพิ่มจริง

ผลออนไลน์เสร็จแล้ว: NPC49(a) /50(99061121), Player296+log1166/1167 ทั้ง4ใบรับตรวจผ่าน อ่านค่าจริงในPublicNPCและPublicPlayerแล้ว ลิงก์ว่าง/ตัวอักษรไม่หาย ไม่เพิ่มUsers/Characters/logจากNPC; raceคงข้อมูลอื่นและคืนQAเป็นมนุษย์แล้ว log1168ว่าง ภาพและrequestIdsในdocs/admin-test-matrix.md UIใหม่แสดงเมนู4ฟอร์มและedit/raceเลือกเฉพาะตัวปัจจุบันได้แล้ว ล้างdraftNPC/raceเพื่อไม่ให้ผู้ดูแลเผลอบันทึกค่าทดสอบเพิ่ม เก็บแถวQAเป็นหลักฐาน จุดUIเพิ่มรวม9รายการไว้แก้ท้ายสุด

**กติกาแก้ไขล่าสุดหลังผู้ดูแลพักแล้วกลับมาทำต่อ:** edit ชื่อ/เมจได้เฉพาะตัวที่กำลังใช้งาน ต้องสลับใช้งานก่อนแก้ตัวอื่น การทดสอบออนไลน์เดิมที่แก้ชื่อตัวรองขณะใช้ MAIN ไม่ใช่เคสที่อนุญาตและไม่ใช่หลักฐานความถูกต้องของกติกาใหม่นี้ ปรับ server ให้ตรวจ active flag หนึ่งตัวและตรง Player active slot, UI จำกัดตัวเลือกและไม่กู้ CharID ตัวอื่นจาก draft, demo model ใช้กติกาเดียวกันแล้ว ต้อง deploy bundle/UI ใหม่ก่อนถือว่าออนไลน์บังคับกติกานี้

แก้กติกานี้ commit/push `1e87576` แล้ว tests65/65 และ build30functions ผ่าน (รวมทดสอบ commit หลังเปลี่ยน active character ซึ่งต้องไม่เขียน) deploy Apps Scriptเวอร์ชัน8 ที่ URLเดิมสำเร็จ สำรองโค้ดก่อนแก้เป็น local-delivery/Code-before-current-character.gs ไม่ต้อง redeploy Render เพราะไม่ได้แก้ Node backend ในรอบนี้ UI GitHub Pages อัปเดตจาก push; รอผลทดสอบออนไลน์ของกติกาใหม่ก่อนถือว่ารอบนี้เสร็จ

ผลออนไลน์หลัง deploy v8: ผู้ดูแล login ใหม่ให้ ใช้หน้าเก่าที่เลือก SUB1 ได้ส่งคำขอเปลี่ยนชื่อและเปลี่ยนเมจของ C-99061101-02 ขณะที่บัญชีใช้ MAIN ทั้งสองถูก server ปฏิเสธ “เฉพาะตัวละครที่กำลังใช้งาน” ตรวจ log1166 ว่างทั้งสองครั้ง ไม่มีการเขียนหรือเปลี่ยน active flags ใด ๆ ในชีต รอบนี้ไม่มี positive commit ใหม่ ไม่อ้างว่าได้ทดสอบกรณีใช้ SUB จริงออนไลน์แล้ว (positive SUB ทดสอบใน local fixture ที่กำหนด active flags/Player slot ตรงกัน) ภาพ local-delivery/current-character-rejected-20261106.jpg ล้างฟอร์มทดสอบแล้ว หน้าเดิมยังโหลด JS เก่า ต้อง refresh/login ครั้งถัดไปจึงเห็นตัวเลือก UI ใหม่; เปิด admin.js ตรงผ่าน browser ถูก client บล็อก จึงไม่อ้างว่าได้ตรวจ UI ใหม่ออนไลน์ครบ เอกสาร/โค้ด/tests ยืนยันข้อจำกัดใหม่แล้ว

### ความคืบหน้าเพิ่มเติม 6 พ.ย. — อ่านก่อนสถานะเดิมด้านล่าง

- ผู้ดูแลขอให้ทำครบทุกฟอร์มเป็นลำดับ ส่งให้ตรวจทีละฟอร์ม และรวบรวม UI ไว้แก้ท้ายสุด แผน/ผลทดสอบอยู่ docs/admin-test-matrix.md และ docs/admin-ui-backlog.md
- เพิ่ม CharacterEdit.gs (server planner + reuse preview/atomic commit/receipt/readback), Node/gateway รองรับ edit, UI แสดงเมนูตาม supportedActions deploy และทดสอบออนไลน์ edit กรณีปกติครบ4แบบแล้ว พร้อมให้ผู้ดูแลตรวจทีละฟอร์ม local tests63/63 รวมไฟล์เก่า untracked15 tests; builder30 functions รายละเอียด requestId/แถวจริงใน docs/admin-test-matrix.md ยังไม่ประกาศว่าครบทั้งระบบ
- register stale preview ผ่านออนไลน์: เปลี่ยนเฉพาะ log!M1161 ของ QA หลังเปิดสรุป B, server ปฏิเสธ ไม่มีแถว1162เพิ่ม คืน Note เดิมและปิดสรุปแล้ว รายละเอียดใน test matrix
- ผู้ดูแลยืนยันกติกาใหม่: Inactive ให้ Post Check/Activity Check/Reclaim Approved FALSE ทั้งหมดและยกเลิกสิทธิ์ล็อกที่เกี่ยวข้อง; ต่อหลังหมดอายุ LockID ใหม่เริ่มวันอนุมัติ; ไม่เก็บ extra-sub permission แยก คุยตกลงก่อนกรอกฟอร์มแล้ว; MAIN ใหม่เก็บลิงก์ใหม่ ตัวเดิมคงลิงก์เดิม; ล็อกเมจที่ใช้อยู่พักนับวันอนุมัติทันที; ตัวพักนับเปลี่ยนเมจให้ยกเลิกสิทธิ์เดิมได้เลย แก้ admin-flow.md แล้ว
- งานค้างของกติกาล็อกคืออ่านชื่อ Type native ที่สูตร/validation รองรับก่อนเขียนเหตุการณ์; edit ของตัวมีล็อกยังถูก block ไว้เพราะโค้ดเหตุการณ์ล็อกยังไม่เสร็จ ไม่ใช่เพราะผู้ดูแลยังไม่ตอบกติกา
- ไฟล์เก่า untracked admin-model.test.cjs / tools/export-admin-sample.py / HTMLไทย ยังไม่รวมเป็นงานรอบนี้
- ชุดนี้ commit/push แล้วที่ `3ada766` สำรอง Code เดิมผ่าน editor เป็น local-delivery/Code-before-edit-20261106.gs แล้ววาง bundle ที่ตรวจเทียบเนื้อหาตรงกันและ deploy Apps Script เวอร์ชัน6 สำเร็จ `/exec` เดิม ภาพ local-delivery/apps-script-deployed-edit-20261106.jpg โปรเจกต์ bound ที่ยืนยันลิงก์ชีตสำเนาแล้ว: https://script.google.com/u/1/home/projects/1pqjTeN1jl3dF8cUqcE8rkSrV4TIus_4UlO1IO3fOfqT9IvKahN-A-i7O/edit ไม่แก้ properties หรือ manifest Render service srv-dbmb2k1srm7s73fjtpug trigger manual deploy3ada766 แล้ว (รอผล Live/ทดสอบออนไลน์ตอนบันทึกบรรทัดนี้)
- ตรวจ native dropdown log เฟซเคลมล็อก!H2 แล้วมี เริ่มล็อก / ต่ออายุ / พักนับ / เริ่มนับต่อ / ยกเลิก และ Faceclaim Locks!F2 ใช้สถานะ ยกเลิก รองรับใน SWITCH; ยังต้องอ่านสูตรคำนวณ log คอลัมน์ L:Q ที่ซ่อนอยู่ก่อนพัฒนา lock transactions ไม่อ้างว่าเห็นสูตรซ่อนครบแล้ว
- สถานะล่าสุด: Render3ada766 deploy Live สำเร็จ24.4s ทดสอบแล้วว่า session เก่าถูกปฏิเสธหลัง restart ผู้ดูแล login ใหม่ให้แล้ว Apps Scriptเวอร์ชัน7ใช้source d990ad2 แก้ prefix headers ของ NPC/locks ที่พบจาก online preview ไม่ต้อง redeployRenderสำหรับการแก้ gs อย่างเดียว (ไม่มี secret ใหม่) ใบรับ edit ทุกกรณี verification.ok=true ไม่มีformulaErrors log1162–1165ครบ,1166ว่างหลังลอง no-op/เมจมีเจ้าของ ตัวรองQA407เป็นfixtureที่เพิ่มโดยตรง ไม่ใช่ผลทดสอบฟอร์มลงทะเบียนตัวรอง

1. `git status --short --branch` ก่อน แล้ว `git pull --ff-only origin main` เมื่อไม่มีการแก้ไขที่ชนกัน ห้าม reset ทับงานของอีกเครื่อง
2. อ่านไฟล์นี้ ตามด้วย `docs/admin-flow.md`, `docs/apps-script-plan.md`, `docs/render-setup.md`
3. รัน `npm test` และ `npm run build:apps-script` ไม่ต้อง `npm install` เพราะไม่มี dependencies เพิ่ม หาก sandbox ห้ามเชื่อม localhost ต้องขอ escalation เพื่อทดสอบ HTTP ไม่ใช่ข้าม tests
4. ยึด Google Sheets เป็นแหล่งข้อมูลหลัก ผู้ดูแลยืนยันว่าต้องการส่งงานต่อได้เวลาลาออก **ไม่ย้ายฐานข้อมูลไป Supabase หรือเปลี่ยน stack เอง**
5. ทำงานในเครื่องและตรวจอัตโนมัติให้ครบก่อนเสนอให้ผู้ดูแลลอง หลีกเลี่ยงให้ผู้ดูแลคัดลอกโค้ด/Deploy/ส่ง error กลับมาทีละรอบแบบที่ผ่านมา

## สิ่งที่ผู้ดูแลต้องการ

- ใช้งานจริงครบ flow ผ่านเว็บ โดยไม่ต้องเปิดชีตแก้เอง แต่ต้องเปิดดู/แก้ข้อมูลผ่าน Sheets ได้เมื่อจำเป็น
- ส่งมอบทั้งข้อมูล สูตร source code สิทธิ์ Google/Render/GitHub และวิธีอัปเดตให้ผู้ดูแลคนต่อไปได้
- หน้า login พื้นหลังดำ ไม่มีการ์ด จัดกึ่งกลางแนวตั้ง/แนวนอน เรียงโลโก้ RPTH → “จัดการทะเบียนประชากร” → Username → Password → Login ข้อความใน input ชิดซ้าย
- **บัญชีร่วม Admin บัญชีเดียวกับรหัสกลาง** ไม่เลือกชื่อ Regina/Saviour/Esther และไม่เก็บชื่อบุคคลในรายการใหม่ ห้ามกลับไปสร้างระบบแยกคนเอง
- UI งานทะเบียนเดิมเป็นการ์ดเดียว ขาวดำ accent ทอง ใช้ Material Symbols local และ subgrid ตามโค้ดเดิม
- กรอก/แสดงวัน dd/MM/yyyy ปี ค.ศ.; ส่ง API เป็น YYYY-MM-DD; คำนวณ Asia/Bangkok

## สถานะจริง ไม่ใช่แผน

### ผ่านแล้ว

- Login Admin ผ่านเว็บ GitHub Pages → Render ได้ และโหลดทะเบียนจากชีตสำเนาผ่าน Apps Script ได้
- ลงทะเบียนผู้เล่นใหม่จากเว็บ → Render → Apps Script → สำเนา Google Sheets **ครบทั้ง 4 ชีตจริง**
- รายงานล่าสุดของผู้ดูแล: requestId `955fe4ec-24c0-4b80-a820-ab041ad344d1`, Users แถว 356, Characters 405, Player 295, log ลงทะเบียนตัวละคร 1160; verification.ok=true ทุกชีต ไม่มี formulaErrors
- ก่อนหน้านี้ผู้ดูแลตรวจค่าจริงในแถวทดลอง: สมัคร 05/11/2026 → Exempt Until 05/02/2027; MAIN 1 วัน / SUB 0 ในวันสมัคร ถูกต้อง
- ทะเบียนล็อกเฟซเคลมไม่แสดงรายการไม่มีเมจแล้ว ทั้ง Player/Staff/NPC มี tests ตรวจ
- บันทึกผ่าน Sheets batchUpdate ชุดเดียวพร้อม receipt; คัดลอกสูตร native และไม่เขียน Player H แยกจาก spill ของ G

### ยังไม่พร้อมเปิดเต็มระบบ

- **เขียนได้ register / edit / npc / race บนชีตสำเนา** กรณี edit ต้องยกเลิก/พักนับล็อกยังถูกปิดไว้เพื่อรอเชื่อม flow ล็อก ไม่ได้เปิดชีตหลัก เมนูอื่นยังไม่มี backend
- การทดสอบออนไลน์กรณีข้อมูลซ้ำ/สองคำขอพร้อมกัน/สรุปเก่า/เน็ตขาด ยังไม่ครบ แม้มี automated tests ในเครื่องแล้ว
- ยังไม่ได้ทำระบบ sync/deploy Apps Script อัตโนมัติ ขณะนี้มี builder รวมไฟล์ลดขั้นคัดลอกด้วยมือ
- Render ใช้ process เดียว memory sessions/rate limit; restart/redeploy ทำให้ login ใหม่ ไม่รองรับหลาย instance
- **อย่ารายงานว่า production/เต็มระบบพร้อมเพียงเพราะลงทะเบียนใหม่กรณีสำเร็จผ่าน**

## บริการและข้อมูลเป้าหมาย

| ส่วน | ที่อยู่ |
| --- | --- |
| Git remote | https://github.com/savant777/rpth-population.git |
| Branch | main |
| หน้า admin | https://savant777.github.io/rpth-population/admin.html |
| Backend Render | https://rpth-admin-test.onrender.com |
| Health | https://rpth-admin-test.onrender.com/health |
| Apps Script /exec | https://script.google.com/macros/s/AKfycbzqfUJzZOEi9BY34_hheB7WRxJf7nAbfpI522faxaGtjYC5O11R1AN1pEL7_ijQuqMoPg/exec |
| **สำเนาทดสอบ** | https://docs.google.com/spreadsheets/d/1jR8P-z62t3I95hNCkBBvzUsSA9kwHsD9w5Lo0jlX2QY/edit |

โค้ดตรวจ ID สำเนาใน `InspectCopy.gs` และเปิด ID นี้ใน `WebGateway.gs` อย่าเปลี่ยนเป็นชีตหลักเอง ไม่มี Spreadsheet ID ชีตหลักที่ยืนยันสำหรับระบบเขียนในงานนี้ การใช้ connector Google Drive กับสำเนาเคยได้ 403 ผู้ดูแลจึงส่ง XLSX และรัน inspector เอง ห้ามแก้แชร์เป็นสาธารณะเพื่อเลี่ยงปัญหาสิทธิ์

## ผังไฟล์หลังจัดระเบียบ

| ที่อยู่ | หน้าที่ / สิ่งที่ควรแก้ |
| --- | --- |
| root `admin*.html/css/js` | หน้า admin/login และโมเดล demo เก็บ path เดิมเพื่อไม่ทำ URL GitHub Pages เสีย |
| root `server.mjs`, `admin-auth.mjs`, `admin-gateway.mjs` | Node backend บน Render; ไม่ใช่ไฟล์ที่จะวางใน Apps Script |
| `admin-config.js` | เก็บ Render URL สาธารณะเท่านั้น ไม่ใส่ secret/hash |
| `apps-script/` | source Apps Script ที่ต้องแก้จริง แยก inspect/schema, preview/rules, writer/receipt, web gateway และ manifest |
| `tests/` | tests ของ auth/CORS/HMAC/bootstrap/planner/writer/receipt/dashboard ใช้ `npm test`; รอบส่งมอบนี้เก็บขึ้น Git แล้ว |
| `tools/apps-script/build.mjs` | รวม source เป็น Code.gs และ manifest ที่พร้อมติดตั้ง รัน `npm run build:apps-script` |
| `tools/apps-script/diagnostics/DiagnoseGateway.gs` | เครื่องมือตรวจ fingerprint/UTF-8 HMAC แบบไม่เปิดเผยกุญแจ ใช้เฉพาะวินิจฉัย ไม่รวมใน bundle ปกติ |
| `tools/hash-admin-password.mjs` | ให้ผู้ดูแลตั้งรหัสแบบซ่อนใน terminal แล้วรับ scrypt hash ไปตั้งใน Render ไม่ใช่รหัสเริ่มต้น |
| `tools/workbooks/inspect-admin-workbook.py` | อ่าน XML ของ XLSX โดยไม่คำนวณ/แก้ทับสูตร Google ต้องใช้ Python standard library เท่านั้น |
| `tools/previews/tooltip-preview.html` | หน้า dev preview tooltip ใช้ npm run dev แล้วเปิด /tools/previews/tooltip-preview.html |
| `docs/reference/` | เอกสารสูตรเก่าเพื่ออ้างอิง มีคำเตือนว่าไม่ใช่ขั้นติดตั้ง/กติกาปัจจุบัน |
| `local-delivery/` | ไฟล์ติดตั้งที่ build ใหม่ได้ ไม่ขึ้น Git ห้ามแก้ตรงนี้เป็น source หลัก |
| `local-reference/` | Excel และ HTML snapshot เฉพาะเครื่อง ไม่ขึ้น Git และไม่มีบนเครื่องใหม่ |

ไฟล์ `admin-model.js` ยังเป็นโมเดล demo ส่วน live ใช้กติกาฝั่ง Apps Script ไม่ส่ง patches จาก browser ไปเขียนโดยตรง

## ตั้งเครื่องใหม่ / อัปเดต source และ deployment

```sh
git pull --ff-only origin main
npm test
npm run build:apps-script
```

build ต้องสำเร็จ จะได้ `local-delivery/Code.gs`, `local-delivery/appsscript.json`, `local-delivery/INSTALL.txt` อิง path ของ script ไม่ขึ้นกับ cwd และตรวจ syntax/ชื่อฟังก์ชันซ้ำก่อนเขียนไฟล์

Source ทั้ง 6 ไฟล์ (รวม CharacterEdit.gs / OtherRegistryForms.gs) ถูกวางรวมใน **Code.gs ไฟล์เดียว** ใน Apps Script โปรเจกต์ที่ผู้ดูแลใช้อยู่ อย่าสั่งให้เพิ่ม source แยกซ้ำอีก ในโปรเจกต์จริงไฟล์ Code แสดงชื่อไทยว่า รหัส.gs และมี DiagnoseGateway.gs กับ manifest อยู่เดิม

ผลตรวจรอบส่งมอบนี้: Node v22.17.0, `npm test` ผ่าน 36/36 รายการ, `npm run build:apps-script` สำเร็จ ตรวจ syntax ของ Code.gs และชื่อฟังก์ชันไม่ซ้ำครบ 27 ฟังก์ชัน ไม่มีการเขียนชีตหรือ redeploy บริการออนไลน์ระหว่างจัดส่งมอบ

อัปเดต Apps Script: แทนที่ Code.gs จาก bundle → บันทึก → Deploy / Manage deployments → Edit → New version → Deploy เพื่อคง /exec URL เดิม **รักษา Script Properties เดิม ไม่สร้าง secret ใหม่โดยไม่จำเป็น**

Source บน Git กับ deployment บน Apps Script แยกกัน push Git ไม่ได้ทำให้ Apps Script อัปเดตเอง เช่นเดียวกับ Render ที่ `autoDeployTrigger: off` ต้อง Manual Deploy latest commit เมื่อ backend เปลี่ยน ส่วนการแก้ Apps Script อย่างเดียวไม่ต้อง redeploy Render

`npm run dev` เป็น local server 127.0.0.1:4173 และเสิร์ฟ admin-config.js แบบ apiBase ว่างจาก server โดยไม่แก้ไฟล์จริง จึงใช้ API และ cookie บน origin เดียวกันได้ ไฟล์จริงสำหรับ GitHub Pages ยังคงชี้ Render; ไม่เพิ่ม localhost เข้า CORS ของระบบออนไลน์ ตั้ง password hash ใน environment ก่อนรัน; หากไม่ได้ตั้ง gateway จะเป็น local-demo หากตั้ง gateway จะยังใช้สำเนาเดิม รายละเอียดใน docs/render-setup.md

## Secrets / สิทธิ์ / การส่งงานต่อ

- ไม่มีรหัสทีม ค่า password hash หรือ gateway secret จริงใน repo นี้ **อย่าขอให้ผู้ดูแลวางค่าลับในแชตหรือ commit .env**
- Render environment: NODE_ENV=production, RPTH_APP_ORIGIN=https://savant777.github.io, RPTH_APPS_SCRIPT_URL=/exec ข้างต้น, RPTH_GATEWAY_SECRET, RPTH_ADMIN_PASSWORD_HASH
- Apps Script Script Properties: RPTH_GATEWAY_SECRET ค่าเดียวกับ Render; `setupGatewaySecret` แสดงค่าเดิมให้ผู้ดูแลคัดลอกเอง ไม่หมุนกุญแจเมื่อรันซ้ำ
- รหัสทีมกับ gateway secret เป็นคนละอย่าง scrypt$… ใช้เฉพาะ RPTH_ADMIN_PASSWORD_HASH
- Render ตรวจ password และ bearer session ใน memory; browser เก็บ token ใน memory ไม่ใส่ localStorage/sessionStorage; logout/หมดอายุถูกตรวจฝั่ง server
- Apps Script ตรวจ HMAC + timestamp + nonce ก่อนอ่าน/เขียน ใช้ owner hash ผูกคำขอกับเซสชันเพื่อความปลอดภัย ไม่เก็บชื่อบุคคลในทีม
- บัญชี Admin เป็นชื่อร่วมสำหรับรายการใหม่ ประวัติเก่าที่มีชื่อบุคคลจากช่วงทดลองไม่ได้ถูกแก้ย้อนหลัง
- รายชื่อเจ้าของ/ผู้มีสิทธิ์บัญชี Google, GitHub และ Render ยังไม่ได้ตรวจจากบัญชีจริง ห้ามสมมติว่าโอนสิทธิ์ครบแล้ว ต้องทำรายการส่งต่อสิทธิ์ก่อนเจ้าของลาออก

## ปัญหาที่แก้แล้ว — อย่าพาผู้ดูแลวนแก้ซ้ำ

1. **ลายเซ็นไม่ตรง**: fingerprint กุญแจ Render/Apps Script ตรงกัน และ native UTF-8 test ตรงกันแล้ว จึงแก้ `gatewaySignature_` ให้ระบุ Utilities.Charset.UTF_8 พร้อมแปลง signed bytes อย่างชัดเจน จากนั้นผ่านขั้นลายเซ็นและอ่านชีตได้ ห้ามลบการตรวจลายเซ็นหรือให้เปลี่ยนกุญแจซ้ำโดยไม่มีหลักฐาน
2. **สูตรผิดใน Users ตอน bootstrap**: Users Status บางแถวมี error แต่ bootstrap ใช้แค่ UID จึงอ่าน Users A เท่านั้น ไม่ไปพึ่งคอลัมน์ Status ที่ไม่ใช้ Status ของผู้เล่นมาจาก Player ตาม schema ถ้าข้อมูลคอลัมน์จำเป็นผิด ตัวอ่านยังต้องหยุดและระบุชีต/แถว/คอลัมน์ ห้าม blanket-ignore formula errors
3. **สูตร XLSX เป็น DUMMYFUNCTION**: ใช้สูตร native จาก Google Sheets เท่านั้น ไม่เขียนสูตร export กลับชีต
4. **H เป็น spill output**: Player G ให้ผล G:H; ห้ามคัดลอกสูตร H หรือวางค่าทับผลลัพธ์

## งานต่อไปตามลำดับ

### A. ทำลงทะเบียนใหม่ให้พร้อมใช้จริงก่อน

ผลทดสอบออนไลน์ 6 พ.ย. ผ่าน Chrome ที่ผู้ดูแลล็อกอินไว้ โดยใช้สำเนา ID เดิม: วันที่ 31/02/2026 ถูก client ปฏิเสธ; UID 503 ถูก server ปฏิเสธพร้อม CharID ซ้ำ; เพิ่มข้อมูลสังเคราะห์ `RPTH QA 20261106 A` UID/post 99061101 สำเร็จ requestId `fef6b356-ccf4-4dbe-bda8-d1f15a3780eb` ที่ Users357 / Characters406 / Player296 / log1161 ใบรับ verification.ok=true ทุกชีต ไม่มี formulaErrors ตรวจค่าจริงผ่าน UI สำเนา: Users Active, CharID C-99061101-01 / MAIN / Active TRUE, Player Status TRUE / MAIN1 / SUB0 / ExemptUntil06/02/2027, log วันที่06/11/2026 / NEW→MAIN / AffectsUsage FALSE / Active และ Public Player แสดง UID/ชื่อ/สถานะ/usage/ExemptUntil ตรงกัน หลังเพิ่มแล้วลอง UID99061102 กับเฟซเคลมเดิมถูกปฏิเสธ และ UID99061101 กับเฟซเคลมใหม่ถูกปฏิเสธด้วย UID/CharID ซ้ำ ไม่ได้เพิ่มรายการที่สอง เก็บแถว QA ไว้เป็นหลักฐาน ไม่ได้ลบหรือแก้ข้อมูลสมาชิกเดิม ภาพ local ignored: local-delivery/qa-public-player-20261106.jpg

ยังไม่ได้ทดสอบออนไลน์: retry commit request เดิม (ต่างจาก submit ฟอร์มซ้ำ), preview stale/หมดอายุ, สอง session, response หาย, logout/rotation, วันที่ข้ามเดือนปลายเดือน และ rollover สูตรปี2027; ไม่จำลองตัดเครือข่ายหรืออ่าน token ผ่าน browser พบ UI หลัง success ยังมี draftStatus ว่า “ยังไม่ได้บันทึกลงทะเบียน” ทั้งที่ใบรับสำเร็จ ควรปรับข้อความ/แบบร่างให้ตรงกันก่อนใช้งานจริง ไม่ได้แก้หรือ deploy จุดนี้ในรอบทดสอบ

ความคืบหน้า 6 พ.ย. บนเครื่องนี้: เพิ่ม local contract tests สำหรับคนละ session ยืนยัน preview, สอง preview หลังข้อมูลเปลี่ยน, preview หมดอายุ, script lock ไม่ว่าง, แถว UID ว่างแต่ checkbox FALSE และขอบเขตแถว 10,000 ผ่าน `npm test` 55/55 (รวม tests/admin-model.test.cjs ที่ยัง untracked เฉพาะเครื่องนี้; ชุด tracked มี 40 tests) และ build bundle 27 unique functions สำเร็จ ไม่ได้เขียนชีตหรือ deploy; กรณีเหล่านี้ยังเป็น mock ไม่ใช่ผลทดสอบออนไลน์ แถว checkbox FALSE ถูกเก็บไว้และต่อท้าย ไม่ได้นำแถวเดิมมาใช้ซ้ำ จึงยังต้องตรวจพื้นที่จริงในสำเนาและสูตรอ้างอิงปี 2027

- ตรวจ tests ปัจจุบัน แล้วเพิ่ม integration/contract coverage ที่ยังขาด โดยไม่เขียนข้อมูลผู้ใช้จริง
- ทดสอบบนสำเนาผ่านเส้นทางออนไลน์: UID ซ้ำ/เฟซเคลมซ้ำ/CharID ที่เคยใช้, วันที่ผิดและข้ามเดือน, preview เก่า, กดยืนยันซ้ำ, สองแท็บ/สองเซสชัน, response หายก่อน/หลัง batch, logout/หมดอายุ/เปลี่ยนรหัส
- Tests จำลอง API ไม่ได้พิสูจน์บริการ Google จริง ผู้ดูแลทดสอบเฉพาะกรณีสำเร็จออนไลน์แล้ว อย่าอ้างว่ากรณีผิดพลาดทั้งหมดผ่าน production integration
- ตรวจผล Public/dashboard และค่าคำนวณแถวใหม่เพิ่มเติม ไม่ใช้เพียงสูตรมีอยู่และไม่ขึ้น error เป็นหลักฐานว่าทุกผลคำนวณถูกต้อง
- ตรวจ target row และ formula coverage ถึง 10,000 แถว, แถวที่มี checkbox FALSE แต่ไม่มี UID, header ปี 2026 และการเปลี่ยนปี 2027 มีผลต่อการต่อระบบอย่างไร
- ก่อนใช้ชีตหลัก: ต้องได้รับคำสั่งยืนยันเป้าหมาย สำรองข้อมูล/สูตร และทดสอบวิธีกู้คืนกับสำเนา ไม่ย้ายเป้าหมายเอง

### B. ทำ flow อื่นครบฝั่ง server

ลำดับเสนอ: เปลี่ยนชื่อ/เมจ → เพิ่ม NPC/เปลี่ยนเผ่าพันธุ์ → เพิ่มตัวรอง/สลับ → เปลี่ยน MAIN → ล็อก/ต่ออายุ/พักนับ/นับต่อ → Reclaim → Inactive หลายคน ปรับลำดับได้แต่ต้องรักษากติกาใน admin-flow.md

ทุก flow ต้องมี preview แยกจาก commit ตรวจสิทธิ์และข้อมูลใหม่ที่ server รักษา native formulas แสดงผลแยกชีตก่อนยืนยัน ป้องกัน request ซ้ำและมี receipt อ่านผลกลับให้ครบ เมนูที่ server ยังไม่รองรับต้องไม่เปิดให้เขียนจริง

### C. ข้อสรุปธุรกิจที่ยืนยัน 6 พ.ย. — ไม่ถามซ้ำ

- Post Check / Activity Check / Reclaim Approved ตอน Inactive เป็น FALSE ทั้งหมด และยกเลิกสิทธิ์ล็อกที่เกี่ยวข้อง
- Type สำหรับกลับมานับต่อ/ยกเลิกที่สูตรล่าสุดรองรับ ต้องอ่าน native/validation ไม่อิงชื่อในเอกสารสูตรเก่าอย่างเดียว
- ต่ออายุหลังหมดอายุใช้ LockID ใหม่ เริ่มวันอนุมัติใหม่
- ไม่ต้องมีที่เก็บสิทธิ์เพิ่มตัวรองพิเศษแยก ผู้ดูแลคุยตกลงก่อนบันทึกแล้ว ใช้ฟอร์มเพิ่มปกติ
- MAIN ใหม่เก็บลิงก์ใหม่ ตัวละครเดิมคงลิงก์ของตัวเอง
- เริ่มล็อกเมจที่ใช้อยู่ให้พักนับทันทีวันอนุมัติ ตัวพักนับเปลี่ยนเมจให้ยกเลิกสิทธิ์เดิม

มีข้อมูลบางส่วนใน docs/reference/ ที่ดูเหมือนข้อสรุปแต่เก่ากว่าเอกสาร flow ห้ามนำมาฟันธงแทนผู้ดูแล

### D. ทำให้ส่งมอบ/อัปเดตง่าย

- ใช้ builder ที่มีแล้วเป็นฐาน ประเมินการ sync/version/deploy Apps Script แบบคำสั่งเดียวหรือ workflow ที่ปลอดภัย เช่น clasp โดยต้องไม่นำ credentials/token ขึ้น Git และไม่สั่งผู้ดูแลทำ setup ก่อนเตรียมโค้ด/ข้อจำกัดให้ชัด
- ทำแล้วใน local development: server เสิร์ฟ config สำหรับ same-origin โดยไม่แก้ public config พร้อมทดสอบ config local และการไม่เสิร์ฟไฟล์นี้ใน production; ยังไม่ได้ deploy การเปลี่ยนแปลงนี้
- ทำคู่มือชุดเดียวสำหรับติดตั้ง อัปเดต สำรอง กู้คืน เปลี่ยนรหัส และโอนเจ้าของบริการ/บัญชี
- ไม่เพิ่มบริการฐานข้อมูลใหม่หรือย้ายออกจาก Sheets โดยไม่มีคำสั่งผู้ดูแล

## กติกาที่ห้ามตกหล่น

- CharID ติดกับตัวละคร สร้างตัวใหม่ต้อง ID ใหม่ เก็บตัวเลิกใช้ Slot='-' และ Active=false ไม่เปลี่ยน log เก่าตามสลอตปัจจุบัน
- สลับตัวต้องรักษาเมจต้นทางหากสิทธิ์ล็อกตรง UserID+CharID+เมจ และเตรียมพักนับ/นับต่ออย่างถูกต้อง
- วันยื่นฟอร์มกับวันอนุมัติ Reclaim เป็นคนละวันและลง log คนละประเภท
- Inactive รับรายชื่อที่ตรวจและตกลงแล้ว ไม่ทำระบบนับโพสต์ซ้ำในหน้า admin
- ไม่มีระบบรับชำระเงิน/หักโควตาฟรีหรือ workflow ขออนุมัติใหม่ใน admin
- Public sheets/Faceclaim Locks คำนวณด้วยสูตร ห้าม API เขียนทับผลสรุป

## ไฟล์เฉพาะเครื่องเดิมและสิ่งที่จัดเก็บแล้ว

- เก็บ Excel `[RPTH] ทะเบียนตัวละคร.xlsx` และ `ทดสอบระบบ.xlsx` ไว้ใน `local-reference/spreadsheets/` ไม่ลบและไม่ push เครื่องใหม่ใช้ชีต Google ล่าสุดเป็นหลัก ไม่อ้างว่า XLSX ใน Git เพราะไม่มี
- ย้าย `population post.html` ไป `local-reference/population-post.html` เป็น HTML snapshot ทะเบียน ไม่ push รายชื่อจำนวนมาก
- ย้ายเอกสารสูตร 2 ไฟล์ไป docs/reference/ และ preview tooltip ไป tools/previews/ พร้อมแก้ relative paths
- เก็บ tests ใหม่ทั้งหมดและ Python inspector ขึ้น Git แล้ว จึงรันตรวจบนเครื่องใหม่ได้
- ลบคู่มือชั่วคราวที่ล้าสมัย docs/admin-login.md, docs/admin-workbook-inspection.md, docs/admin-write-test.md หลังรวมสถานะ/schema/ข้อจำกัดไว้ในเอกสารหลักและไฟล์นี้แล้ว
- ลบ server.out.log / server.err.log ที่ว่าง ไม่ลบข้อมูลทะเบียน ไม่แก้ secrets และไม่เขียนชีตระหว่างจัดระเบียบ

## หลักฐาน Git และการทำงานหลังจากนี้

Functional commits ก่อนจัดส่งมอบ: `19fae6b` (Admin login/backend), `4276527` (Render URL), `74b7932` (diagnostic), `b17edf4` (UTF-8), `9efd682` (อ่าน Users เท่าที่จำเป็น) commit `9818f4e` ถูก undo ตามคำขอแล้ว อย่านำกลับมาเป็นฐาน

commit ล่าสุดที่มีไฟล์นี้เป็นชุดส่งมอบและจัดระเบียบ ให้ดู `git log -1 --oneline` บนอีกเครื่อง ผู้ดูแลอนุญาตให้ commit/push ชุดส่งมอบนี้แล้ว ไม่ได้อนุญาตให้ deploy ลงชีตหลักหรือเปลี่ยนกติกาที่ยังค้าง

ข้อความเริ่มแชตที่แนะนำ: “ทำงาน rpth-population ต่อ อ่าน CODEX_HANDOFF.md และเอกสารที่อ้างก่อน รัน tests/build แล้วทำรายการงานค้าง โดยยังใช้ Google Sheets และชีตสำเนาเดิม อย่าเปลี่ยนเป้าหมายเป็นชีตหลักหรือเดากติกาที่ยังไม่ตกลง”
