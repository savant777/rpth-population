const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

function appAt(instant) {
  const source = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
  const context = vm.createContext({
    document: { getElementById: () => null },
    Date: class extends Date {
      constructor(...args) { super(...(args.length ? args : [instant])); }
    }
  });
  vm.runInContext(source.replace("  init();", `
    globalThis.api = { buildActiveLocks, buildCharactersByUser, collectPlayerCharacters };
    return;
  `), context);
  return context.api;
}

const lock = {
  UserID: "189", CharID: "C-189-01", Status: "กำลังนับ",
  "Lock Character Name": "Old Name", "Lock Face Claim": "Bang Chan",
  "End Date": "25/11/2026"
};

test("matches renamed characters by CharID, not name or slot", () => {
  const api = appAt("2026-11-25T16:59:59Z");
  const chars = api.buildCharactersByUser([{
    UserID: "189", CharID: "C-189-01", "Character Name": "New Name",
    "Character Slot": "SUB 2", "Is Active Character": "FALSE"
  }]);
  const result = api.collectPlayerCharacters({ UserID: "189" }, "MAIN", api.buildActiveLocks([lock]), chars);
  assert.equal(result[0].lockedFaceclaim, "Bang Chan");
});

test("protection includes expiration day through Thai 23:59, not next midnight", () => {
  assert.equal(appAt("2026-11-25T16:59:59Z").buildActiveLocks([lock]).size, 1);
  assert.equal(appAt("2026-11-25T17:00:00Z").buildActiveLocks([lock]).size, 0);
});

test("paused, cancelled, expired and missing-ID rights are excluded", () => {
  const api = appAt("2026-11-24T12:00:00Z");
  for (const Status of ["พักนับ", "ยกเลิก", "หมดอายุ", "รอเริ่ม", ""]) {
    assert.equal(api.buildActiveLocks([{ ...lock, Status }]).size, 0);
  }
  assert.equal(api.buildActiveLocks([{ ...lock, CharID: "" }]).size, 0);
});

test("same name with a different CharID or owner cannot inherit a lock", () => {
  const api = appAt("2026-11-24T12:00:00Z");
  const chars = api.buildCharactersByUser([{
    UserID: "189", CharID: "C-189-02", "Character Name": "Old Name",
    "Character Slot": "SUB 1", "Is Active Character": "FALSE"
  }]);
  const locks = api.buildActiveLocks([lock, { ...lock, UserID: "999", CharID: "C-189-02" }]);
  assert.equal(api.collectPlayerCharacters({ UserID: "189" }, "MAIN", locks, chars)[0].lockedFaceclaim, "");
});
