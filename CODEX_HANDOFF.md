# ส่งมอบงานให้ Codex อีกเครื่อง

อัปเดต 6 พฤศจิกายน 2026 (Asia/Bangkok) ผู้ดูแลพักแล้ว ให้ใช้เอกสารนี้ทำงานต่อโดยไม่ต้องให้ผู้ดูแลเล่าประวัติใหม่

## เริ่มที่นี่

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

- **เขียนได้เฉพาะ register บนชีตสำเนา** ไม่ได้เปิดชีตหลัก และเมนูอื่นยังเป็นโมเดลทดลอง ยังไม่มี backend สำหรับ flow เหล่านั้น
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

Source ทั้ง 4 ไฟล์ถูกวางรวมใน **Code.gs ไฟล์เดียว** ใน Apps Script โปรเจกต์ที่ผู้ดูแลใช้อยู่ อย่าสั่งให้เพิ่ม source แยกซ้ำอีก ต้องเหลือ Code.gs และ manifest (อาจมี DiagnoseGateway แยกเพื่อ debug ได้)

ผลตรวจรอบส่งมอบนี้: Node v22.17.0, `npm test` ผ่าน 36/36 รายการ, `npm run build:apps-script` สำเร็จ ตรวจ syntax ของ Code.gs และชื่อฟังก์ชันไม่ซ้ำครบ 27 ฟังก์ชัน ไม่มีการเขียนชีตหรือ redeploy บริการออนไลน์ระหว่างจัดส่งมอบ

อัปเดต Apps Script: แทนที่ Code.gs จาก bundle → บันทึก → Deploy / Manage deployments → Edit → New version → Deploy เพื่อคง /exec URL เดิม **รักษา Script Properties เดิม ไม่สร้าง secret ใหม่โดยไม่จำเป็น**

Source บน Git กับ deployment บน Apps Script แยกกัน push Git ไม่ได้ทำให้ Apps Script อัปเดตเอง เช่นเดียวกับ Render ที่ `autoDeployTrigger: off` ต้อง Manual Deploy latest commit เมื่อ backend เปลี่ยน ส่วนการแก้ Apps Script อย่างเดียวไม่ต้อง redeploy Render

`npm run dev` เป็น local server 127.0.0.1:4173 หาก admin-config.js ยังชี้ Render จะเป็น live mode ไปยัง backend จริงและ CORS ไม่อนุญาต localhost ต้องเปลี่ยน apiBase เป็นค่าว่างเฉพาะเครื่องก่อนทดสอบ local auth และ **อย่า push การเปลี่ยน URL ชั่วคราวนั้น** หรือใช้ API tests เพื่อทดสอบ backend โดยไม่แก้ config

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

- ตรวจ tests ปัจจุบัน แล้วเพิ่ม integration/contract coverage ที่ยังขาด โดยไม่เขียนข้อมูลผู้ใช้จริง
- ทดสอบบนสำเนาผ่านเส้นทางออนไลน์: UID ซ้ำ/เฟซเคลมซ้ำ/CharID ที่เคยใช้, วันที่ผิดและข้ามเดือน, preview เก่า, กดยืนยันซ้ำ, สองแท็บ/สองเซสชัน, response หายก่อน/หลัง batch, logout/หมดอายุ/เปลี่ยนรหัส
- Tests จำลอง API ไม่ได้พิสูจน์บริการ Google จริง ผู้ดูแลทดสอบเฉพาะกรณีสำเร็จออนไลน์แล้ว อย่าอ้างว่ากรณีผิดพลาดทั้งหมดผ่าน production integration
- ตรวจผล Public/dashboard และค่าคำนวณแถวใหม่เพิ่มเติม ไม่ใช้เพียงสูตรมีอยู่และไม่ขึ้น error เป็นหลักฐานว่าทุกผลคำนวณถูกต้อง
- ตรวจ target row และ formula coverage ถึง 10,000 แถว, แถวที่มี checkbox FALSE แต่ไม่มี UID, header ปี 2026 และการเปลี่ยนปี 2027 มีผลต่อการต่อระบบอย่างไร
- ก่อนใช้ชีตหลัก: ต้องได้รับคำสั่งยืนยันเป้าหมาย สำรองข้อมูล/สูตร และทดสอบวิธีกู้คืนกับสำเนา ไม่ย้ายเป้าหมายเอง

### B. ทำ flow อื่นครบฝั่ง server

ลำดับเสนอ: เปลี่ยนชื่อ/เมจ → เพิ่ม NPC/เปลี่ยนเผ่าพันธุ์ → เพิ่มตัวรอง/สลับ → เปลี่ยน MAIN → ล็อก/ต่ออายุ/พักนับ/นับต่อ → Reclaim → Inactive หลายคน ปรับลำดับได้แต่ต้องรักษากติกาใน admin-flow.md

ทุก flow ต้องมี preview แยกจาก commit ตรวจสิทธิ์และข้อมูลใหม่ที่ server รักษา native formulas แสดงผลแยกชีตก่อนยืนยัน ป้องกัน request ซ้ำและมี receipt อ่านผลกลับให้ครบ เมนูที่ server ยังไม่รองรับต้องไม่เปิดให้เขียนจริง

### C. รวมคำถามธุรกิจที่ค้างเป็นชุดเดียว

- ค่า Post Check / Activity Check / Reclaim Approved ตอนปรับ Inactive และสิทธิ์ล็อกที่เกี่ยวข้อง
- Type สำหรับกลับมานับต่อ/ยกเลิกที่สูตรล่าสุดรองรับ ต้องอ่าน native/validation ไม่อิงชื่อในเอกสารสูตรเก่าอย่างเดียว
- ต่ออายุหลังหมดอายุใช้ LockID/วันเริ่มอย่างไร
- สิทธิ์เพิ่มตัวรองพิเศษเก็บไว้ที่ใด
- ลิงก์ประวัติเมื่อเปลี่ยน MAIN จัดการอย่างไร
- เริ่มล็อกเมจที่ใช้อยู่วันเดียวกันอย่างไร และกรณีตัวที่พักนับเปลี่ยนไปใช้เมจอื่น

มีข้อมูลบางส่วนใน docs/reference/ ที่ดูเหมือนข้อสรุปแต่เก่ากว่าเอกสาร flow ห้ามนำมาฟันธงแทนผู้ดูแล

### D. ทำให้ส่งมอบ/อัปเดตง่าย

- ใช้ builder ที่มีแล้วเป็นฐาน ประเมินการ sync/version/deploy Apps Script แบบคำสั่งเดียวหรือ workflow ที่ปลอดภัย เช่น clasp โดยต้องไม่นำ credentials/token ขึ้น Git และไม่สั่งผู้ดูแลทำ setup ก่อนเตรียมโค้ด/ข้อจำกัดให้ชัด
- จัด local development ให้ไม่ต้องแก้ public config สลับไปมา โดยรักษา CORS/สิทธิ์ live ไว้
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
