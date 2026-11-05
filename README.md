# RPTH Population

ทะเบียนสาธารณะและหน้า admin ของ RPTH โดยใช้ Google Sheets เป็นแหล่งข้อมูลหลัก

**Codex อีกเครื่อง: เริ่มอ่าน [CODEX_HANDOFF.md](CODEX_HANDOFF.md) ก่อนทำงานต่อ**

- กติกา: [docs/admin-flow.md](docs/admin-flow.md)
- โครงระบบ: [docs/apps-script-plan.md](docs/apps-script-plan.md)
- ติดตั้ง: [docs/render-setup.md](docs/render-setup.md)

```sh
npm test
npm run build:apps-script
npm run dev
```

ไม่ต้องติดตั้ง npm dependencies เพิ่ม ใช้ Node.js ที่มี built-in fetch และ node:test (เครื่องพัฒนาเดิมใช้ Node 22) หน้า admin บน localhost ต้องตั้ง password hash หากต้องการทดสอบ login เครื่องอีกเครื่องไม่มี sample/Excel/secrets ใน repo ให้ใช้ชีตสำเนาผ่านระบบที่ตั้งค่าไว้ ไม่สร้างข้อมูลสมมติทับข้อมูลสด

ไฟล์ Apps Script ที่พร้อมคัดลอกจะถูกสร้างใน `local-delivery/` ด้วยคำสั่ง build ด้านบน โฟลเดอร์นี้ไม่ขึ้น Git ส่วน source ที่ต้องแก้จริงอยู่ใน `apps-script/`
