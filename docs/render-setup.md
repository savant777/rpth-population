# GitHub Pages + Render + Apps Script (ชีตสำเนาเท่านั้น)

โค้ดพร้อมติดตั้ง แต่ยังไม่ได้ push/deploy และยังไม่มีผลทดสอบเส้นทางออนไลน์ครบวงจร หน้า admin สาธารณะที่ไม่มี apiBase ยังคงเป็น demo ไม่เขียนชีต

## 1. Apps Script

ใช้โปรเจกต์ที่ผูกกับชีตสำเนาเดิม ห้ามสร้างในชีตหลัก

- Code.gs: ใช้ InspectCopy เดิม
- RegistrationPreview.gs: วางไฟล์เวอร์ชันล่าสุด
- RegistrationWriteTest.gs: วางไฟล์เวอร์ชันล่าสุด
- เพิ่ม Script ชื่อ WebGateway แล้ววาง WebGateway.gs
- appsscript.json: ใช้ไฟล์เดิมที่มี Sheets v4 และสิทธิ์ spreadsheets / script.container.ui

Run `setupGatewaySecret` แล้วกลับหน้า Sheets คัดลอกกุญแจเก็บไว้เฉพาะเครื่อง ไม่นำมาใส่ใน Git/แชต สคริปต์เก็บค่าไว้ใน Script Properties ชื่อ RPTH_GATEWAY_SECRET ให้อัตโนมัติ การรันซ้ำแสดงค่าเดิม ไม่หมุนกุญแจโดยไม่ตั้งใจ

Deploy → New deployment → Web app → Execute as Me → Who has access Anyone → Deploy เก็บ Web app URL ที่ลงท้าย /exec เพื่อใส่ใน Render URL นี้เป็น endpoint ที่รับได้เฉพาะ POST ที่มี HMAC ถูกต้อง ไม่ใช่ API ที่เชื่อถือข้อมูลจาก browser โดยตรง doGet แสดงสถานะบริการอย่างเดียว ไม่คืนทะเบียน

ถ้า deployment ถูกจำกัดโดย Google Workspace ต้องให้ผู้ดูแลบัญชีตรวจนโยบาย ไม่เปลี่ยนชีตเป็น public เพื่อแก้ปัญหา

## 2. Render

หลังนำ source code ขึ้น Git แล้ว ใช้ Blueprint จาก render.yaml หรือสร้าง Web Service:

- Runtime Node, Build `node --check server.mjs`, Start `node server.mjs`
- Health `/health`, จำนวน instance 1; โค้ดอ่าน PORT และ bind 0.0.0.0 เมื่อ NODE_ENV=production
- ไม่ต้องติดตั้ง npm dependencies เพิ่ม

Environment:

| ชื่อ | ค่า |
| --- | --- |
| NODE_ENV | production |
| RPTH_APP_ORIGIN | https://savant777.github.io (ไม่มี /rpth-population ต่อท้าย เพราะเป็น origin) |
| RPTH_APPS_SCRIPT_URL | Web app URL /exec ที่ได้จากขั้นแรก |
| RPTH_GATEWAY_SECRET | กุญแจที่ setupGatewaySecret แสดง ใช้ค่าเดียวกับ Script Properties |
| RPTH_ADMIN_PASSWORD_HASH | รัน node tools/hash-admin-password.mjs ใน terminal ของเครื่อง กรอกรหัสทีมแบบซ่อน แล้วใช้ค่า scrypt$… ที่ได้ |

อย่าส่งรหัสทีม/กุญแจมาในแชต อย่าวาง secrets ใน render.yaml หรือ frontend การเปลี่ยน password hash ต้อง redeploy/restart backend เพื่อยกเลิก sessions เดิม

render.yaml เตรียม plan free ไว้ ผู้ดูแลตรวจแผนบริการที่ Render แสดงก่อนยืนยัน ไม่มีการซื้อบริการให้หรือยืนยันราคาไว้ในโค้ด

## 3. GitHub Pages

เมื่อ Render ให้ URL HTTPS แล้ว เปลี่ยน `apiBase` ใน admin-config.js เป็น URL นั้น เช่น `https://ชื่อบริการ.onrender.com` ไม่มี /api/admin ต่อท้าย ไฟล์นี้เก็บเพียง URL สาธารณะ ห้ามใส่ hash, secret หรือ Apps Script URL

