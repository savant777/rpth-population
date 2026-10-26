(function (root) {
  const clean = (value) => String(value ?? "").trim();
  const key = (user, char) => `${clean(user)}::${clean(char)}`;
  const collator = new Intl.Collator("th", { sensitivity: "base", numeric: true });

  function parseDate(value) {
    const text = clean(value);
    const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) return null;
    let year = Number(match[3]);
    if (year > 2400) year -= 543;
    const month = Number(match[2]);
    const day = Number(match[1]);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : null;
  }

  function formatDate(value) {
    const date = parseDate(value);
    if (!date) return "ไม่ระบุวันที่";
    return `${String(date.getUTCDate()).padStart(2, "0")}/${String(date.getUTCMonth() + 1).padStart(2, "0")}/${date.getUTCFullYear()}`;
  }

  function build({ players, staff, npc, locks, characters }, now = new Date()) {
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit"
    }).format(now);
    const byUser = new Map();
    for (const row of characters) {
      if (!clean(row.UserID) || !clean(row["Character Name"])) continue;
      const user = clean(row.UserID);
      if (!byUser.has(user)) byUser.set(user, []);
      byUser.get(user).push({
        charId: clean(row.CharID), name: clean(row["Character Name"]),
        slot: clean(row["Character Slot"]).toUpperCase(),
        faceclaim: clean(row["Character Faceclaim"]), url: clean(row["Character Url"])
      });
    }
    for (const chars of byUser.values()) {
      chars.sort((a, b) => (a.slot === "MAIN" ? -1 : b.slot === "MAIN" ? 1 : collator.compare(a.slot, b.slot)));
    }
    const protectedLocks = new Map();
    for (const row of locks) {
      const status = clean(row.Status);
      if (!clean(row.UserID) || !clean(row.CharID) || !clean(row["Lock Face Claim"])) continue;
      if (!["กำลังนับ", "พักนับ"].includes(status)) continue;
      let endDate = clean(row["End Date"]);
      let pauseDate = "";
      if (status === "พักนับ") {
        endDate = clean(row["Previous End Date"]) || endDate;
        pauseDate = clean(row["Start Pause"]);
      } else {
        const end = parseDate(endDate);
        if (!end || end.toISOString().slice(0, 10) < today) continue;
      }
      const id = key(row.UserID, row.CharID);
      const previous = protectedLocks.get(id);
      if (!previous || (parseDate(endDate)?.getTime() || 0) > (parseDate(previous.endDate)?.getTime() || 0)) {
        protectedLocks.set(id, { endDate, pauseDate, paused: status === "พักนับ", faceclaim: clean(row["Lock Face Claim"]) });
      }
    }
    const result = [];
    const finish = (entry) => {
      entry.raceSearchText = "";
      entry.searchText = [entry.mainName, entry.type, ...entry.lines.flatMap((line) => [line.name, line.faceclaim])].join(" ").normalize("NFKC").toLowerCase();
      result.push(entry);
    };
    const permanentUsers = new Set([...staff, ...npc].map((row) => clean(row.UserID)));
    for (const row of players) {
      if (permanentUsers.has(clean(row.UserID))) continue;
      const chars = byUser.get(clean(row.UserID)) || [];
      const main = chars.find((char) => char.slot === "MAIN");
      const lines = chars.flatMap((char) => {
        const lock = protectedLocks.get(key(row.UserID, char.charId));
        return lock ? [{ ...char, ...lock, permanent: false }] : [];
      });
      if (!lines.length) continue;
      finish({ type: "player", mainName: main?.name || clean(row["Display Name"]), lines });
    }
    for (const row of staff) {
      const chars = byUser.get(clean(row.UserID)) || [];
      const mainName = chars.find((char) => char.slot === "MAIN")?.name || clean(row["Display Name"]);
      if (!mainName) continue;
      const lines = (chars.length ? chars : [{ name: mainName, faceclaim: "", slot: "MAIN", url: "" }])
        .map((char) => ({ ...char, permanent: true }));
      finish({ type: "staff", role: clean(row.Role), mainName, lines });
    }
    for (const row of npc) {
      const name = clean(row["Display Name"]);
      if (!name) continue;
      const url = /^https?:\/\//i.test(clean(row.Link)) ? clean(row.Link) : "";
      finish({ type: "npc", role: "NPC", mainName: name, lines: [{ name, faceclaim: clean(row.Faceclaim), slot: "MAIN", url, permanent: true }] });
    }
    return result.sort((a, b) => collator.compare(a.mainName, b.mainName));
  }

  const api = { build, formatDate };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.FaceclaimRegistry = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
