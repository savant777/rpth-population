# ไฟล์ต้นแบบและแผนเชื่อม Apps Script

สถานะ 5 พฤศจิกายน 2026: ทำ UI และโมเดลสรุปแบบทดลองแล้ว ยังไม่มีโค้ด Apps Script, การตรวจสิทธิ์จริง หรือการเขียน Google Sheets

ข้อสรุปเรื่อง login: เตรียมภายหลัง ใช้ชื่อผู้ดำเนินการที่กำหนด (เช่น Regina / Saviour / Esther) กับรหัสกลางของทีม ชื่อในประวัติเป็นชื่อที่ผู้เข้าใช้ระบุ โดยทีมแจ้งงานกันในห้องร่วมอยู่แล้ว ไม่ถือเป็นการยืนยันตัวบุคคลแบบบัญชีแยกรหัส ต้องตรวจรหัสและเซสชันฝั่งเซิร์ฟเวอร์ทุกครั้งที่อ่าน/บันทึก เก็บ password hash ด้วยวิธีสำหรับรหัสผ่านโดยเฉพาะ จำกัดการลองรหัส และยกเลิกเซสชันเมื่อเปลี่ยนรหัสกลาง ห้ามเก็บรหัสจริงใน frontend หรือ Git รอบนี้ยังไม่สร้างหน้า login หรือเก็บรหัสใด ๆ

## ไฟล์ที่รวมใน commit รอบ UI

| ไฟล์ | หน้าที่ |
| --- | --- |
| admin.html | หน้าแบบการ์ดเดียว เมนูเลือกงาน หน้าต่างสรุปและประวัติ |
| admin.css | ธีมขาวดำ/ทอง responsive, subgrid และ Material Symbols |
| admin.js | ฟอร์มตามประเภทงาน วัน/เดือน/ปี ปฏิทิน แบบร่าง และประวัติทดลอง |
| admin-model.js | ตรวจข้อมูลและสร้างรายการที่ต้องแก้แยกตามชีต เป็นโมเดลทดลอง ไม่ใช่ backend |
| assets/icons/material-symbols-rounded.ttf | subset ไอคอน Google รวม swap_horiz |
| assets/icons/LICENSE.txt | ใบอนุญาตของไอคอน |
| docs/apps-script-plan.md | เอกสารนี้ |
| docs/admin-flow.md (แก้ไขไฟล์เดิม) | เพิ่มสถานะว่ามี UI ต้นแบบและลิงก์เอกสาร |

ไม่จำเป็นต้องรวม `ทะเบียนเฟซเคลมล็อก.html` ที่เป็นไฟล์ตัวอย่างเก่า หรือไฟล์ Excel ต้นฉบับใน commit นี้ ไม่เปลี่ยน dashboard สาธารณะหรือ activity-check.js ในรอบ UI

`admin-sample-data.js` เป็นไฟล์เฉพาะในเครื่องและอยู่ใน .gitignore หน้า UI จะลองโหลดเฉพาะ localhost ถ้าไม่มีหรือเปิดจากโฮสต์อื่นจะแสดงหน้าโดยยังไม่มีข้อมูลทะเบียน ไม่คัดลอกข้อมูล sample ไปฝังใน JS แทน ส่วน tests/admin-model.test.cjs แนะนำเก็บเพื่อทดสอบต่อ แต่ไม่จำเป็นต่อการเปิดหน้าเว็บ และ tools/export-admin-sample.py เป็นเครื่องมือเฉพาะ local ไม่จำเป็นต้อง deploy

คำสั่ง stage เฉพาะงานนี้ (ยังไม่ได้รันให้):

```sh
git add .gitignore admin.html admin.css admin.js admin-model.js assets/icons/material-symbols-rounded.ttf assets/icons/LICENSE.txt docs/apps-script-plan.md docs/admin-flow.md
```

## รูปแบบเชื่อมที่เสนอ

