# แผนทดสอบและส่งตรวจทีละฟอร์ม

เป้าหมายคือพร้อมใช้งานครบ flow ใน admin-flow.md ไม่ใช่เปิดเฉพาะ register ใช้ Google Sheets และสำเนา ID `1jR8P-z62t3I95hNCkBBvzUsSA9kwHsD9w5Lo0jlX2QY` เท่านั้นจนกว่าจะได้รับอนุญาตเปลี่ยนเป้าหมาย

แต่ละฟอร์มต้องผ่าน planner/validation, server auth, preview freshness, atomic commit, retry/idempotency, readback และผลสูตร/Public ที่เกี่ยวข้อง จึงแจ้งผู้ดูแลตรวจ ห้ามถือว่าทดสอบ demo หรือ mock แล้วเท่ากับผ่านออนไลน์

| ลำดับ | ฟอร์ม | สถานะ |
| --- | --- | --- |
| 1 | ลงทะเบียนผู้เล่นใหม่ | ออนไลน์สำเร็จและกรณี validation บางส่วนแล้ว; robustness ยังไม่ครบ |
| 2 | เปลี่ยนชื่อ/เฟซเคลม | deploy/ทดสอบออนไลน์กรณีปกติแล้ว พร้อมให้ตรวจ; การเชื่อมล็อกยังรอขั้น6 |
| 3 | เพิ่ม NPC / เปลี่ยนเผ่าพันธุ์ | deploy และทดสอบออนไลน์แล้ว พร้อมให้ผู้ดูแลตรวจบนสำเนา |
| 4 | เพิ่มตัวรอง / สลับตัวละคร | deployและทดสอบออนไลน์แล้ว พร้อมให้ตรวจบนสำเนา; local81/81, Apps Script v11/Render40b0b0f |
| 5 | เปลี่ยน MAIN | ผ่านออนไลน์ new/promote/keep/retire/replacement และเมจเดิมไม่มีล็อก; Apps Script v14/Render855d778 พร้อมตรวจบนสำเนา |
| 6 | ล็อก/ต่ออายุ/พักนับ/นับต่อ | อ่าน native L:Q ครบแล้ว; auto pause/resume เชื่อมกับ switch แล้ว ยังต้องทำฟอร์มซื้อ/ต่ออายุและทดสอบออนไลน์ |
| 7 | Reclaim ผ่าน/ไม่ผ่าน | มี demo model; ยังไม่มี live server flow |
| 8 | Inactive หลายคน | มี demo model; flags/ยกเลิกล็อกยืนยันแล้ว ต้องพัฒนา server |

กติกาทั้งหกข้อได้รับคำตอบแล้วในแชต 6 พ.ย. และแก้ admin-flow.md ตามนั้น คำว่า “ค้าง” ในตารางหมายถึงการพัฒนา/ทดสอบที่ยังไม่เสร็จ ไม่ต้องถามผู้ดูแลซ้ำเรื่อง flags, โควตาพิเศษ, ลิงก์ MAIN, ต่อหลังหมดอายุ และการยกเลิกจากเปลี่ยนเมจที่พักนับ

## เมจเดิมและใบรับ — 8 พฤศจิกายน

Apps Script v13 ทดสอบอนุญาตเมจต้นทางที่ไม่มีล็อกเมื่อclearในbatchเดียวกัน ใช้QA99061101เท่านั้น ไม่โอนสิทธิ์ล็อก ข้อห้ามเจ้าของอื่น/NPC/ล็อกยังมีlocalnegative tests

| กรณีออนไลน์ | requestId | ผลจริง |
| --- | --- | --- |
| เตรียมใช้ SUB2 | 00b76dd2-6cc2-45a9-9da4-d42a74e17070 | log1185/event32 resumeID01 |
| SUB2→SUB3 เมจเดียวกัน | 1af4e643-15a7-4710-97d9-5183b5e64473 | log1186; ID05clear/ID06activefaceB |
| สร้าง MAIN ใหม่เมจเดียวกัน แทนที่ตัวรองเต็ม | 5a3b85cb-4701-4a8a-8735-f423bd1ef361 | log1187/1188; ID06retiredblank, newID07MAINfaceB/URLใหม่; ID01→SUB3คงlockedface |
| คืนใช้ ID01 หลังแก้ใบรับ v14 | 52cfae3f-3739-4776-82da-a2c6de062bf2 | log1189/event33pause; ID07clearface |
| เลื่อน ID01 กลับ MAIN เก็บ ID07 SUB3 | 01e4d150-4f9c-4e13-a1d6-7210853e9f03 | log1190/1191; Users/Playersync; ไม่มีlockeventซ้ำ |

