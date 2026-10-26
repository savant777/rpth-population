// RoleplayTH Activity Checker — at least 20 posts in the last 3 calendar months
// Run while logged in on roleplayth.com
// Loads currently Active players from Public Player. Does not update any records.
// Stop with: window.STOP_ACTIVITY = true

(async () => {
  if (window.RP_ACTIVITY_RUNNING) {
    console.warn("มีการตรวจโพสต์ทำงานอยู่แล้ว หากต้องการหยุดใช้ window.STOP_ACTIVITY = true");
    return;
  }
  if (location.hostname !== "roleplayth.com" && location.hostname !== "www.roleplayth.com") {
    console.error("กรุณารันสคริปต์บน roleplayth.com ขณะล็อกอิน");
    return;
  }
  const PLAYER_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTgQtSwWr5mlkgzywn-MBDJwVT5W0PCubFFxkt79Uo62KrXkCzSnNHBinKoCfLTKgWvHWc_ebz_rwDD/pub?gid=800603736&single=true&output=csv";

  const REQUEST_DELAY = 150, USER_DELAY = 250, MAX_RETRIES = 3;
  const REQUIRED_POSTS = 20;
  window.STOP_ACTIVITY = false;
  window.RP_ACTIVITY_RESULTS = [];
  window.RP_ACTIVITY_FAILED = [];
  window.RP_ACTIVITY_UNKNOWN = [];
  window.RP_ACTIVITY_EXEMPT = [];
  window.RP_ACTIVITY_TSV = "";
  window.RP_ACTIVITY_FAILED_TSV = "";
  window.RP_ACTIVITY_EXEMPT_TSV = "";
  window.RP_ACTIVITY_RUNNING = true;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const NOW = new Date();
  const todayParts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone:"Asia/Bangkok", year:"numeric", month:"2-digit", day:"2-digit"
  }).formatToParts(NOW).map(({type,value}) => [type,value]));
  const todayKey = `${todayParts.year}-${todayParts.month}-${todayParts.day}`;
  function exemptDateKey(value) {
    if (!value) return "";
    const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) return null;
    let year = Number(match[3]);
    if (year > 2400) year -= 543;
    const month = Number(match[2]), day = Number(match[1]);
    const date = new Date(Date.UTC(year,month-1,day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month-1 || date.getUTCDate() !== day) return null;
    return `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
  }
  const START = new Date(NOW);
  const startDay = START.getDate();
  START.setDate(1);
  START.setMonth(START.getMonth() - 3);
  START.setDate(Math.min(startDay, new Date(START.getFullYear(), START.getMonth() + 1, 0).getDate()));
  START.setHours(0,0,0,0);

  // CSV parser supports quoted names, commas and embedded newlines.
  function parseCsv(text) {
    const rows = [];
    let row = [], field = "", quoted = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '"') {
        if (quoted && text[i + 1] === '"') { field += '"'; i++; }
        else quoted = !quoted;
      } else if (ch === "," && !quoted) { row.push(field); field = ""; }
      else if ((ch === "\r" || ch === "\n") && !quoted) {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(field);
        if (row.some(cell => cell.trim())) rows.push(row);
        row = []; field = "";
      } else field += ch;
    }
    if (field || row.length) { row.push(field); rows.push(row); }
    if (!rows.length) throw new Error("CSV ว่าง");
    const headers = rows.shift().map(cell => cell.replace(/\uFEFF/g, "").trim());
    for (const name of ["UserID", "Display Name", "Status", "Exempt Until"]) {
      if (!headers.includes(name)) throw new Error(`CSV ไม่มีคอลัมน์ ${name}`);
    }
    return rows.map(cells => Object.fromEntries(headers.map((header, i) => [header, (cells[i] || "").trim()])));
  }

  const active = value => /^(true|yes|1|ใช่)$/i.test(value);
  let players;
  try {
    const response = await fetch(PLAYER_CSV, { cache: "no-store", credentials: "omit" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const rows = parseCsv(await response.text());
    players = [...new Map(rows.filter(row => active(row.Status) && /^\d+$/.test(row.UserID))
      .map(row => [row.UserID, { uid: row.UserID, name: row["Display Name"], exemptUntil:row["Exempt Until"] }])).values()];
  } catch (error) {
    window.RP_ACTIVITY_RUNNING = false;
    console.error("โหลดรายชื่อ Active ไม่สำเร็จ จึงยังไม่เริ่มตรวจโพสต์", error);
    return;
  }
  const uids = players.map(player => player.uid);
  const names = new Map(players.map(player => [player.uid, player.name]));
  const exemptions = new Map(players.map(player => [player.uid, player.exemptUntil]));

  function time12(s) {
    const m = s.match(/(\d{1,2}):(\d{2})(?:\:\d{2})?\s*(AM|PM)?/i);
    if (!m) return null;
    let h = +m[1], min = +m[2], ap = (m[3] || "").toUpperCase();
    if (min > 59 || (ap ? h < 1 || h > 12 : h > 23)) return null;
    if (ap === "PM" && h !== 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    return {h,min};
  }

  function parseDate(text) {
    const s = String(text || "").replace(/[\u200B-\u200F\uFEFF]/g, "").replace(/\s+/g," ").trim();
    // ISO datetime attributes, including explicit timezone offsets.
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})$/.test(s)) {
      const date = new Date(s);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    const absolute = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})(?:[, T]+)(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)/i)
      || s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[, T]+)(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)/i);
    if (absolute) {
      const iso = /^\d{4}-/.test(absolute[0]);
      let year = +(iso ? absolute[1] : absolute[3]);
      if (year > 2400) year -= 543;
      const month = +absolute[2], day = +(iso ? absolute[3] : absolute[1]);
      const time = time12(absolute[4]);
      if (!time) return null;
      const date = new Date(year, month - 1, day, time.h, time.min);
      return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
    }
    let m = s.match(/(\d{1,2})-(\d{1,2})-(\d{4}),?\s+(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (m) {
      let h = +m[4];
      if (m[6].toUpperCase()==="PM" && h!==12) h+=12;
      if (m[6].toUpperCase()==="AM" && h===12) h=0;
      return new Date(+m[3],+m[1]-1,+m[2],h,+m[5]);
    }
    if (/วันนี้|เมื่อวาน|\btoday\b|\byesterday\b/i.test(s)) {
      const t=time12(s); if(!t) return null;
      const d=new Date(NOW);
      if (/เมื่อวาน|\byesterday\b/i.test(s)) d.setDate(d.getDate()-1);
      d.setHours(t.h,t.min,0,0); return d;
    }
    m=s.match(/(\d+)\s*ชั่วโมง\s*ที่ผ่านมา/);
    if(m) return new Date(NOW-(+m[1]*3600000));
    m=s.match(/(\d+)\s*นาที\s*ที่ผ่านมา/);
    if(m) return new Date(NOW-(+m[1]*60000));
    m=s.match(/(\d+)\s*วินาที\s*ที่ผ่านมา/);
    if(m) return new Date(NOW-(+m[1]*1000));
    m=s.match(/(\d+)\s*(seconds?|minutes?|hours?|days?)\s+ago/i);
    if(m) return new Date(NOW-(+m[1]*({s:1000,m:60000,h:3600000,d:86400000}[m[2][0].toLowerCase()])));
    if (/^(just now|เมื่อสักครู่|เมื่อครู่นี้)$/i.test(s)) return new Date(NOW);
    return null;
  }

  async function get(url) {
    let last;
    for(let i=1;i<=MAX_RETRIES;i++){
      if(window.STOP_ACTIVITY) throw new Error("STOPPED");
      try{
        const r=await fetch(url,{credentials:"include",redirect:"follow"});
        if(!r.ok) throw new Error(`HTTP ${r.status}`);
        return {html:await r.text(),url:r.url};
      }catch(e){
        last=e; if(e.message==="STOPPED") throw e;
        if(i<MAX_RETRIES) await sleep(600*i);
      }
    }
    throw last;
  }

  function rows(doc){
    return [...doc.querySelectorAll("tr.inline_row")].map(row=>{
      const cells=[...row.children].filter(x=>x.tagName==="TD");
      const candidates = [];
      for (const cell of [...cells].reverse()) {
        for (const node of cell.querySelectorAll("time[datetime], span[title]")) {
          candidates.push(node.getAttribute("datetime"), node.getAttribute("title"), node.textContent);
        }
        candidates.push(cell.textContent);
      }
      for (const raw of candidates.filter(Boolean)) {
        const date = parseDate(raw);
        if (date) return {date,raw};
      }
      return {date:null,raw:row.textContent?.trim().slice(0, 800) || "",candidates:candidates.filter(Boolean)};
    });
  }

  function nextPage(doc,current,page){
    const links=[...doc.querySelectorAll("a[href]")];
    const a=links.find(x=>x.textContent.trim()===String(page+1)) ||
            links.find(x=>/^(next|ถัดไป|›|»|>)$/i.test(x.textContent.trim()));
    if(a) return new URL(a.getAttribute("href"),current).href;
    try{
      const u=new URL(current);
      if(u.searchParams.get("action")==="results"){
        u.searchParams.set("page",String(page+1)); return u.href;
      }
    }catch{}
    return null;
  }

  async function check(uid){
    let count=0,pagesChecked=0;
    let r=await get(`/search.php?action=finduser&uid=${uid}`);
    let html=r.html,url=r.url;
    for(let page=1;;page++){
      pagesChecked++;
      const doc=new DOMParser().parseFromString(html,"text/html");
      const list=rows(doc);
      if(!list.length) {
        const body = doc.body?.textContent || "";
        const noResults = /ไม่พบผลการค้นหา|ไม่พบผลลัพธ์|ไม่พบโพสต์|ไม่พบข้อความ|did not match any results|no results found/i.test(body);
        if (noResults && pagesChecked === 1) return {uid,count:0,displayCount:0,passed20:"ไม่",pagesChecked,status:"OK"};
        return {uid,count,displayCount:"?",passed20:"?",pagesChecked,status:"ERROR: ไม่พบตารางโพสต์ กรุณาตรวจการล็อกอินหรือหน้าผลค้นหา"};
      }
      if(list.some(x=>!x.date)) {
        const unreadable = list.filter(x=>!x.date);
        console.warn("อ่านวันที่ไม่ได้ — UID",uid,"URL",url,unreadable);
        return {uid,count,displayCount:"?",passed20:"?",pagesChecked,status:"ERROR: parse วันที่ไม่ได้",errorUrl:url,dateSamples:unreadable};
      }
      for(const x of list){
        if(x.date<START) return {uid,count,displayCount:count,passed20:"ไม่",pagesChecked,status:"OK"};
        if(x.date<=NOW && ++count>=REQUIRED_POSTS)
          return {uid,count:REQUIRED_POSTS,displayCount:`${REQUIRED_POSTS}+`,passed20:"ใช่",pagesChecked,status:"OK"};
      }
      const next=nextPage(doc,url,page);
      if(!next) return {uid,count,displayCount:count,passed20:"ไม่",pagesChecked,status:"OK"};
      await sleep(REQUEST_DELAY);
      r=await get(next); html=r.html; url=r.url;
    }
  }

  console.log(`ช่วงตรวจ ${START.toLocaleDateString()} → ${NOW.toLocaleDateString()} | ${uids.length} UID`);
  try{
    for(let i=0;i<uids.length;i++){
      if(window.STOP_ACTIVITY) break;
      const uid=uids[i];
      console.log(`[${i+1}/${uids.length}] UID ${uid}`);
      const exemptUntil = exemptions.get(uid);
      const exemptKey = exemptDateKey(exemptUntil);
      if (exemptKey === null || (exemptKey && exemptKey >= todayKey)) {
        const status = exemptKey === null ? "ERROR: อ่าน Exempt Until ไม่ได้" : "EXEMPT";
        window.RP_ACTIVITY_RESULTS.push({uid,name:names.get(uid),exemptUntil,count:null,displayCount:"—",passed20:"—",pagesChecked:0,status});
        console.log(`${names.get(uid)} | ${status} | งดตรวจถึง ${exemptUntil}`);
        continue;
      }
      try{
        const x={...await check(uid),name:names.get(uid),exemptUntil}; window.RP_ACTIVITY_RESULTS.push(x);
        console.log(`→ ${x.name} | ${x.displayCount} | ≥20: ${x.passed20} | ${x.status}`);
      }catch(e){
        if(e.message==="STOPPED") throw e;
        window.RP_ACTIVITY_RESULTS.push({uid,name:names.get(uid),exemptUntil,count:null,displayCount:"?",passed20:"?",pagesChecked:0,status:`ERROR: ${e.message}`});
      }
      if(i<uids.length-1) await sleep(USER_DELAY);
    }
  }catch(e){ if(e.message==="STOPPED") console.warn("หยุดแล้ว — ผลตรวจยังไม่ครบ"); else console.error(e); }
  finally { window.RP_ACTIVITY_RUNNING = false; }

  const checked = new Set(window.RP_ACTIVITY_RESULTS.map(row => row.uid));
  for (const player of players) {
    if (!checked.has(player.uid)) window.RP_ACTIVITY_RESULTS.push({ ...player, count:null, displayCount:"?", passed20:"?", pagesChecked:0, status:"NOT CHECKED" });
  }
  window.RP_ACTIVITY_FAILED = window.RP_ACTIVITY_RESULTS.filter(row => row.status === "OK" && row.count < REQUIRED_POSTS);
  window.RP_ACTIVITY_UNKNOWN = window.RP_ACTIVITY_RESULTS.filter(row => !["OK","EXEMPT"].includes(row.status));
  window.RP_ACTIVITY_EXEMPT = window.RP_ACTIVITY_RESULTS.filter(row => row.status === "EXEMPT");
  console.table(window.RP_ACTIVITY_RESULTS);
  console.log(`ยกเว้นตรวจ: ${window.RP_ACTIVITY_EXEMPT.length} คน (รวมวันสิ้นสุดการยกเว้น)`);
  console.table(window.RP_ACTIVITY_EXEMPT);
  console.log(`ไม่ผ่านเกณฑ์ ${REQUIRED_POSTS} โพสต์: ${window.RP_ACTIVITY_FAILED.length} คน`);
  console.table(window.RP_ACTIVITY_FAILED);
  if (window.RP_ACTIVITY_UNKNOWN.length) {
    console.warn(`ตรวจไม่สำเร็จ/ยังไม่ได้ตรวจ ${window.RP_ACTIVITY_UNKNOWN.length} คน — ห้ามถือว่าไม่ผ่าน`);
    console.table(window.RP_ACTIVITY_UNKNOWN);
  }
  const tsv = rows => [["UID","ชื่อ","จำนวนโพสต์","ผ่านอย่างน้อย 20 โพสต์","หน้าที่ตรวจ","สถานะ","งดตรวจถึง"],
    ...rows.map(r => [r.uid,r.name,r.displayCount,r.passed20,r.pagesChecked,r.status,r.exemptUntil])]
    .map(row => row.map(value => String(value ?? "").replace(/[\t\r\n]+/g," ")).join("\t")).join("\n");
  window.RP_ACTIVITY_TSV = tsv(window.RP_ACTIVITY_RESULTS);
  window.RP_ACTIVITY_FAILED_TSV = tsv(window.RP_ACTIVITY_FAILED);
  window.RP_ACTIVITY_EXEMPT_TSV = tsv(window.RP_ACTIVITY_EXEMPT);
  console.log("Copy ผล: copy(window.RP_ACTIVITY_TSV)");
  console.log("Copy เฉพาะผู้ไม่ผ่าน: copy(window.RP_ACTIVITY_FAILED_TSV)");
  console.log("Copy ผู้ยกเว้นตรวจ: copy(window.RP_ACTIVITY_EXEMPT_TSV)");
})();
