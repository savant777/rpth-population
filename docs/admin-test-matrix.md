# แผนทดสอบและส่งตรวจทีละฟอร์ม

เป้าหมายคือพร้อมใช้งานครบ flow ใน admin-flow.md ไม่ใช่เปิดเฉพาะ register ใช้ Google Sheets และสำเนา ID `1jR8P-z62t3I95hNCkBBvzUsSA9kwHsD9w5Lo0jlX2QY` เท่านั้นจนกว่าจะได้รับอนุญาตเปลี่ยนเป้าหมาย

แต่ละฟอร์มต้องผ่าน planner/validation, server auth, preview freshness, atomic commit, retry/idempotency, readback และผลสูตร/Public ที่เกี่ยวข้อง จึงแจ้งผู้ดูแลตรวจ ห้ามถือว่าทดสอบ demo หรือ mock แล้วเท่ากับผ่านออนไลน์

| ลำดับ | ฟอร์ม | สถานะ |
| --- | --- | --- |
| 1 | ลงทะเบียนผู้เล่นใหม่ | ออนไลน์สำเร็จและกรณี validation บางส่วนแล้ว; robustness ยังไม่ครบ |
| 2 | เปลี่ยนชื่อ/เฟซเคลม | deploy/ทดสอบออนไลน์กรณีปกติแล้ว พร้อมให้ตรวจ; การเชื่อมล็อกยังรอขั้น6 |
| 3 | เพิ่ม NPC / เปลี่ยนเผ่าพันธุ์ | deploy และทดสอบออนไลน์แล้ว พร้อมให้ผู้ดูแลตรวจบนสำเนา |
| 4 | เพิ่มตัวรอง / สลับตัวละคร | มี demo model; ต้องพัฒนา server และเชื่อมเหตุการณ์ล็อก |
| 5 | เปลี่ยน MAIN | มี demo model; กติกาลิงก์/สิทธิ์พิเศษยืนยันแล้ว ต้องพัฒนา server |
| 6 | ล็อก/ต่ออายุ/พักนับ/นับต่อ | มี demo model; พบ Type native แล้ว ต้องตรวจสูตรและพัฒนา server |
| 7 | Reclaim ผ่าน/ไม่ผ่าน | มี demo model; ยังไม่มี live server flow |
| 8 | Inactive หลายคน | มี demo model; flags/ยกเลิกล็อกยืนยันแล้ว ต้องพัฒนา server |

กติกาทั้งหกข้อได้รับคำตอบแล้วในแชต 6 พ.ย. และแก้ admin-flow.md ตามนั้น คำว่า “ค้าง” ในตารางหมายถึงการพัฒนา/ทดสอบที่ยังไม่เสร็จ ไม่ต้องถามผู้ดูแลซ้ำเรื่อง flags, โควตาพิเศษ, ลิงก์ MAIN, ต่อหลังหมดอายุ และการยกเลิกจากเปลี่ยนเมจที่พักนับ

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