ทุกใบรับ verification.ok=true Nativeสุดท้าย MAIN ID01active, SUB1 ID02lockedface, SUB2 ID05blank, SUB3 ID07blank; retired03/04/06 '-', URL/IDคงเดิม Playerusage3/0 fee7/5000 exempt06/02/2027 ล็อกID01พัก365วันStart08/11/2026 PreviousEnd08/11/2027, ID02นับ364ถึง07/11/2027; PublicและnativeCheckOK

ความล้มเหลวที่พบจริง: post99061164ครั้งแรกถูกbatchUpdateปฏิเสธเพราะmetadataเต็ม ไม่มีpartialbusinesswrite แก้ด้วยReceiptStore.gsและย้ายใบรับ27ใบแบบatomic/readbackตรงกัน ไม่ลบประวัติ จากนั้นv14บันทึกสองรายการด้านบนสำเร็จ nativeledgerhidden29ใบ/legacy0 รายละเอียดreceipt-ledger.md ห้ามrollbackreaderเก่า Local94/94 (tracked79+local15) build43functions/9sources หลักฐานlocal-delivery/face-transfer-*.txt/jpg ล้างdraftแล้วพร้อมผู้ดูแลตรวจ

## เพิ่มตัวรอง / สลับใช้งาน — 7 พฤศจิกายน

Deployed source40b0b0f: Apps Script v10, Render Live26.4s, shared loginใหม่แล้ว ใช้บัญชีสังเคราะห์99061101เท่านั้น

| กรณีออนไลน์ | requestId | ผลจริง |
| --- | --- | --- |
| MAIN→SUB1 ไม่มีล็อก | 0371f78d-a0a7-4d81-9201-e243fe7fc066 | Characters406/407 Player296 log1168; เมจ MAINว่าง, SUB1active; readbackผ่าน4แถว |
| SUB1→MAIN มีล็อกทั้งคู่ | 05e5d937-9d64-4108-aa3f-968c53febeda | log1169 event24เริ่มนับต่อSUB1/25พักMAIN; เมจSUB1คงอยู่; readbackผ่าน6แถว |
| สร้างตัวรองใหม่พร้อมสลับ | 217ae8b0-f707-4a21-93a8-09780d60289c | Characters408 C-99061101-03 SUB2 active URLใหม่, log1170 usageTRUE, event26เริ่มนับต่อMAIN; readbackผ่าน5แถว |
| SUB2→SUB1 | 1c71afd8-8838-4fff-bd33-ea79c790adb0 | log1171 event27พักSUB1; ล้างเมจSUB2เพราะไม่มีล็อก; readbackผ่าน5แถว |
| คืนSUB1→MAIN หลังdeployv11 | 3b26cac6-8f95-45c5-9b80-626e217a49a2 | log1172 event28resumeSUB1/29pauseMAIN; readbackผ่าน6แถว |

