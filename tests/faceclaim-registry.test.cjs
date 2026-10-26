const { test } = require("node:test");
const assert = require("node:assert/strict");
const registry = require("../faceclaim-registry.js");
const now = new Date("2026-10-26T08:00:00Z");
const main = { UserID: "1", CharID: "C-1-01", "Character Name": "Main Name", "Character Slot": "MAIN", "Character Faceclaim": "Main Face" };
const sub = { UserID: "1", CharID: "C-1-02", "Character Name": "Sub Name", "Character Slot": "SUB 1", "Character Faceclaim": "Sub Face" };
const lock = { UserID: "1", CharID: "C-1-01", "Lock Face Claim": "Locked Face", Status: "กำลังนับ", "End Date": "26/10/2026" };
const data = (overrides = {}) => ({ players: [{ UserID: "1", "Display Name": "Owner" }], staff: [], npc: [], locks: [lock], characters: [main, sub], ...overrides });

test("main locks exclude unrelated secondary characters and use locked faceclaim", () => {
  const [entry] = registry.build(data(), now);
  assert.equal(entry.mainName, "Main Name");
  assert.equal(entry.lines.length, 1);
  assert.equal(entry.lines[0].name, "Main Name");
  assert.equal(entry.lines[0].faceclaim, "Locked Face");
});

test("sub locks retain owner name without adding the unprotected main faceclaim", () => {
  const [entry] = registry.build(data({ locks: [{ ...lock, CharID: sub.CharID }] }), now);
  assert.equal(entry.mainName, "Main Name");
  assert.deepEqual(entry.lines.map((line) => line.name), ["Sub Name"]);
  assert.ok(!entry.searchText.includes("main face"));
});

test("all staff characters and NPCs are permanently protected, including missing faceclaims", () => {
  const entries = registry.build(data({ players: [], locks: [], staff: [{ UserID: "1" }], npc: [{ UserID: "2", "Display Name": "NPC Name", Faceclaim: "" }] }), now);
  assert.equal(entries.flatMap((entry) => entry.lines).length, 3);
  assert.ok(entries.flatMap((entry) => entry.lines).every((line) => line.permanent));
});

test("includes Thai expiration day and excludes next day, cancelled and expired records", () => {
  assert.equal(registry.build(data(), new Date("2026-10-26T16:59:59Z")).length, 1);
  assert.equal(registry.build(data(), new Date("2026-10-26T17:00:00Z")).length, 0);
  for (const Status of ["ยกเลิก", "หมดอายุ", "รอเริ่ม", ""]) {
    assert.equal(registry.build(data({ locks: [{ ...lock, Status }] }), now).length, 0);
  }
});

test("paused rights survive old expiration using dates from Google Sheets", () => {
  const [entry] = registry.build(data({
    locks: [{ ...lock, Status: "พักนับ", "End Date": "", "Previous End Date": "01/10/2026", "Start Pause": "30/09/2026" }]
  }), now);
  assert.equal(entry.lines[0].endDate, "01/10/2026");
  assert.equal(entry.lines[0].pauseDate, "30/09/2026");
});

test("sheet changes refresh pause dates and missing dates remain unknown", () => {
  const setup = data({
    locks: [{ ...lock, Status: "พักนับ", "End Date": "", "Previous End Date": "01/12/2026", "Start Pause": "20/10/2026" }] });
  assert.equal(registry.build(setup, now)[0].lines[0].pauseDate, "20/10/2026");
  assert.equal(registry.build(setup, now)[0].lines[0].endDate, "01/12/2026");
  delete setup.locks[0]["Start Pause"];
  delete setup.locks[0]["Previous End Date"];
  assert.equal(registry.build(setup, now)[0].lines[0].pauseDate, "");
  assert.equal(registry.build(setup, now)[0].lines[0].endDate, "");
});

test("matching uses owner and CharID, never character names", () => {
  assert.equal(registry.build(data({ locks: [{ ...lock, UserID: "9" }] }), now).length, 0);
  assert.equal(registry.build(data({ locks: [{ ...lock, CharID: "other" }] }), now).length, 0);
});

test("Thai display dates and invalid date handling", () => {
  assert.equal(registry.formatDate("3/12/2026"), "03/12/2026");
  assert.equal(registry.formatDate("03/12/2569"), "03/12/2026");
  assert.equal(registry.formatDate("31/02/2026"), "ไม่ระบุวันที่");
});
