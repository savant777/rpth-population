# ระบบ admin และแผนเชื่อม Apps Script

อัปเดต 5 พฤศจิกายน 2026 กติกางานทั้งหมดอยู่ใน [admin-flow.md](admin-flow.md) วิธีติดตั้งอยู่ใน [render-setup.md](render-setup.md)

## สถานะที่ยืนยันแล้ว

ผู้ดูแลทดสอบลงทะเบียนผู้เล่นใหม่ผ่าน bound Apps Script ในชีตสำเนา เพิ่ม Users / Characters / Player / log ลงทะเบียนตัวละคร ครบ 4 ชีต ผลตรวจ UID, CharID, สูตรและผล spill ผ่าน และผู้ดูแลตรวจ Exempt Until = วันสมัคร + 3 เดือนปฏิทิน กับ MAIN 1 วัน / SUB 0 ในวันสมัครแล้ว

ผู้ดูแล deploy WebGateway แล้ว และยืนยัน login/อ่านข้อมูล/ลงทะเบียนใหม่ผ่าน GitHub Pages → Render → Apps Script → สำเนาครบ 4 ชีต ผลตรวจอ่านกลับผ่าน ดูหลักฐานและงานค้างล่าสุดใน [CODEX_HANDOFF.md](../CODEX_HANDOFF.md)

อัปเดต 6 พ.ย.: เพิ่มฟอร์ม edit ผ่านเส้นทางออนไลน์แล้วทั้งชื่อ MAIN, เมจอย่างเดียว, ชื่อพร้อมเมจ และชื่อตัวรอง พร้อมปฏิเสธค่าซ้ำเดิมและเมจที่มีสิทธิ์ล็อก รายละเอียดใน docs/admin-test-matrix.md ยังไม่เปิด flow อื่นหรือเปลี่ยนเป้าหมายเป็นชีตหลัก และกรณี edit ที่ต้องยกเลิก/พักนับสิทธิ์ยังรอเชื่อม flow ล็อก

## ไฟล์ที่ใช้

| ส่วน | ไฟล์ | หน้าที่ |
| --- | --- | --- |
| หน้าเว็บ | admin.html / admin.css / admin.js | ฟอร์ม สรุป และยืนยัน |
| หน้าเว็บ | admin-model.js | โมเดลทดลองเดิม ไม่ใช้ตัดสินคำสั่งเขียนจริง |
| หน้าเว็บ | admin-login.js | Login และเรียก API |
| หน้าเว็บ | admin-config.js | เก็บ URL Render สาธารณะเท่านั้น |
| Render | server.mjs | ตรวจ origin/session และรับ API |
| Render | admin-auth.mjs | scrypt hash, session, rate limit |
| Render | admin-gateway.mjs | ส่งคำขอและตรวจคำตอบที่ลงลายเซ็น |
| Render | package.json / render.yaml | เปิดโปรเซสและตั้งค่าบริการ |
| Apps Script | apps-script/InspectCopy.gs | ตรวจ ID สำเนาและ schema; วางเป็น Code.gs |
| Apps Script | apps-script/RegistrationPreview.gs | อ่านข้อมูลสดและตรวจ flow ลงทะเบียนใหม่ |
| Apps Script | apps-script/RegistrationWriteTest.gs | เตรียม token, ตรวจสรุป, batch write และ receipt |
| Apps Script | apps-script/WebGateway.gs | รับ POST ที่ลงลายเซ็นและอ่าน bootstrap |
| Apps Script | apps-script/appsscript.json | เขตเวลา, Sheets v4 และ OAuth scopes |
| ตั้งรหัส | tools/hash-admin-password.mjs | สร้าง hash ในเครื่อง ไม่ใช่ส่วนที่รันบนหน้าเว็บ |

ไฟล์ Apps Script ยังแยกหน้าที่และเรียกใช้กันอยู่ ต้องติดตั้งครบ ไม่ใช่ไฟล์ทดลองที่ลบออกได้ทั้งหมด ไม่มีรหัสจริงหรือ gateway secret อยู่ในไฟล์เหล่านี้

## การตรวจสิทธิ์และข้อมูล

