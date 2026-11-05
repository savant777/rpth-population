# สูตรวันใช้งานตัวละคร

> อ้างอิงประวัติการพัฒนาสูตร ไม่ใช่ขั้นติดตั้งปัจจุบัน ตอนนี้สูตรวันใช้งานจริงอยู่ Player G:H แล้ว ไม่ใช่ AA:AB ตามขั้นทดลองด้านล่าง ให้ตรวจสูตร native และ docs/admin-flow.md ก่อนแก้ชีต ห้ามวางสูตรนี้ทับช่วงปัจจุบันอัตโนมัติ

ฉบับ 5: ใช้สูตรเลือกเหตุการณ์แบบฉบับ 4 ที่ตรวจผลแล้ว และปรับให้นับรวมวันปัจจุบัน/20 ธันวาคม คริสตัลปี 2026 คิดจากวันที่ใช้ตัวรองเกิน 174 วัน

ใช้กับ Google Sheets ต้นฉบับ ไม่ใช่การนำ XLSX กลับไปทับชีต

## 1. Player: เพิ่มคอลัมน์ทดลองโดยไม่แทรกคอลัมน์

- AA1: Main Usage Days
- AB1: Calculated Sub Usage Days
- ล้าง AA2:AB เฉพาะบริเวณที่จะให้สูตรแสดงผล และตั้งรูปแบบเป็นตัวเลข
- ใส่สูตรด้านล่างที่ AA2 แล้วลากเฉพาะเซลล์ AA2 ลงตามรายชื่อ สูตรแต่ละแถวจะแสดงผลสองคอลัมน์ AA/AB

```gs
=ARRAYFORMULA(IF(A2="","",
  LET(
    uid,A2,
    yearStart,DATE(YEAR(TODAY()),1,1),
    endDate,MIN(TODAY(),DATE(YEAR(TODAY()),12,20))+1,
    registrationDate,IFERROR(MINIFS(
      'log ลงทะเบียนตัวละคร'!$J$2:$J$10000,
      'log ลงทะเบียนตัวละคร'!$B$2:$B$10000,uid,
      'log ลงทะเบียนตัวละคร'!$C$2:$C$10000,"ลงทะเบียนตัวละครใหม่",
      'log ลงทะเบียนตัวละคร'!$J$2:$J$10000,">0"
    ),0),
    countStart,MAX(yearStart,registrationDate),
    regEvents,IFNA(FILTER(
      'log ลงทะเบียนตัวละคร'!$H$2:$K$10000,
      'log ลงทะเบียนตัวละคร'!$B$2:$B$10000=uid,
      'log ลงทะเบียนตัวละคร'!$K$2:$K$10000=TRUE
    ),{"MAIN","MAIN",0,FALSE}),
    adminEvents,IFNA(FILTER(
      'log Admin'!$F$2:$J$10000,
      'log Admin'!$B$2:$B$10000=uid,
      'log Admin'!$I$2:$I$10000=TRUE
    ),{"MAIN","MAIN",0,FALSE,"Active"}),
    slotRows,VSTACK(
      {0,"MAIN"},
      CHOOSECOLS(regEvents,3,2),
      CHOOSECOLS(adminEvents,3,2)
    ),
    slotTimeline,SORT(
      HSTACK(slotRows,SEQUENCE(ROWS(slotRows))),
      1,TRUE,3,TRUE
    ),
    statusRows,VSTACK({0,"Active"},CHOOSECOLS(adminEvents,3,5)),
    statusTimeline,SORT(
      HSTACK(statusRows,SEQUENCE(ROWS(statusRows))),
      1,TRUE,3,TRUE
    ),
    dayCount,MAX(0,endDate-countStart),
    IF(dayCount=0,HSTACK(0,0),
      LET(
        days,SEQUENCE(dayCount,1,countStart,1),
        daySlots,MAP(days,LAMBDA(day,
          UPPER(TRIM(INDEX(
            SORT(FILTER(slotTimeline,CHOOSECOLS(slotTimeline,1)<=day),1,FALSE,3,FALSE),
            1,2
          )))
        )),
        dayStatuses,MAP(days,LAMBDA(day,
          UPPER(TRIM(INDEX(
            SORT(FILTER(statusTimeline,CHOOSECOLS(statusTimeline,1)<=day),1,FALSE,3,FALSE),
            1,2
          )))
        )),
        HSTACK(
          SUM((daySlots="MAIN")*(dayStatuses="ACTIVE")),
          SUM((LEFT(daySlots,3)="SUB")*(dayStatuses="ACTIVE"))
        )
      )
    )
  )
))
```

สูตรนับรวมวันปัจจุบัน และนับถึงวันที่ 20 ธันวาคมรวมวันนั้นด้วย รอบปี 2026 มี 354 วัน ตัวแปร endDate เป็นขอบเขตที่ไม่รวมวันนั้นจึงบวก 1 วัน ช่วงการสลับยังไม่ซ้ำกัน เช่น กลับ MAIN วันที่ 1 มีนาคม จะนับ SUB ถึง 28 กุมภาพันธ์ = 59 วัน และเริ่ม MAIN ตั้งแต่ 1 มีนาคม

ข้อกำหนดของข้อมูล:

