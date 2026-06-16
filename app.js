(function () {
  const DATA_SOURCES = {
    players: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTgQtSwWr5mlkgzywn-MBDJwVT5W0PCubFFxkt79Uo62KrXkCzSnNHBinKoCfLTKgWvHWc_ebz_rwDD/pub?gid=800603736&single=true&output=csv",
    staff: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTgQtSwWr5mlkgzywn-MBDJwVT5W0PCubFFxkt79Uo62KrXkCzSnNHBinKoCfLTKgWvHWc_ebz_rwDD/pub?gid=2044057244&single=true&output=csv",
    npc: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTgQtSwWr5mlkgzywn-MBDJwVT5W0PCubFFxkt79Uo62KrXkCzSnNHBinKoCfLTKgWvHWc_ebz_rwDD/pub?gid=1129713776&single=true&output=csv",
    locks: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTgQtSwWr5mlkgzywn-MBDJwVT5W0PCubFFxkt79Uo62KrXkCzSnNHBinKoCfLTKgWvHWc_ebz_rwDD/pub?gid=565505546&single=true&output=csv",
    characterUrls: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTgQtSwWr5mlkgzywn-MBDJwVT5W0PCubFFxkt79Uo62KrXkCzSnNHBinKoCfLTKgWvHWc_ebz_rwDD/pub?gid=922230904&single=true&output=csv"
  };

  const THAI_COLLATOR = new Intl.Collator("th", { sensitivity: "base", numeric: true });
  const state = {
    entries: [],
    query: "",
    letter: "all",
    type: "all",
    postedHeight: 0
  };

  const els = {
    registry: document.getElementById("registry"),
    resultCount: document.getElementById("resultCount"),
    lastUpdated: document.getElementById("lastUpdated"),
    searchInput: document.getElementById("searchInput"),
    typeFilter: document.getElementById("typeFilter"),
    letterFilter: document.getElementById("letterFilter")
  };

  init();
  window.addEventListener("load", postHeight);

  async function init() {
    bindEvents();
    renderLetterFilter([]);

    try {
      const [players, staff, npc, locks, characters] = await Promise.all([
        loadCsv(DATA_SOURCES.players),
        loadCsv(DATA_SOURCES.staff),
        loadCsv(DATA_SOURCES.npc),
        loadCsv(DATA_SOURCES.locks),
        loadCsv(DATA_SOURCES.characterUrls)
      ]);

      const activeLocks = buildActiveLocks(locks);
      const charactersByUser = buildCharactersByUser(characters);
      state.entries = [
        ...buildPlayerEntries(players, activeLocks, charactersByUser),
        ...buildStaffEntries(staff, charactersByUser),
        ...buildNpcEntries(npc)
      ].sort((a, b) => THAI_COLLATOR.compare(a.mainName, b.mainName));

      renderLetterFilter(collectLetters(state.entries));
      render();
    } catch (error) {
      console.error(error);
      els.registry.innerHTML = '<p class="error-state">โหลดข้อมูลไม่สำเร็จ กรุณาเปิดผ่าน local server หรือใส่ URL CSV export ของ Google Sheet</p>';
      els.resultCount.textContent = "โหลดข้อมูลไม่สำเร็จ";
    }
  }

  function bindEvents() {
    els.searchInput.addEventListener("input", (event) => {
      state.query = normalizeSearch(event.target.value);
      render();
    });

    els.typeFilter.addEventListener("change", (event) => {
      state.type = event.target.value;
      render();
    });

    window.addEventListener("resize", () => {
      requestAnimationFrame(positionTooltips);
      requestAnimationFrame(postHeight);
    });
  }

  async function loadCsv(path) {
    const response = await fetch(encodeURI(path), { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Cannot load ${path}`);
    }
    return parseCsv(await response.text());
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;

    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      const next = text[index + 1];

      if (char === '"') {
        if (inQuotes && next === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        row.push(field);
        field = "";
      } else if ((char === "\n" || char === "\r") && !inQuotes) {
        if (char === "\r" && next === "\n") {
          index += 1;
        }
        row.push(field);
        if (row.some((cell) => cell.trim() !== "")) {
          rows.push(row);
        }
        row = [];
        field = "";
      } else {
        field += char;
      }
    }

    if (field || row.length) {
      row.push(field);
      rows.push(row);
    }

    const headers = rows.shift().map(normalizeHeader);
    return rows.map((cells) => {
      const item = {};
      headers.forEach((header, index) => {
        item[header] = clean(cells[index] || "");
      });
      return item;
    });
  }

  function normalizeHeader(header) {
    return clean(header).replace(/\s*\n\s*/g, " ").replace(/\s+/g, " ");
  }

  function buildPlayerEntries(rows, activeLocks, charactersByUser) {
    return rows
      .filter((row) => parseBool(row.Status))
      .map((row) => {
        const activeSlot = normalizeSlot(row["Active Character"]);
        const characters = collectPlayerCharacters(row, activeSlot, activeLocks, charactersByUser);
        const mainCharacter = characters.find((character) => character.slot === "MAIN");
        const activeCharacter = characters.find((character) => character.isActive);

        return {
          id: `player-${row.UserID}`,
          type: "player",
          mainName: mainCharacter ? mainCharacter.name : row["Display Name"],
          race: row.Race,
          role: "",
          url: mainCharacter ? mainCharacter.url : row.Url,
          faceclaim: activeCharacter ? activeCharacter.faceclaim : row["Face Claim"],
          activeSlot,
          characters,
          mainUsage: getMainUsage(row),
          searchText: buildSearchText(row, characters)
        };
      })
      .filter((entry) => entry.mainName);
  }

  function collectPlayerCharacters(row, activeSlot, activeLocks, charactersByUser) {
    const sourceCharacters = getCharactersForUser(charactersByUser, row.UserID);
    const characters = sourceCharacters.length ? sourceCharacters : collectLegacyCharacters(row);

    return characters.map((character) => {
      const isActive = character.isActive || character.slot === activeSlot;
      const lock = activeLocks.get(lockKey(row.UserID, character.name));
      return {
        ...character,
        url: character.url || row.Url || "",
        isActive,
        lockedFaceclaim: lock && !isActive ? lock.faceclaim : "",
        lockEndDate: lock ? lock.endDate : ""
      };
    });
  }

  function buildStaffEntries(rows, charactersByUser) {
    return rows
      .map((row) => {
        const activeSlot = normalizeSlot(row["Active Character"]);
        const characters = collectStaffCharacters(row, activeSlot, charactersByUser);
        const mainCharacter = characters.find((character) => character.slot === "MAIN");
        const activeCharacter = characters.find((character) => character.isActive);

        return {
          id: `staff-${row.UserID}`,
          type: "staff",
          mainName: mainCharacter ? mainCharacter.name : row["Display Name"],
          race: row.Race,
          role: row.Role,
          url: mainCharacter ? mainCharacter.url : row.Url,
          faceclaim: activeCharacter ? activeCharacter.faceclaim : row.Faceclaim,
          activeSlot,
          characters,
          mainUsage: "",
          searchText: normalizeSearch([
            row["Display Name"],
            row.Faceclaim,
            row.Race,
            row.Role,
            ...characters.flatMap((character) => [
              character.name,
              character.faceclaim
            ])
          ].join(" "))
        };
      })
      .filter((entry) => entry.mainName);
  }

  function collectStaffCharacters(row, activeSlot, charactersByUser) {
    const sourceCharacters = getCharactersForUser(charactersByUser, row.UserID);
    const characters = sourceCharacters.length ? sourceCharacters : collectLegacyCharacters(row);

    return characters.map((character) => ({
      ...character,
      url: character.url || row.Url || "",
      isActive: character.isActive || character.slot === activeSlot,
      lockedFaceclaim: "",
      lockEndDate: ""
    }));
  }

  function collectLegacyCharacters(row) {
    const slots = [
      { slot: "MAIN", name: row["Main Character"] || row["Display Name"], faceclaim: row["Main Faceclaim"] || row.Faceclaim },
      { slot: "SUB 1", name: row["Sub1 Character"], faceclaim: row["Sub1 Faceclaim"] },
      { slot: "SUB 2", name: row["Sub2 Character"], faceclaim: row["Sub2 Faceclaim"] },
      { slot: "SUB 3", name: row["Sub3 Character"], faceclaim: row["Sub3 Faceclaim"] },
      { slot: "SUB 4", name: row["Sub4 Character"], faceclaim: row["Sub4 Faceclaim"] },
      { slot: "SUB 5", name: row["Sub5 Character"], faceclaim: row["Sub5 Faceclaim"] },
      { slot: "SUB 6", name: row["Sub6 Character"], faceclaim: row["Sub6 Faceclaim"] }
    ];

    return slots
      .filter((character) => character.name)
      .map((character) => ({
        ...character,
        url: row.Url || "",
        isActive: false
      }));
  }

  function buildNpcEntries(rows) {
    return rows
      .map((row) => {
        const linkOrRole = row.Link;
        const role = isUrl(linkOrRole) || !linkOrRole ? "NPC" : linkOrRole;
        const url = isUrl(linkOrRole) ? linkOrRole : "";

        return {
          id: `npc-${row.UserID}`,
          type: "npc",
          mainName: row["Display Name"],
          race: row.Race,
          role,
          url,
          faceclaim: row.Faceclaim,
          activeSlot: "MAIN",
          characters: [],
          mainUsage: "",
          searchText: normalizeSearch([
            row["Display Name"],
            row.Faceclaim,
            row.Race,
            role
          ].join(" "))
        };
      })
      .filter((entry) => entry.mainName);
  }

  function buildCharactersByUser(rows) {
    const charactersByUser = new Map();

    rows.forEach((row) => {
      const userId = row.UserID;
      const characterName = row["Character Name"];
      if (!userId || !characterName) return;

      const character = {
        slot: normalizeSlot(row["Character Slot"]),
        name: characterName,
        faceclaim: row["Character Faceclaim"],
        url: row["Character Url"],
        isActive: parseBool(row["Is Active Character"])
      };

      if (!charactersByUser.has(userId)) {
        charactersByUser.set(userId, []);
      }
      charactersByUser.get(userId).push(character);
    });

    charactersByUser.forEach((characters) => {
      characters.sort((a, b) => slotRank(a.slot) - slotRank(b.slot));
    });

    return charactersByUser;
  }

  function getCharactersForUser(charactersByUser, userId) {
    return charactersByUser.get(userId) || [];
  }

  function slotRank(slot) {
    if (slot === "MAIN") return 0;
    const match = slot.match(/^SUB\s+(\d+)$/);
    return match ? Number(match[1]) : 99;
  }

  function buildActiveLocks(rows) {
    const today = startOfDay(new Date());
    const locks = new Map();

    rows.forEach((row) => {
      const userId = row.UserID;
      const characterName = row["Lock Character Name"];
      const faceclaim = row["Lack Face Claim"] || row["Lock Face Claim"];
      const endDate = row["End Date"];
      if (!userId || !characterName || !faceclaim || !endDate) return;

      const permanent = endDate.includes("ถาวร");
      const parsedEnd = parseThaiDate(endDate);
      if (!permanent && (!parsedEnd || parsedEnd < today)) return;

      const key = lockKey(userId, characterName);
      const existing = locks.get(key);
      if (!existing || compareLockEnd(existing, { permanent, parsedEnd }) < 0) {
        locks.set(key, {
          faceclaim,
          permanent,
          endDate,
          parsedEnd
        });
      }
    });

    return locks;
  }

  function compareLockEnd(a, b) {
    if (a.permanent && !b.permanent) return 1;
    if (!a.permanent && b.permanent) return -1;
    if (a.permanent && b.permanent) return 0;
    return a.parsedEnd - b.parsedEnd;
  }

  function getMainUsage(row) {
    const today = new Date();
    const year = today.getFullYear();
    const start = new Date(year, 0, 1);
    const endLimit = new Date(year, 11, 20);
    const end = startOfDay(today > endLimit ? endLimit : today);
    const elapsedDays = Math.max(0, diffDays(start, end));
    const activeSlot = normalizeSlot(row["Active Character"]);
    const accumulatedSubDays = toNumber(row["วันสะสมก่อนหน้า"]);
    const switchDate = parseThaiDate(row["วันที่สลับ ตัวหลัก-รอง"]);
    const currentSubDays = activeSlot === "MAIN" || !switchDate ? 0 : Math.max(0, diffDays(switchDate, end));
    const subDays = accumulatedSubDays + currentSubDays;
    const mainDays = Math.max(0, elapsedDays - subDays);
    return formatMonthDay(mainDays);
  }

  function formatMonthDay(days) {
    const months = Math.floor(days / 30);
    const restDays = days % 30;
    if (months <= 0) return `${restDays} วัน`;
    return `${months} เดือน ${restDays} วัน`;
  }

  function render() {
    const filtered = getFilteredEntries();
    const groups = groupByLetter(filtered);

    els.resultCount.textContent = `แสดง ${filtered.length.toLocaleString("th-TH")} รายการ`;
    els.lastUpdated.textContent = `อัปเดตล่าสุด ${formatDisplayDate(new Date())}`;

    if (!filtered.length) {
      els.registry.innerHTML = '<p class="empty-state">ไม่พบข้อมูลที่ตรงกับเงื่อนไข</p>';
      return;
    }

    els.registry.innerHTML = groups.map(([letter, entries]) => `
      <section class="letter-section">
        <h2 class="letter-heading">${escapeHtml(letter)}</h2>
        <hr class="letter-rule">
        ${entries.map(renderEntry).join("")}
      </section>
    `).join("");

    requestAnimationFrame(positionTooltips);
    requestAnimationFrame(postHeight);
  }

  function getFilteredEntries() {
    return state.entries.filter((entry) => {
      const matchType = state.type === "all" || entry.type === state.type;
      const matchLetter = state.letter === "all" || firstLetter(entry.mainName) === state.letter;
      const matchQuery = !state.query || entry.searchText.includes(state.query);
      return matchType && matchLetter && matchQuery;
    });
  }

  function groupByLetter(entries) {
    const map = new Map();
    entries.forEach((entry) => {
      const letter = firstLetter(entry.mainName);
      if (!map.has(letter)) map.set(letter, []);
      map.get(letter).push(entry);
    });
    return Array.from(map.entries()).sort(([a], [b]) => THAI_COLLATOR.compare(a, b));
  }

  function renderEntry(entry) {
    const hasSubCharacters = entry.characters.some((character) => character.slot !== "MAIN");
    const main = entry.characters.find((character) => character.slot === "MAIN");
    const mainLocked = Boolean(main && main.lockedFaceclaim && entry.activeSlot !== "MAIN");
    const mainLine = renderCharacterLine({
      name: entry.mainName,
      roleLabel: hasSubCharacters ? "ตัวละครหลัก" : "",
      faceclaim: getMainFaceclaim(entry, main),
      race: entry.race,
      role: entry.role,
      url: entry.url,
      isActive: entry.type === "player" && entry.activeSlot === "MAIN" && hasSubCharacters,
      usage: entry.type === "player" && hasSubCharacters ? entry.mainUsage : "",
      type: entry.type,
      isLocked: mainLocked,
      lockEndDate: mainLocked ? main.lockEndDate : ""
    });

    const subCharacters = entry.characters.filter((character) => character.slot !== "MAIN");
    return `
      <div class="entry-card entry-${escapeAttribute(entry.type)}">
        <div class="entry-main">${mainLine}</div>
        ${subCharacters.length ? `<ol class="sub-list">${subCharacters.map((character) => `<li>${renderSubCharacter(character)}</li>`).join("")}</ol>` : ""}
      </div>
    `;
  }

  function getMainFaceclaim(entry, main) {
    if (entry.type === "npc") return entry.faceclaim;
    if (main && main.isActive) return main.faceclaim;
    return main && main.lockedFaceclaim ? main.lockedFaceclaim : "";
  }

  function renderSubCharacter(character) {
    const faceclaim = character.isActive ? character.faceclaim : character.lockedFaceclaim;
    return renderCharacterLine({
      name: character.name,
      roleLabel: "ตัวละครรอง",
      faceclaim,
      race: "",
      role: character.lockedFaceclaim && !character.isActive ? "ล็อกเฟซเคลม" : "",
      url: character.url,
      isActive: character.isActive,
      usage: "",
      type: "player",
      isLocked: Boolean(character.lockedFaceclaim && !character.isActive),
      lockEndDate: character.lockEndDate
    });
  }

  function renderCharacterLine(data) {
    const parts = [];
    const name = `<span class="segment segment-name"><span class="character-name">${escapeHtml(data.name)}</span>${data.roleLabel ? ` <span class="character-role">(${escapeHtml(data.roleLabel)})</span>` : ""}</span>`;
    parts.push(name);

    if (data.faceclaim) {
      parts.push(`<span class="segment faceclaim-segment">เฟซเคลม ${escapeHtml(data.faceclaim)}${data.isLocked ? ` ${renderLockBadge(data.lockEndDate)}` : ""}</span>`);
    }

    if (data.race) parts.push(renderRace(data.race));
    if (data.role && data.role !== "ล็อกเฟซเคลม") parts.push(`<span class="segment">${renderRole(data.role, data.type)}</span>`);
    if (data.url) {
      parts.push(`<span class="segment segment-action segment-profile"><a class="profile-link" href="${escapeAttribute(data.url)}" target="_blank" rel="noopener" title="ลิงก์ประวัติตัวละคร" aria-label="ลิงก์ประวัติตัวละคร"><span class="profile-link-text">ลิงก์ประวัติตัวละคร</span></a></span>`);
    }
    if (data.isActive) {
      parts.push('<span class="segment segment-action segment-active"><span class="tag tag-active" title="กำลังใช้งานอยู่" aria-label="กำลังใช้งานอยู่"><span class="tag-active-text">กำลังใช้งานอยู่</span></span></span>');
    }
    if (data.usage) parts.push(renderUsageButton(data.usage));

    return `<div class="character-line">${parts.join("")}</div>`;
  }

  function renderRole(role, type) {
    const className = role.includes("ราชันย์ปีศาจ") || role.includes("ราชินีปีศาจ")
      ? "tag-demon-royalty"
      : role.includes("อาเซราห์")
      ? "tag-aserah"
      : type === "npc" || role === "NPC" ? "tag-npc" : "tag-staff";
    return `<span class="tag ${className}">${escapeHtml(role)}</span>`;
  }

  function renderRace(race) {
    const key = getRaceKey(race);
    return `<span class="segment race-segment race-${key}" title="${escapeAttribute(race)}" aria-label="${escapeAttribute(race)}"><span class="race-icon" aria-hidden="true">${escapeHtml(getRaceSymbol(race))}</span><span class="race-text">${escapeHtml(race)}</span></span>`;
  }

  function getRaceKey(race) {
    const text = clean(race);
    if (text.includes("แวมไพร์")) return "vampire";
    if (text.includes("มนุษย์หมาป่า")) return "werewolf";
    if (text.includes("พ่อมดแม่มด")) return "enchanter";
    if (text.includes("แฟรี่")) return "fairy";
    if (text.includes("ชาวเงือก")) return "mermaid";
    if (text.includes("มนุษย์")) return "human";
    return "other";
  }

  function getRaceSymbol(race) {
    const key = getRaceKey(race);
    return {
      vampire: "V",
      werewolf: "W",
      enchanter: "E",
      fairy: "F",
      mermaid: "M",
      human: "H",
      other: "?"
    }[key];
  }

  function renderLockBadge(endDate) {
    const label = endDate && endDate.includes("ถาวร")
      ? "ล็อกเฟซเคลมถาวร"
      : `ล็อกเฟซเคลมถึง ${escapeHtml(endDate || "-")}`;
    return `<span class="lock-wrap"><span class="tag tag-lock">${label}</span><span class="icon-action lock-button" tabindex="0" role="button" aria-label="${escapeAttribute(label)}"></span><span class="tooltip" role="tooltip">${label}</span></span>`;
  }

  function renderUsageButton(usage) {
    const label = `ใช้งานตัวหลักแล้ว ${usage}`;
    return `
      <span class="segment usage-wrap">
        <button class="icon-action usage-button" type="button" aria-label="${escapeAttribute(label)}">
        </button>
        <span class="tooltip" role="tooltip">${escapeHtml(label)}</span>
      </span>
    `;
  }

  function positionTooltips() {
    const paper = document.querySelector(".paper");
    if (!paper) return;

    const paperRect = paper.getBoundingClientRect();
    document.querySelectorAll(".tooltip").forEach((tooltip) => {
      tooltip.style.removeProperty("--tooltip-x");

      const rect = tooltip.getBoundingClientRect();
      const leftOverflow = paperRect.left - rect.left;
      const rightOverflow = rect.right - paperRect.right;

      if (leftOverflow > 0) {
        tooltip.style.setProperty("--tooltip-x", `${leftOverflow + 8}px`);
      } else if (rightOverflow > 0) {
        tooltip.style.setProperty("--tooltip-x", `${-rightOverflow - 8}px`);
      }
    });
  }

  function postHeight() {
    if (window.parent === window) return;
    const shell = document.querySelector(".page-shell");
    if (!shell) return;

    const shellRect = shell.getBoundingClientRect();
    const shellStyle = getComputedStyle(shell);
    const height = Math.ceil(
      shellRect.height +
      parseFloat(shellStyle.marginTop || 0) +
      parseFloat(shellStyle.marginBottom || 0)
    );

    if (Math.abs(height - state.postedHeight) < 2) return;
    state.postedHeight = height;

    window.parent.postMessage({
      type: "rpth-population-height",
      height
    }, "*");
  }

  function renderLetterFilter(letters) {
    const allButton = `<button type="button" data-letter="all" class="${state.letter === "all" ? "is-active" : ""}">ทั้งหมด</button>`;
    els.letterFilter.innerHTML = allButton + letters.map((letter) => (
      `<button type="button" data-letter="${escapeAttribute(letter)}" class="${state.letter === letter ? "is-active" : ""}">${escapeHtml(letter)}</button>`
    )).join("");

    els.letterFilter.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        state.letter = button.dataset.letter;
        renderLetterFilter(collectLetters(state.entries));
        render();
      });
    });
  }

  function collectLetters(entries) {
    return Array.from(new Set(entries.map((entry) => firstLetter(entry.mainName))))
      .sort((a, b) => THAI_COLLATOR.compare(a, b));
  }

  function firstLetter(value) {
    const first = clean(value).charAt(0);
    return first ? first.toLocaleUpperCase("en-US") : "#";
  }

  function buildSearchText(row, characters) {
    return normalizeSearch([
      row.UserID,
      row["Display Name"],
      row["Face Claim"],
      row["Main Character"],
      row["Main Faceclaim"],
      row.Race,
      row.Url,
      ...characters.flatMap((character) => [
        character.name,
        character.faceclaim,
        character.lockedFaceclaim
      ])
    ].join(" "));
  }

  function normalizeSlot(value) {
    return clean(value).toUpperCase().replace(/\s+/g, " ");
  }

  function normalizeSearch(value) {
    return clean(value).toLocaleLowerCase("th-TH").replace(/\s+/g, " ");
  }

  function clean(value) {
    return String(value || "").replace(/\uFEFF/g, "").trim();
  }

  function toNumber(value) {
    const parsed = Number(String(value || "").replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function parseBool(value) {
    const text = clean(value).toUpperCase();
    return text === "TRUE" || text === "YES" || text === "1" || text === "ใช่";
  }

  function isUrl(value) {
    return /^https?:\/\//i.test(clean(value));
  }

  function parseThaiDate(value) {
    const text = clean(value);
    const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) return null;
    return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  }

  function diffDays(start, end) {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.floor((startOfDay(end) - startOfDay(start)) / msPerDay);
  }

  function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function formatDisplayDate(date) {
    const day = pad2(date.getDate());
    const month = pad2(date.getMonth() + 1);
    const year = pad2((date.getFullYear() + 543) % 100);
    const hour = pad2(date.getHours());
    const minute = pad2(date.getMinutes());
    return `${day}/${month}/${year}, ${hour}:${minute} น.`;
  }

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function lockKey(userId, characterName) {
    return `${clean(userId)}::${normalizeSearch(characterName)}`;
  }

  function escapeHtml(value) {
    return clean(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }
})();