1. หน้าเว็บใช้บัญชีร่วม Admin บัญชีเดียวกับรหัสกลางไป Render ผ่าน HTTPS ตรวจ scrypt hash ฝั่ง server ไม่เก็บรหัสจริงใน frontend/Git ไม่เลือกชื่อบุคคลในทีม
2. Hosted mode ใช้ bearer token ใน memory ของ browser อายุสูงสุด 8 ชั่วโมง ต้อง login ใหม่เมื่อ reload; local demo ใช้ HttpOnly cookie แบบ same-origin
3. Render ตรวจ session ทุกคำสั่ง bootstrap / preview / commit ตรวจ exact Origin ที่อนุญาตและใช้ JSON ไม่ใช้ cookie ข้ามไซต์
4. Render ลงลายเซ็น HMAC-SHA256 ด้วย secret จาก environment ส่ง nonce, เวลา, บัญชี Admin และ owner hash ของเซสชันไป Apps Script; Apps Script ตรวจลายเซ็นและอายุคำขอก่อนอ่านข้อมูล owner hash ใช้ตรวจสิทธิ์คำขอ ไม่ใช่ชื่อบุคคล
5. อ่าน/สรุป/บันทึกจำกัดเฉพาะ spreadsheet ID ของสำเนาที่ตกลง ทุกคำสั่งเขียนคำนวณจากข้อมูลสดฝั่ง Apps Script ไม่รับ patches จาก browser ไปเขียนทันที
6. Live mode เปิด register และ edit งานอื่นถูกปฏิเสธทั้ง Render และ Apps Script ไม่มี fallback เป็นโมเดลทดลองเมื่อ API ล้มเหลว

## การยืนยันบันทึก

Preview token เก็บ input/เจ้าของคำขอ/ชื่อผู้ดำเนินการ/fingerprint อายุ 10 นาที ก่อน commit ตรวจข้อมูลซ้ำภายใต้ ScriptLock เดียวกันทั้ง bound dialog และ gateway จัดสรรแถวใหม่หลังข้อมูลในขอบตารางที่กำหนด ไม่อิง notes ด้านขวา และตรวจ UID/CharID ที่เคยใช้อีกครั้ง

คำขอเดียวเขียนทั้ง 4 แถว สูตร รูปแบบ validation และ receipt ใน developer metadata ด้วย Sheets batchUpdate ซึ่งประมวลผลแบบ atomic ตาม [เอกสาร Google](https://developers.google.com/workspace/sheets/api/guides/batch) metadataId คงที่ต่อ request ใช้ป้องกันการประมวลผลคำขอซ้ำ เมื่อ response หายให้ส่ง requestId/previewToken เดิม การใช้เลขโพสต์อย่างเดียวไม่ใช่คีย์กันซ้ำ

หลังเขียนอ่านกลับเพื่อตรวจ UID/CharID/สูตร/ผล spill และ errors หากเขียนสำเร็จแต่ตรวจกลับไม่ได้ ต้องแจ้งว่าเขียนแล้ว ไม่สร้างรายการใหม่เพื่อแก้ปัญหา ScriptLock ไม่ครอบคลุมการแก้ด้วยมือหรือสคริปต์ต่างโปรเจกต์

## วันที่และสูตร

- หน้าจอ dd/MM/yyyy ปี ค.ศ. → API ISO YYYY-MM-DD → วันที่ในชีตจริงรูปแบบ dd/MM/yyyy เขตเวลา Asia/Bangkok
- ใช้สูตร native จากชีต ไม่ใช้ DUMMYFUNCTION จาก Excel export
- Player สูตรรายแถว: D / F / G / I / J / L / P / Q / S / T / U / V; G ให้ผลลัพธ์ G:H ห้ามเติมสูตรหรือเขียน H แยก
- Users D และ log ลงทะเบียนตัวละคร L เป็นสูตร ห้ามใส่ Status คงที่ทับ
- UID/เลขโพสต์เป็นตัวเลขไม่เกิน 15 หลัก ข้อความเขียนเป็น stringValue และ checkbox เป็น boolValue

## งานถัดไป

1. ตั้งค่า Render environment และ password hash โดยผู้ดูแล ไม่ส่ง secrets มาในแชต
2. ตั้ง apiBase เป็น Render URL แล้วทดสอบ login → bootstrap → preview → commit จาก GitHub Pages บนชีตสำเนา
3. ทดสอบข้อมูลซ้ำ สรุปเก่า ส่งคำขอซ้ำ และเครือข่ายขาดในเส้นทางออนไลน์
4. ต่อ flow อื่นตามลำดับใน admin-flow.md โดยยืนยันกติกาที่ยังค้างก่อนเขียนจริง เช่น Type นับต่อ/ยกเลิกล็อก ช่องตรวจ Inactive โควตาพิเศษ และลิงก์เมื่อเปลี่ยน MAIN

Tests และเครื่องมือตรวจ XLSX ถูกเก็บขึ้น Git ในรอบส่งมอบ เพื่อให้เครื่องใหม่ตรวจงานได้ Source Apps Script สร้างเป็น Code.gs รวมด้วย `npm run build:apps-script` ผล build ใน local-delivery/ ไม่ขึ้น Git Tests จำลองไม่แทนการทดสอบกรณีผิดพลาดบน Render + Apps Script จริง