push ไฟล์หน้าเว็บแล้วเปิด admin.html จาก GitHub Pages หน้า login จะตรวจรหัสที่ Render และโหลด bootstrap จากชีตสำเนา ผ่าน backend ที่ตรวจ session ทุกคำสั่ง

## ขอบเขตที่ทำแล้ว

- Live UI เปิดเฉพาะ register; preview/commit ของ flow อื่นถูกปฏิเสธฝั่ง Node และ Apps Script
- Live mode ไม่มี fallback ไป sample/model ฝั่ง client ถ้า API ล้มเหลว
- Node ออก opaque bearer token 32 bytes อายุ 8 ชั่วโมง เก็บ digest ใน memory; browser เก็บ token ในตัวแปร memory เท่านั้น ไม่ใช้ localStorage/sessionStorage หรือ cookie ข้ามไซต์ จึงต้อง login ใหม่เมื่อ reload หน้า
- Local demo ยังคง cookie HttpOnly / SameSite=Strict เช่นเดิม
- CORS อนุญาต exact HTTPS origin ที่ตั้งไว้ ไม่มี wildcard และไม่มี Access-Control-Allow-Credentials ไม่ใช้ cookie เป็นสิทธิ์ใน hosted mode ทุก mutation ต้องมี Origin ที่อนุญาตและ JSON
- รหัสทีมตรวจด้วย scrypt และมี rate limit; sessions/rate limit อยู่ใน memory โปรเซสเดียว จึงกำหนด 1 instance และยังไม่ได้รองรับหลาย instance
- backend ส่ง payload ลงลายเซ็น HMAC-SHA256 พร้อม nonce/time/session-owner hash/operator ไป Apps Script รับเฉพาะคำขออายุไม่เกิน 2 นาที ป้องกัน replay ด้วย ScriptCache/ScriptLock และตรวจลายเซ็นตอบกลับใน Node
- secret gateway ไม่ใช่ password ทีม ไม่ส่งให้ browser การขโมย secret นี้เทียบเท่าสิทธิ์ backend จึงเก็บแค่ Render environment/Script Properties
- bound dialog และ gateway ใช้ ScriptLock เดียวกันแล้ว เพื่อกันคำขอในโปรเจกต์เดียวกันชนกัน ไม่ครอบคลุมการแก้ชีตด้วยมือหรือสคริปต์โปรเจกต์อื่น
- Apps Script เปิดเฉพาะ spreadsheet ID สำเนาที่กำหนด การเปลี่ยนเป็นชีตหลักยังไม่ได้ทำหรืออนุญาตในขั้นนี้
- Cached preview ผูกกับ session-owner; commit ตรวจเจ้าของ, อายุ, ข้อมูลล่าสุดและ receipt ก่อนทำ batch เดียว ทุกข้อความลงชีตเป็น stringValue ไม่ตีความเป็นสูตร
- รายการใหม่ใช้ชื่อบัญชี Admin จาก session ฝั่ง Node ไม่รับชื่อบุคคลจาก form

## หลักฐานและสิ่งที่ยังต้องทดสอบ

ผู้ดูแลยืนยันการบันทึก bound dialog ครบ 4 ชีตและ verification.ok=true แล้ว และตรวจ Exempt Until = วันที่สมัคร +3 เดือนปฏิทิน กับ MAIN 1 วัน / SUB 0 ในวันสมัคร ถูกต้อง

ชุดทดสอบ Node ผ่าน 34 รายการ ณ รอบเชื่อม gateway รวม login/หมดอายุ/logout, CORS, ตรวจสิทธิ์ก่อน gateway ทุกคำสั่ง, ปฏิเสธลายเซ็นผิด/nonce ซ้ำ/เวลาเก่า, แผน/สูตร/receipt และกรณี response หาย ยังไม่ได้ทดสอบจริงผ่าน Render + deployed Apps Script + GitHub Pages ต้องทดลองเส้นทางนี้กับชีตสำเนาก่อนเปิดให้ทีมใช้

อ้างอิง: [Render Web Services](https://render.com/docs/web-services), [Render environment variables](https://render.com/docs/configure-environment-variables), [Apps Script web apps](https://developers.google.com/apps-script/guides/web)