- วันที่ใน log ต้องเป็นวันที่จริงของ Sheets ไม่ใช่ข้อความ
- To Slot ใช้ MAIN / SUB 1 / SUB 2 เป็นต้น
- log Admin: I ต้องเป็น checkbox TRUE และ J ใช้ Active / Inactive สำหรับเหตุการณ์เปลี่ยนสถานะ
- User Status ใน log ลงทะเบียนเป็น helper ของสถานะปัจจุบัน จึงไม่ถูกใช้คำนวณประวัติสถานะ
- หากไม่มีข้อมูล inactive ย้อนหลัง สูตรถือว่า active ในช่วงที่ไม่มีหลักฐานระบุสถานะ ข้อมูลส่วนนี้เป็นค่าประมาณ ไม่ใช่ประวัติที่ยืนยันครบ
- ถ้าไม่มีวันที่ลงทะเบียน สูตรเริ่มที่ 1 มกราคมของปีปัจจุบัน
- เหตุการณ์วันเดียวกันประมวลผล log ลงทะเบียนก่อน log Admin และเรียงตามแถวภายในแต่ละ log หากลำดับจริงต่างออกไปต้องเพิ่มเวลา/ลำดับเหตุการณ์ก่อนใช้ตัดสินเคสนั้น
- รองรับถึงแถว 10000 หากเกินให้ขยายช่วงทุกจุด
- AA/AB เปลี่ยนตามปีปัจจุบัน จึงห้ามใช้เป็นแหล่งสูตรเฉพาะปี 2026 หลังสิ้นปีโดยไม่เก็บยอดปี 2026 ไว้ก่อน

## 2. ตรวจผลก่อนแทนสูตรเดิม

อ้างอิงไฟล์ที่ส่งเมื่อ 25 ตุลาคม 2026:

- UserID 413: AB ต้องได้ 59 วัน (1 มกราคม ถึง 1 มีนาคม 2026)
- UserID 326: ยืนยันแล้วว่า log Admin!H2 = 31 ธันวาคม 2025 และ J2 = Inactive จึงได้ AA = 98 / AB = 0
- UserID 758: ต้องหักช่วง inactive 15-22 กันยายน 2026 จำนวน 7 วันออกจาก Main Usage Days เฉพาะช่วงที่มีหลักฐานนี้ ช่วง inactive ก่อนหน้าไม่ทราบวันเริ่ม
- UserID 811: เริ่มนับ 9 กรกฎาคม 2026 ไม่ใช่ 1 มกราคม

หลังนับรวมวันที่ 25 ตุลาคม 2026: UID 413 = 239/59, UID 758 = 291/0, UID 811 = 109/0 ส่วน UID 326 ยังเป็น 98/0 เพราะ inactive ในวันปัจจุบัน

## 3. หลังตรวจผ่าน: Player!G2

แทนสูตร Sub Usage Days เดิม แล้วลากลง:

```gs
=IF(A2="","",AB2)
```

## 4. หลังตรวจผ่าน: Player!H2

เปลี่ยนหัว H1 เป็น 2026 Sub Excess Months สูตรคำนวณเดือนจากวันใช้ตัวรองที่เกิน 174 วัน โดย 30 วัน = 1 เดือนและปัดเศษเดือนขึ้น ตามแนวสูตรเดิม:

```gs
=IF(A2="","",IF(YEAR(TODAY())<>2026,"",ROUNDUP(MAX(0,G2-174)/30,0)))
```

Player!I2 (คริสตัล) แล้วลากลง:

```gs
=IF(OR(A2="",H2=""),"",H2*80)
```

ตัวอย่าง: SUB 174 วัน = 0 คริสตัล, 175-204 วัน = 80 คริสตัล, 205-234 วัน = 160 คริสตัล ก่อนปี 2027 ต้องเก็บสรุปผลปี 2026 เป็นค่าคงที่ในแผ่นงานประจำปี การปัดเศษเดือนขึ้นควรระบุในประกาศให้ชัด

เกณฑ์คริสตัลนี้คิดเฉพาะ SUB ที่เกิน 174 วัน ไม่เรียกเก็บจากวัน inactive ดังนั้นคนที่ MAIN ไม่ครบ 180 เพราะ inactive อาจมีคริสตัลเป็น 0 ได้ ต้องตรวจเกณฑ์ MAIN 180 วันแยกจากค่าคริสตัล ไม่ใช้คริสตัล 0 ยืนยันว่าผ่านเกณฑ์ MAIN

## 5. Public Player: เพิ่ม Main Usage Days

หลังตรวจ AA/AB ผ่านแล้ว เปลี่ยนสูตรที่ Public Player!A1 เป็น:

```gs
=QUERY(
  HSTACK(Player!A:G,Player!AA:AA),
  "select * where Col1 is not null",
  1
)
```

ผลลัพธ์มี 8 คอลัมน์: UserID / Display Name / Race / Status / Active Character / Switch Date / Sub Usage Days / Main Usage Days

ต้องแก้ app.js ให้แสดง Main Usage Days โดยตรงด้วย ก่อนถือว่าการนับวันบน dashboard แก้ครบ

Reclaim Approved คอลัมน์ N ยังคงติ๊กเอง และสูตรทั้งหมดนี้ไม่เปลี่ยน Status ใน Player