เสนอให้หน้าแอดมินจริงเสิร์ฟผ่าน Apps Script HTML Service แล้วเรียกฝั่งเซิร์ฟเวอร์ด้วย `google.script.run` ส่วน GitHub Pages ยังคงใช้ dashboard สาธารณะและ UI ทดลอง การเสิร์ฟ HTML จาก Apps Script ต้องปรับการรวม CSS/JS และไฟล์ไอคอนจาก relative URL ให้เหมาะกับ HTML Service ไม่ใช่คัดลอก HTML ปัจจุบันแล้วใช้ได้ทันที

นี่เป็นข้อเสนอ ไม่ใช่การตัดสินใจ deploy แทนผู้ดูแล หากต้องการให้หน้า admin จริงอยู่บน GitHub Pages ต้องออกแบบการล็อกอิน การตรวจ token และช่องทางเรียก API แยก ไม่ใช้ API key ที่ฝังในไฟล์ JS สาธารณะเป็นสิทธิ์เขียน

อ้างอิง: [Web apps](https://developers.google.com/apps-script/guides/web), [HTML Service communication](https://developers.google.com/apps-script/guides/html/communication)

## โครงไฟล์ Apps Script ที่จะเขียนภายหลัง

| ไฟล์ที่เสนอ | ความรับผิดชอบ |
| --- | --- |
| appsscript.json | เขตเวลา Asia/Bangkok และสิทธิ์ที่จำเป็น |
| Code.gs | doGet และจุดเรียก getBootstrap / previewAction / commitAction |
| Auth.gs | ตรวจรหัสกลาง ออกเซสชันผูกชื่อที่เลือก และตรวจสิทธิ์ทุกคำสั่งอ่าน/เขียน |
| Config.gs | อ่าน Spreadsheet ID และค่าฝั่งเซิร์ฟเวอร์จาก Script Properties |
| Repository.gs | อ่านตามหัวคอลัมน์และ UID/CharID/LockID; ไม่ผูกกับเลขแถวในเบราว์เซอร์ |
| Rules.gs | ตรวจ flow และสร้างแผนจากข้อมูลสดที่ฝั่งเซิร์ฟเวอร์ ไม่รับ patches จากเบราว์เซอร์มาเขียนทันที |
| Writer.gs | จัดสรร ID เขียนทะเบียน เติมสูตร เพิ่ม log ตรวจผลและจัดการคำขอซ้ำ |
| Dates.gs | รับ ISO YYYY-MM-DD, ตรวจวันจริง และแปลงวันที่ตาม Asia/Bangkok |
| Index.html / Styles.html / Client.html | รวม UI สำหรับ HTML Service และเรียก google.script.run |

แยกส่วนเพื่ออธิบายหน้าที่ได้ชัด ไม่จำเป็นต้องสร้างทุกไฟล์ตั้งแต่วันแรก

## สัญญาการเรียกที่เสนอ

1. `getBootstrap()` ตรวจสิทธิ์และคืนข้อมูลทะเบียนสดที่ผู้ดูแลจำเป็นต้องใช้ แทน AdminSampleData
2. `previewAction({action, values})` ตรวจข้อมูลใหม่จากชีต แล้วคืนรายการแก้ไข คำเตือน และ preview token/version
3. `commitAction({requestId, previewToken, action, values})` ตรวจสิทธิ์อีกครั้ง ล็อกคำขอ ตรวจข้อมูลยังตรงกับตอนสรุป แล้วคำนวณ/บันทึกฝั่งเซิร์ฟเวอร์
4. เมื่อสำเร็จคืน receipt พร้อม ID/log ที่สร้าง หากข้อมูลเปลี่ยนระหว่างทาง ให้กลับไปเปิดสรุปใหม่ ไม่เขียนทับเงียบ ๆ

`requestId` เป็นคีย์คำขอ ไม่ใช่เลขโพสต์ เพราะหนึ่งโพสต์อาจเพิ่ม log สองแถวได้ตาม flow เก็บสถานะคำขอและผู้ดำเนินการเพื่อไม่ให้เขียนซ้ำเมื่อเครือข่ายขาดหรือกดซ้ำ

LockService ช่วยกันหลายคำขอชนกัน แต่ไม่ได้ทำให้การเขียนหลายชีตเป็น transaction อัตโนมัติ ต้องกำหนดขั้นตรวจและกู้คืนเมื่อทำได้เพียงบางส่วนด้วย

อ้างอิง: [LockService](https://developers.google.com/apps-script/reference/lock/lock-service)

## วันที่และสูตร

- หน้าจอรับ/แสดง `05/11/2026` แล้วเตรียมค่า `2026-11-05` ให้เซิร์ฟเวอร์
- ไม่ส่ง Date object ผ่าน google.script.run ใช้ string ISO; ข้อมูลจากชีตที่เป็น Date ต้องแปลงก่อนส่งกลับ UI เช่นกัน
- เซิร์ฟเวอร์แยกปี เดือน วัน ตรวจค่าจริง และแปลงด้วยเขตเวลา Asia/Bangkok ห้ามใช้ new Date('05/11/2026') ที่กำกวม
- ตั้งเขตเวลาโปรเจกต์และ spreadsheet ให้ตรงกัน และตั้ง number format ของคอลัมน์วันที่เป็น `dd/MM/yyyy`
- สูตรคอลัมน์คำนวณและ Public sheets ให้อยู่ในชีตตามเดิม ไม่เขียนทับผลสูตรจาก payload

## สิ่งที่ต้องยืนยันก่อนเขียนข้อมูลจริง

- Spreadsheet ID, วิธี deploy, รายชื่อผู้ดำเนินการที่ใช้จริง และขั้นตอนตั้งรหัสกลางฝั่งเซิร์ฟเวอร์
- หากภายหลังเปลี่ยนเป็น login Google ต้องออกแบบการตรวจตัวตนใหม่ เพราะ Session.getActiveUser().getEmail() ไม่ได้คืนอีเมลเสมอในทุกโหมดรัน
- ค่าช่อง Post Check / Activity Check / Reclaim Approved เมื่อปรับ Inactive ให้ตรงผลตรวจที่สรุปแล้ว
- Type ที่สูตรรองรับสำหรับกลับมานับต่อ/ยกเลิก รวมถึงต่ออายุหลังหมดกำหนด
- โควตาตัวรองพิเศษเก็บที่ใด และสิทธิ์ล็อกเมื่อปรับ Inactive/นำตัวละครออก
- การจัดการลิงก์เมื่อเปลี่ยน MAIN และการเริ่มล็อกเฟซเคลมที่กำลังใช้งานในวันเดียวกัน

อ้างอิงข้อจำกัดตัวตน: [Session](https://developers.google.com/apps-script/reference/base/session)

## ลำดับเริ่มงาน

1. สร้างสำเนาชีตสำหรับทดสอบ ตรวจหัวคอลัมน์/สูตรล่าสุด ตั้ง timezone และเตรียม Apps Script
2. ทำ Auth + getBootstrap ให้เลือกบัญชีจากข้อมูลจริงได้ก่อน โดยยังไม่เขียน
3. ทำ previewAction ของลงทะเบียนใหม่ และเทียบกับ UI ต้นแบบ
4. ทำ commitAction สำหรับลงทะเบียนใหม่ครบ 4 ชีต ทดสอบกรอกซ้ำ UID ซ้ำ คำขอซ้ำ และล้มเหลวระหว่างทาง
5. ต่อ flow อื่นทีละประเภท พร้อมเชื่อมประวัติล็อกตามกติกาที่ตกลงแล้ว

ยังไม่ต้องสร้าง endpoint เขียนข้อมูลสาธารณะหรือ deploy จนกว่าขั้นตรวจสิทธิ์และทดสอบชีตสำเนาจะพร้อม
