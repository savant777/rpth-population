# GitHub Pages + Render + Apps Script (ชีตสำเนาเท่านั้น)

อัปเดต 6 พฤศจิกายน 2026: ผู้ดูแลติดตั้งแล้วและยืนยัน login/โหลดข้อมูล/ลงทะเบียนใหม่ครบ 4 ชีตผ่าน GitHub Pages → Render → Apps Script → ชีตสำเนา ผลตรวจอ่านกลับผ่าน ยังไม่ทดสอบกรณีผิดพลาดออนไลน์ครบหรือเปิดเมนูอื่น/ชีตหลัก ดูสถานะและงานค้างใน [CODEX_HANDOFF.md](../CODEX_HANDOFF.md)

## 1. Apps Script

ใช้โปรเจกต์ที่ผูกกับชีตสำเนาเดิม ห้ามสร้างในชีตหลัก รัน `npm run build:apps-script` จะได้ Code.gs รวมและ manifest ใน local-delivery/ ที่ไม่ขึ้น Git

- Code.gs: วางทั้งหมดจาก local-delivery/Code.gs ที่ build จาก source ใน apps-script/
- ลบ RegistrationPreview / RegistrationWriteTest / WebGateway แยกเดิมถ้ามี เพื่อไม่ให้ฟังก์ชันซ้ำกับไฟล์รวม
- appsscript.json: ใช้ local-delivery/appsscript.json ที่มี Sheets v4 และสิทธิ์ spreadsheets / script.container.ui
- อัปเดตโปรเจกต์เดิมผ่าน Manage deployments → Edit → New version → Deploy เพื่อคง URL เดิมและ Script Properties

Run `setupGatewaySecret` แล้วกลับหน้า Sheets คัดลอกกุญแจเก็บไว้เฉพาะเครื่อง ไม่นำมาใส่ใน Git/แชต สคริปต์เก็บค่าไว้ใน Script Properties ชื่อ RPTH_GATEWAY_SECRET ให้อัตโนมัติ การรันซ้ำแสดงค่าเดิม ไม่หมุนกุญแจโดยไม่ตั้งใจ

เฉพาะติดตั้งโปรเจกต์ใหม่: Deploy → New deployment → Web app → Execute as Me → Who has access Anyone → Deploy เก็บ Web app URL ที่ลงท้าย /exec เพื่อใส่ใน Render URL นี้รับคำสั่งทะเบียนผ่าน POST ที่มี HMAC ถูกต้อง ไม่เชื่อถือข้อมูลจาก browser โดยตรง doGet แสดงสถานะบริการอย่างเดียว ไม่คืนทะเบียน สำหรับโปรเจกต์ปัจจุบันให้ใช้ deployment/secret เดิม

ถ้า deployment ถูกจำกัดโดย Google Workspace ต้องให้ผู้ดูแลบัญชีตรวจนโยบาย ไม่เปลี่ยนชีตเป็น public เพื่อแก้ปัญหา

## 2. Render

บริการปัจจุบันคือ https://rpth-admin-test.onrender.com ตั้งค่าแล้ว หากต้องติดตั้งใหม่ใช้ Blueprint จาก render.yaml หรือสร้าง Web Service:

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

รัน local ด้วย `npm run dev` แล้วเปิด `http://127.0.0.1:4173/admin.html` ได้โดยไม่ต้องแก้ admin-config.js: dev server ส่ง config ที่ใช้ API origin เดียวกันเฉพาะตอนเสิร์ฟไฟล์ ส่วนไฟล์จริงสำหรับ GitHub Pages ยังคงชี้ Render ไม่มีการเพิ่ม localhost เข้า CORS ของ Render ตั้ง `RPTH_ADMIN_PASSWORD_HASH` ใน environment ของ terminal ก่อนเริ่ม server; หากไม่ตั้ง gateway environment จะเป็น local-demo หากตั้ง URL/secret ของ gateway จะเชื่อมชีตสำเนาเดิมผ่าน server ฝั่ง local (ไม่ตั้ง NODE_ENV=production สำหรับ dev) ไม่ใส่ค่าลับในไฟล์ frontend

- Live UI เปิด register / edit / npc / race; flow อื่นยังถูกปฏิเสธฝั่ง Node และ Apps Script ฟอร์ม edit กรณีเปลี่ยนเมจที่เกี่ยวกับสิทธิ์ล็อกยังปิดไว้จนเชื่อมเหตุการณ์ยกเลิก/พักนับครบ
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

Tests อยู่ใน tests/ และขึ้น Git แล้ว รวม login/หมดอายุ/logout, CORS, สิทธิ์ gateway ทุกคำสั่ง, ลายเซ็น UTF-8/nonce ซ้ำ/เวลาเก่า, bootstrap ที่ไม่อ่าน Users Status เกินความจำเป็น, แผน/สูตร/receipt และ response หาย ผู้ดูแลทดสอบเส้นทางออนไลน์กรณีสำเร็จครบแล้ว แต่ยังต้องทดสอบกรณีผิดพลาดออนไลน์ก่อนเปิดใช้งานจริง ดูรายการใน CODEX_HANDOFF.md

อ้างอิง: [Render Web Services](https://render.com/docs/web-services), [Render environment variables](https://render.com/docs/configure-environment-variables), [Apps Script web apps](https://developers.google.com/apps-script/guides/web)