สิทธิ์ล็อกเป็นfixtureที่สร้างแยกผ่าน SeedSwitchQaLocks.gs event21–23 ก่อนทดสอบสลับกลับ ทั้งสาม nativeCheckOK ไม่ใช่หลักฐานว่าฟอร์มซื้อ/ต่ออายุพร้อม Read-only inspectorอ่านแถวจริงหลังสลับกลับแล้ว: Characters URLคงเดิม, Player/PublicPlayer MAIN statusTRUE usage2/0 exempt06/02/2027, FaceclaimLocks12/13 และPublicLocks10/11ตรงกัน MAINพัก365วัน StartPause07/11/2026 PreviousEnd07/11/2027, SUB1นับถึง07/11/2027 ไม่มีerror สูตรทั้งหมด Nativeผล/ใบรับ/ภาพเก็บ local-delivery/*switch* และ sub-register-*.

Local casesเพิ่ม9ข้อ: slot/ID allocationไม่ใช้ retired IDs, current active consistency, duplicate/foreign/retired target, face/NPC/lock conflict, duplicatepost, chronology, native zero-day pause rejection, prefilledL:Qไม่ชนinput, multi-row atomic batch/native formulas, readbackทุกแถว, stale lock snapshot และlost-response receipt retry รวมกับเดิม80testsผ่าน ยังไม่อ้างว่าทดสอบ lost-response/retry/concurrency บนGoogleจริงครบ

อ่านแถวจริงหลังเพิ่มตัวรองด้วย inspectorแล้ว: Characters408 ID03/URL/TRUEตรง, Player/PublicPlayer SUB2 วันที่07/11/2026 usage1/1, locksทั้งสองกลับนับ365วันถึง07/11/2027; ไม่แก้ชื่อUsers/Playerหรือcheckflags อีกกรณีออนไลน์ new-sub ใช้เมจ MAIN ที่มีล็อกอยู่ถูกปฏิเสธทั้งผู้ใช้งานซ้ำ/สิทธิ์ล็อกตัวอื่น ไม่มีแถวเพิ่มจากคำขอนั้น

เพิ่มอีก1testเรื่อง native log อนุญาต Gว่างในเหตุการณ์ต่อมา จึง resolveเฟซจากเริ่มล็อก และต้องคงUID/CharIDเดิมข้ามทุกเหตุการณ์ (native Checkเองยังไม่ตรวจUID) รวม81testsผ่าน builder36functions การแก้นี้เป็น gs-only ไม่ต้อง restartRender/session

ผลfinal read-only inspectorหลังv11commit: Characters406 TRUE/407FALSEคงเมจ/408FALSEเมจว่าง ทั้งสามURLคงเดิม; PublicPlayer MAIN TRUE usage2/0 Exempt06/02/2027; PublicLocksMAINพัก365วัน Start07/11/2026 PreviousEnd07/11/2027, SUB1นับถึง07/11/2027 ไม่มีformulaerrors NativeCheckOKถึงevent29. ล้างdraftsub/switchแล้ว เปิดsubว่างพร้อมตรวจ ถัดไปฟอร์มMAIN

## เปลี่ยน MAIN — 7 พฤศจิกายน

Source855d778, Apps Script v12 URLเดิม, Render Live ผู้ดูแลloginใหม่ให้แล้ว QA99061101ก่อนทดสอบ Users357/Player296 ชื่อเดิม activeMAIN, Main Char Change=0/Fee=0. Local86/86ผ่าน ครอบคลุมnewMAINทั้งMAIN/SUB, promoteเฉพาะcurrent, keep/retire, full-slotreplacementรวมกรณีทับcurrent, lockedretireถูกblock, ID/URLคงเดิมและไม่reuse, usageFALSE/TRUEแถวหลักและFALSEแถวmove, logสองแถวatomic, retiredvalidation'-'เฉพาะเซลล์. ผลออนไลน์ตามด้านล่าง

ผลออนไลน์เริ่มต้น: สร้าง MAIN ใหม่เก็บตัวเดิม request a734e6f8-f4e3-45ee-b7b0-0b0665e59ab9, Characters409 ID04 MAIN URL?qa-main=A, ตัวเดิม406→SUB3 คงเมจlocked, Users357/Player296ชื่อMAINใหม่, log1173 NEW→MAIN FALSE/log1174moveMAIN→SUB3 FALSE, lockevent30resumeเดิม, readback7แถวผ่านทั้งหมด. NativeInspectorยืนยัน Users/Playerชื่อใหม่ MainCharChange1 Fee0. Promoteขณะยังใช้MAINถูกserverปฏิเสธ. สลับไปSUB2ก่อนpromote requestbad16c04-c9c7-48a7-8541-07b3048e62d8 log1175 readbackผ่าน

Promote SUB2→MAIN requestda7f81eb-1083-4864-b6af-7343ee8db726 log1176/1177 readback6แถวผ่าน: ID03เดิมเป็นMAIN, ID04→SUB2, URLของแต่ละตัวคงเดิม NativeFee2ครั้ง/5000. จากนั้นสลับไปใช้ID04 SUB2 แล้วสร้างMAINใหม่ไม่เก็บตัวเดิม requestb0ce2393-7474-4e92-9263-24e3d00277ff log1179 SUB2→MAIN TRUE, Characters410 ID05ใหม่ URL?qa-main=B, Characters408 ID03→'-'/FALSE/เมจว่างแต่URLเดิมอยู่, readback6แถวผ่าน. InspectorยืนยันเฉพาะD408มีตัวเลือก'-'เพิ่ม ส่วนD406/407/409/410เดิมไม่เปลี่ยน. กรณีสร้างMAINเก็บตัวเดิมเมื่อสลอตเต็มแต่ไม่เลือกreplacementถูกserverปฏิเสธ

เลือกreplacementเป็นID01ที่มีล็อกถูกserverปฏิเสธโดยไม่มีการเขียน จากนั้นเลือกID04ที่ไม่มีล็อก requestb3306504-b26c-4ac7-b164-16ba07b14678 สำเร็จ: ID04row409เก็บ'-'/FALSE/เมจว่าง URL?qa-main=Aเดิม, ID05row410→SUB2 URL?qa-main=Bเดิม, ID06row411MAIN URL?qa-main=Cใหม่, Users357/Player296ชื่อC, log1180 NEW→MAIN FALSE/log1181moveMAIN→SUB2 FALSE, readback7แถวผ่าน NativeCount4/Fee5000. สลับเตรียมก่อนretireโพสต์99061154 request75cbf98d-e17c-4590-b7c8-3d168b09f8e6 log1178ผ่าน

คืนตัวเดิม: switch request36e68b8d-08f9-4c75-9e6b-3e2edc4b41ef log1182/event31pauseID01; promote requesta40d7772-98a8-4416-94b8-e291b1725139 log1183/1184 ไม่มีlockeventซ้ำ readbackผ่าน. FinalNative Users/Playerชื่อเดิม MAIN/usage2,0/exempt06/02/2027/MainCount5/Fee5000, archivedID03/04และURLคงอยู่, ID05SUB2/ID06SUB3, PublicLocksMAINpause365/SUB1countingถึง07/11/2027ตรงกัน เก็บQAประวัติทั้งหมด ไม่resetfeeหรือลบlog. ภาพ/ใบรับ/รายงาน local-delivery/main-*. UIเพิ่ม010/011รวม11รายการ

8พ.ย. ผู้ดูแลอนุญาตใช้เมจเดิมที่ไม่ล็อกเมื่อclearcurrentในbatchเดียวกัน เพิ่มtest switch/sub/mainkeep/mainretireผ่านและยังrejectlocked/ผู้ใช้อื่น/NPC รวม87/87 buildผ่าน แต่ยังไม่deployหรือทดสอบGoogleออนไลน์เพราะChromeextensionยังไม่เชื่อมต่อ

## รายการทดสอบร่วมทุกฟอร์ม

- ค่าจำเป็น ข้อมูลไม่ตรงชนิด/ยาวเกิน ค่า whitespace สูตรปลอม (`=`) และ HTML ต้องไม่ถูกประมวลผลเป็นโค้ด
- วันที่ dd/MM/yyyy ปี ค.ศ., leap day, ปลายเดือน, ข้ามปี และ timezone Asia/Bangkok
- UID/CharID/สลอตต้องตรงกัน บัญชี/ตัวละครหาย ซ้ำ เก็บประวัติ Slot '-' และสิทธิ์ล็อก
- server ตรวจเอง ไม่เชื่อค่าเก่าจาก browser; unsupported actions ต้องถูกปฏิเสธ
- preview/commit คนละ session, logout, หมดอายุ, password rotation, CORS ผิด
- ข้อมูลเปลี่ยนหลัง preview, สอง preview, commit ซ้ำ, lock ไม่ว่าง, response หายก่อน/หลัง batch และอ่าน receipt เดิม
- อัปเดตหลายชีตพร้อมกัน คงสูตร native/validation/รูปแบบวันที่ ไม่เขียน Player H หรือ Public summaries
- readback ข้อมูลจริงและสูตร/ค่าคำนวณ/Public โดยไม่มีข้อมูลสมาชิกจริงถูกแก้ในการทดสอบ
- ทดสอบ UID/face conflicts กับ Staff/NPC/ตัวละคร/สิทธิ์พักนับ ไม่จำกัดเฉพาะ Player
- เก็บผลที่ผ่าน/ไม่ผ่านและข้อจำกัด; ปัญหา UI ส่งเข้า admin-ui-backlog.md

## หลักฐาน register ล่าสุด

ออนไลน์ 6 พ.ย. 2026: UID503 ถูกปฏิเสธ, วันที่31/02/2026 ถูก client ปฏิเสธ, UID99061101 ลงสำเนาได้, UID99061102 ใช้เฟซเคลมเดิมถูกปฏิเสธ, UID99061101 ใช้เฟซใหม่ถูกปฏิเสธ ตรวจ Users357/Characters406/Player296/log1161 และ Public Player แล้ว (รายละเอียด requestId ใน CODEX_HANDOFF.md)

Local tests ครอบคลุม date/server validation, UID/CharID/face conflicts, อายุ preview, session owner, stale snapshot, lock, retry response loss, ขอบเขต10000 และสูตร/spill แต่ยังไม่แทนการตรวจออนไลน์ของ Google

ทดสอบ stale preview ออนไลน์เพิ่มเติมแล้ว: เปิดสรุป UID99061102/ชื่อ RPTH QA 20261106 B จากนั้นแก้เฉพาะ Note ของแถว QA เดิม log!M1161 เป็นข้อความทดสอบ ระบบปฏิเสธด้วย “ข้อมูลเปลี่ยนหลังเปิดสรุป” คืน Note เดิมและปิดสรุปแล้ว อ่าน log!A1161:M1162 ยืนยันมีเฉพาะแถว QA เดิมและแถว1162 ว่าง ไม่เกิดรายการ B

ยังต้องพิสูจน์ออนไลน์: expired preview, request เดิม retry, สอง session และ failure recovery ภายใต้บริการจริง การกดส่งฟอร์มใหม่ด้วย UID เดิมไม่ใช่ retry commit request เดิม

## เปลี่ยนชื่อ/เฟซเคลม: เงื่อนไขส่งตรวจ

**แก้กติกาล่าสุด:** ต้องเป็นตัวละครที่กำลังใช้งานเท่านั้น เคสออนไลน์ชื่อตัวรองที่ log1165 ทำขณะใช้ MAIN จึงเป็นหลักฐานของข้อผิดพลาดเดิม ไม่ใช่เคสผ่านตามกติกาล่าสุด ต้องทดสอบแทนว่า MAIN→แก้ SUB ถูกปฏิเสธ และเมื่อใช้ SUB แล้วแก้ SUB ได้ แต่แก้ MAIN ไม่ได้ รวมกรณี active flags ซ้ำ/หาย/ไม่ตรง Player ต้องหยุดโดยไม่มีแผนเขียน

แก้แล้วใน commit1e87576 / AppsScript v8: local tests65/65 ครอบคลุม MAIN และ SUB ที่ใช้งานจริง, ปฏิเสธตัวอื่น/flagsซ้ำ/หาย/ไม่ตรงslot และ commit หลังเปลี่ยน active character; reader ตรวจ formula errors ใน Is Active Character/Player Active Character แล้ว ผลออนไลน์: ส่งทั้งชื่อและเมจของ SUB1 จากหน้าเก่าขณะใช้ MAIN ถูกปฏิเสธ ตรวจแถวlog1166ยังว่าง ไม่มี commit ในรอบนี้ ต้อง refresh/login เพื่อโหลด UI ล่าสุด ไม่ถือว่าการแก้ SUB ขณะใช้ MAIN ในหลักฐานเก่าเป็นเคสผ่านอีกต่อไป

- ชื่อ MAIN เปลี่ยน Users/Characters/Player และ append log; ชื่อตัวรองหรือเมจอย่างเดียวเปลี่ยน Characters และ append log
- ชื่อ/เมจใหม่ว่างคงค่าเดิม; ค่าเดิมไม่ถือเป็นการเปลี่ยนจริง Type ต้องตรงสิ่งที่เปลี่ยน คง CharID/Slot/ลิงก์/Active และ flags อื่น
- log เก็บค่าเก่าก่อนแก้ From=To และ AffectsUsage FALSE; ไม่เติมสูตรทับแถวข้อมูลเดิม
- server ปฏิเสธ UID/CharID/สลอตที่ไม่ตรงกัน ตัวเก็บประวัติ และข้อมูลซ้ำ ตรวจ NPC/Staff/locks
- กรณีเปลี่ยนเมจที่สิทธิ์ล็อกเดิมหรือสิทธิ์ล็อกปลายทางเกี่ยวข้อง ถูกปฏิเสธไว้จนพัฒนา flow ยกเลิก/พักนับเสร็จ; กติกายืนยันแล้ว ยังอนุญาตเปลี่ยนชื่อได้
- ใช้ preview/cache/owner/ScriptLock/atomic batch/receipt/readback เดียวกับ register; รองรับ receipt เดิมที่ยังไม่มี action โดยถือเป็น register
- deploy แล้ว: Render commit3ada766 / Apps Script เวอร์ชัน7 (source d990ad2); `/exec` และชีตสำเนาเดิม ไม่มีการแก้ secret/สิทธิ์

### หลักฐานออนไลน์ edit วันที่ 6 พ.ย. 2026

ใช้ UID99061101 เท่านั้น ไม่แก้สมาชิกจริง เพิ่มตัวรอง QA โดยตรงที่ Characters407 เป็น fixture `C-99061101-02`, SUB1, เฟซเคลมว่าง, Active FALSE เพื่อทดสอบแก้ชื่อ (ไม่ใช่หลักฐานว่า flow ลงทะเบียนตัวรองเสร็จแล้ว)

| เคส | requestId | log แถว | ผล |
| --- | --- | --- | --- |
| ชื่อ MAIN อย่างเดียว | 8fc27697-c104-4370-a2f8-19dd0a1f5b4a | 1162 | Characters406/Users357/Player296 เปลี่ยนชื่อ ใบรับผ่าน4ชีต |
| เมจ MAIN อย่างเดียว | aecbf2e0-240b-4477-b524-dc99f8c59982 | 1163 | เปลี่ยน Characters406 + log เท่านั้น ใบรับผ่าน2ชีต |
| ชื่อ+เมจ MAIN | d84a7a52-a522-45a3-b250-24d10ea8f3e9 | 1164 | คืนชื่อ/เมจ QA เดิม ใบรับผ่าน4ชีต |
| ชื่อตัวรอง | 73e6dc9a-61bc-4cf3-bd00-640beba77f23 | 1165 | Characters407 + log เท่านั้น ใบรับผ่าน2ชีต |

อ่านค่าจริง Users/Characters/Player/log/Public Player แล้ว CharID/Slot/ลิงก์/Active เดิมคงอยู่ MAIN1/SUB0/ExemptUntil06/02/2027 คงเดิม log Type ตรงกับการเปลี่ยน From=To และ AffectsUsage FALSE ทุกแถว ทดสอบส่งค่าเดิมซ้ำถูกปฏิเสธ และ Winter (aespa) ถูกปฏิเสธทั้งผู้ใช้งานเดิมและสิทธิ์ล็อก อ่าน log!A1161:M1166 แล้วแถว1166ว่าง ไม่มี log เพิ่มจากเคสผิด

ทดสอบ session เก่าหลัง Render restart ออนไลน์แล้ว: request verify ถูกปฏิเสธ หน้า login แสดงหมดอายุ ก่อนผู้ดูแล login ใหม่ ไม่ได้ทดสอบ password rotation จริงหรือสองเซสชันบนบริการจริง

พบ/แก้ header contract ของ readPreviewTable_ ซึ่งต้องเป็น prefix ต่อเนื่องจากคอลัมน์ A; เพิ่ม wrapper regression test ที่ใช้ reader จริงและตรวจ required formula errors แล้ว `npm test`63/63 (48 tracked +15 tests เก่าเฉพาะเครื่อง) bundle30functions ภาพหลักฐานใน local-delivery/qa-character-edit-20261106.jpg, qa-edit-log-20261106.jpg และ qa-edit-ready-20261106.jpg

Dashboard สาธารณะชี้ข้อมูลเดิมของตัวเอง จึงไม่อ้างว่าข้อมูล QA ในสำเนาขึ้น dashboard หลัก การตรวจสำเนารอบนี้ยืนยันเฉพาะ Public Player ที่เชื่อมสำเนานี้ การทดสอบ rollover ปี2027 ต้องตรวจสูตร native โดยไม่เปลี่ยน header/วันระบบของชีตหลัก

## หลักฐาน NPC / เปลี่ยนเผ่าพันธุ์ 6 พ.ย. 2026

Deploy source61577cb: Render Live26.8s / AppsScript v9 /32functions ทดสอบผ่าน GitHub Pages → Render → สำเนาเดิม ทุกใบรับ verification.ok=true ไม่มี formulaErrors

| เคส | requestId | แถวที่เขียน |
| --- | --- | --- |
| NPC ไม่มีบัญชี ลิงก์ว่าง รหัส a | d98ee3e3-046a-4f25-a710-fb6c89760f22 | NPC49 เท่านั้น |
| NPC มี UID99061121 และลิงก์ | 38f0c6a7-94c2-4245-9aa2-f691150f6e6d | NPC50 เท่านั้น |
| Race QA UID99061101 มนุษย์→แฟรี่ | 14c37dd3-de7a-4c84-934e-c85af464e8e7 | Player296 / log1166 |
| คืน Race QA แฟรี่→มนุษย์ | f6724c94-0fde-4ab0-b1c6-8fb876e0260d | Player296 / log1167 |

- อ่าน PublicNPC49:50 จริงแล้วพบทั้ง UIDตัวอักษร/ตัวเลขและข้อมูล5ช่องตรงกับ NPC ใช้ native FILTER ไม่ได้แก้สูตร Public ใด ๆ
- NPC ซ้ำถูกปฏิเสธด้วย UID/ชื่อและเฟซเคลม ตรวจแถว51ว่าง allocatorเสนอ b สำหรับรายการถัดไปแม้ inputUIDเดิมยังอยู่ในช่องซ่อน แต่ยกเลิกสรุป b โดยไม่บันทึก ตรวจlog1166ว่างหลังเพิ่มNPCทั้งสองก่อนเริ่มrace ไม่สร้างlogสมัครจากNPC
- Race เดิมซ้ำถูกปฏิเสธ ตรวจlog1167ว่างก่อนทำรายการคืนเผ่า จากนั้นอ่านlog1166:1168พบเพียง2รายการจริง Typeเปลี่ยนเผ่าพันธุ์ Noteเก่า>ใหม่ From=To MAIN/AffectsUsageFALSE/Active และแถว1168ว่าง
- อ่าน Playerทั้ง23ช่อง, Characters406:407 และ PublicPlayer9ช่อง ก่อน/หลัง: เปลี่ยนเฉพาะRace คงชื่อ/เมจ/CharID/Slot/Active/ลิงก์/flags/usage/ค่าธรรมเนียม/ExemptUntil คืน QA เป็นมนุษย์แล้ว (MAIN1/SUB0/ExemptUntil06/02/2027)
- UIใหม่ edit และ race เลือกได้เฉพาะ MAIN ที่ใช้อยู่ ไม่แสดง SUB1 ในตัวเลือก (ยังแสดงตัวรองในข้อมูลบัญชีได้ตามปกติ)
- Local tests71/71 รวม56tracked+15เฉพาะเครื่อง ครอบคลุม conflicts/invalid inputs/a–zเต็ม/activeไม่ตรง/สูตร/whitelist/shared receipt/retry ยังไม่อ้างว่าทุกfailure/concurrency caseผ่านบริการGoogleจริง รายการทดสอบร่วมที่เหลือยังต้องทำต่อ
- ภาพ local-delivery/qa-npc-public-20261106.jpg, qa-race-public-20261106.jpg, qa-race-log-20261106.jpg และ qa-npc-race-ready-20261106.jpg

เก็บ NPC QA ทั้งสองไว้เป็นหลักฐาน ไม่ลบข้อมูลสมาชิกหรือเปลี่ยนบัญชีจริง ล้างแบบร่างทดสอบในหน้าadminแล้ว รายการUIเพิ่มในadmin-ui-backlog.md
