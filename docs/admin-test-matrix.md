# แผนทดสอบและส่งตรวจทีละฟอร์ม

เป้าหมายคือพร้อมใช้งานครบ flow ใน admin-flow.md ไม่ใช่เปิดเฉพาะ register ใช้ Google Sheets และสำเนา ID `1jR8P-z62t3I95hNCkBBvzUsSA9kwHsD9w5Lo0jlX2QY` เท่านั้นจนกว่าจะได้รับอนุญาตเปลี่ยนเป้าหมาย

แต่ละฟอร์มต้องผ่าน planner/validation, server auth, preview freshness, atomic commit, retry/idempotency, readback และผลสูตร/Public ที่เกี่ยวข้อง จึงแจ้งผู้ดูแลตรวจ ห้ามถือว่าทดสอบ demo หรือ mock แล้วเท่ากับผ่านออนไลน์

| ลำดับ | ฟอร์ม | สถานะ |
| --- | --- | --- |
| 1 | ลงทะเบียนผู้เล่นใหม่ | ออนไลน์สำเร็จและกรณี validation บางส่วนแล้ว; robustness ยังไม่ครบ |
| 2 | เปลี่ยนชื่อ/เฟซเคลม | เพิ่ม server planner/transaction และ tests แล้ว; รอ deploy และทดสอบออนไลน์ |
| 3 | เพิ่ม NPC / เปลี่ยนเผ่าพันธุ์ | มี demo model; ยังไม่มี live server flow |
| 4 | เพิ่มตัวรอง / สลับตัวละคร | มี demo model; ต้องตรวจล็อกและกติกาค้างก่อนเปิดจริง |
| 5 | เปลี่ยน MAIN | มี demo model; ต้องยืนยันกติกาลิงก์/สิทธิ์พิเศษ |
| 6 | ล็อก/ต่ออายุ/พักนับ/นับต่อ | มี demo model; Type native และกติกาบางข้อยังค้าง |
| 7 | Reclaim ผ่าน/ไม่ผ่าน | มี demo model; ยังไม่มี live server flow |
| 8 | Inactive หลายคน | มี demo model; ค่า flags/สิทธิ์ล็อกยังค้าง |

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

- ชื่อ MAIN เปลี่ยน Users/Characters/Player และ append log; ชื่อตัวรองหรือเมจอย่างเดียวเปลี่ยน Characters และ append log
- ชื่อ/เมจใหม่ว่างคงค่าเดิม; ค่าเดิมไม่ถือเป็นการเปลี่ยนจริง Type ต้องตรงสิ่งที่เปลี่ยน คง CharID/Slot/ลิงก์/Active และ flags อื่น
- log เก็บค่าเก่าก่อนแก้ From=To และ AffectsUsage FALSE; ไม่เติมสูตรทับแถวข้อมูลเดิม
- server ปฏิเสธ UID/CharID/สลอตที่ไม่ตรงกัน ตัวเก็บประวัติ และข้อมูลซ้ำ ตรวจ NPC/Staff/locks
- กรณีเปลี่ยนเมจที่สิทธิ์ล็อกเดิมหรือสิทธิ์ล็อกปลายทางเกี่ยวข้อง ถูกปฏิเสธไว้จนยืนยันกติกา/flow พักนับ; ยังอนุญาตเปลี่ยนชื่อได้ ไม่ยกเลิก/พักนับสิทธิ์เอง
- ใช้ preview/cache/owner/ScriptLock/atomic batch/receipt/readback เดียวกับ register; รองรับ receipt เดิมที่ยังไม่มี action โดยถือเป็น register
- ต้อง deploy ทั้ง backend Node และ Apps Script bundle ก่อนเห็นเมนู edit บน hosted UI; ไม่ถือว่าผ่านออนไลน์จาก unit tests

Dashboard สาธารณะชี้ข้อมูลเดิมของตัวเอง จึงไม่อ้างว่าข้อมูล QA ในสำเนาขึ้น dashboard หลัก การตรวจสำเนารอบนี้ยืนยันเฉพาะ Public Player ที่เชื่อมสำเนานี้ การทดสอบ rollover ปี2027 ต้องตรวจสูตร native โดยไม่เปลี่ยน header/วันระบบของชีตหลัก
