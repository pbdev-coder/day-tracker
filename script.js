// ─── State ───────────────────────────────────────────────────────────────────
const DAYS = [
  "Sonntag",
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
];
const DAYS_SHORT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

// Storage: { [dayIndex 0-6]: [ { id, text, timeStart, timeEnd, done } ] }
function loadData() {
  try {
    return JSON.parse(localStorage.getItem("daytracker")) || {};
  } catch {
    return {};
  }
}
function saveData(data) {
  localStorage.setItem("daytracker", JSON.stringify(data));
}

let data = loadData();
let selectedDate = new Date();
let view = "day";
let editMode = false;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function dayIndex(date) {
  return date.getDay();
}
function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function formatDate(date) {
  return date.toLocaleDateString("de-AT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}
function sortByTime(acts) {
  return [...acts].sort((a, b) => {
    const ta = a.timeStart || "99:99";
    const tb = b.timeStart || "99:99";
    return ta.localeCompare(tb);
  });
}
function formatTimeRange(start, end) {
  if (!start && !end) return null;
  if (start && end) return `${start} – ${end}`;
  if (start) return `ab ${start}`;
  return `bis ${end}`;
}
function escHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Render ───────────────────────────────────────────────────────────────────
function render() {
  renderHeader();
  if (view === "day") renderDay();
  else renderWeek();
}

function renderHeader() {
  const h2 = document.getElementById("date-text");
  if (view === "day") {
    h2.textContent = formatDate(selectedDate);
  } else {
    const ws = getWeekStart(selectedDate);
    const we = new Date(ws);
    we.setDate(ws.getDate() + 6);
    h2.textContent = `KW – ${ws.toLocaleDateString("de-AT", { day: "2-digit", month: "short" })} – ${we.toLocaleDateString("de-AT", { day: "2-digit", month: "short", year: "numeric" })}`;
  }
}

function renderDay() {
  const container = document.querySelector(".day-process");
  container.querySelector(".activity-list")?.remove();

  const di = dayIndex(selectedDate);
  const activities = sortByTime(data[di] || []);

  const list = document.createElement("div");
  list.className = "activity-list";

  if (activities.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-hint";
    empty.textContent = `Noch keine Aktivitäten für ${DAYS[di]}`;
    list.appendChild(empty);
  }

  activities.forEach((act) => list.appendChild(createActivityItem(act, di)));

  container.appendChild(list);
  document.querySelector(".week-process").innerHTML = "";
}

function createActivityItem(act, di) {
  const item = document.createElement("div");
  item.className = "activity-item" + (act.done ? " done" : "");

  const checkbox = document.createElement("button");
  checkbox.className = "check-btn";
  checkbox.innerHTML = act.done
    ? '<span class="material-symbols-outlined">check_circle</span>'
    : '<span class="material-symbols-outlined">radio_button_unchecked</span>';
  checkbox.addEventListener("click", () => toggleDone(di, act.id));

  const content = document.createElement("div");
  content.className = "act-content";

  const label = document.createElement("span");
  label.className = "act-label";
  label.textContent = act.text;
  content.appendChild(label);

  const timeRange = formatTimeRange(act.timeStart, act.timeEnd);
  if (timeRange) {
    const timeEl = document.createElement("span");
    timeEl.className = "act-time";
    timeEl.innerHTML = `<span class="material-symbols-outlined">schedule</span>${timeRange}`;
    content.appendChild(timeEl);
  }

  item.appendChild(checkbox);
  item.appendChild(content);

  if (editMode) {
    const editActBtn = document.createElement("button");
    editActBtn.className = "edit-act-btn";
    editActBtn.innerHTML =
      '<span class="material-symbols-outlined">edit</span>';
    editActBtn.addEventListener("click", () => openPopup(di, act));
    item.appendChild(editActBtn);

    const del = document.createElement("button");
    del.className = "delete-btn";
    del.innerHTML = '<span class="material-symbols-outlined">delete</span>';
    del.addEventListener("click", () => deleteActivity(di, act.id));
    item.appendChild(del);
  }

  return item;
}

function renderWeek() {
  document.querySelector(".day-process .activity-list")?.remove();
  const wc = document.querySelector(".week-process");
  wc.innerHTML = "";
  const ws = getWeekStart(selectedDate);

  for (let i = 0; i < 7; i++) {
    const d = new Date(ws);
    d.setDate(ws.getDate() + i);
    const di = d.getDay();
    const activities = sortByTime(data[di] || []);
    const isToday = sameDay(d, new Date());

    const col = document.createElement("div");
    col.className = "week-col" + (isToday ? " today" : "");
    col.addEventListener("click", () => {
      selectedDate = d;
      view = "day";
      render();
    });

    col.innerHTML = `
      <div class="week-day-label">
        <span class="day-short">${DAYS_SHORT[di]}</span>
        <span class="day-num">${d.getDate()}</span>
      </div>`;

    const actList = document.createElement("div");
    actList.className = "week-act-list";
    activities.forEach((act) => {
      const dot = document.createElement("div");
      dot.className = "week-act-dot" + (act.done ? " done" : "");
      const time = act.timeStart
        ? `<span class="dot-time">${act.timeStart}</span>`
        : "";
      dot.innerHTML = `${time}${escHtml(act.text)}`;
      actList.appendChild(dot);
    });

    col.appendChild(actList);
    wc.appendChild(col);
  }
}

// ─── Popup ────────────────────────────────────────────────────────────────────
function openPopup(di, existingAct = null) {
  document.querySelector(".popup-overlay")?.remove();

  const isEdit = !!existingAct;
  const dayName = DAYS[di];

  const overlay = document.createElement("div");
  overlay.className = "popup-overlay";

  const popup = document.createElement("div");
  popup.className = "popup";

  popup.innerHTML = `
    <div class="popup-header">
      <div>
        <h3>${isEdit ? "Aktivität bearbeiten" : "Neue Aktivität"}</h3>
        ${!isEdit ? `<p class="popup-sub">Gilt für jeden <strong>${dayName}</strong></p>` : ""}
      </div>
      <button class="popup-close"><span class="material-symbols-outlined">close</span></button>
    </div>
    <div class="popup-body">
      <div class="popup-field">
        <label for="popup-text">Bezeichnung</label>
        <input type="text" id="popup-text" placeholder="z.B. Sport, Meeting, Medikament…" value="${isEdit ? escHtml(existingAct.text) : ""}" />
      </div>
      <div class="time-row">
        <div class="popup-field">
          <label for="popup-time-start">Startzeit <span class="optional">(optional)</span></label>
          <input type="time" id="popup-time-start" value="${isEdit && existingAct.timeStart ? existingAct.timeStart : ""}" />
        </div>
        <div class="popup-field">
          <label for="popup-time-end">Endzeit <span class="optional">(optional)</span></label>
          <input type="time" id="popup-time-end" value="${isEdit && existingAct.timeEnd ? existingAct.timeEnd : ""}" />
        </div>
      </div>
    </div>
    <div class="popup-footer">
      <button class="btn-cancel">Abbrechen</button>
      <button class="btn-save">${isEdit ? "Speichern" : "Hinzufügen"}</button>
    </div>
  `;

  overlay.appendChild(popup);
  document.body.appendChild(overlay);
  setTimeout(() => popup.querySelector("#popup-text").focus(), 60);
  requestAnimationFrame(() => overlay.classList.add("visible"));

  function closePopup() {
    overlay.classList.remove("visible");
    setTimeout(() => overlay.remove(), 260);
  }

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closePopup();
  });
  popup.querySelector(".popup-close").addEventListener("click", closePopup);
  popup.querySelector(".btn-cancel").addEventListener("click", closePopup);

  popup.querySelector(".btn-save").addEventListener("click", () => {
    const textInput = popup.querySelector("#popup-text");
    const text = textInput.value.trim();
    if (!text) {
      textInput.classList.add("shake");
      textInput.focus();
      setTimeout(() => textInput.classList.remove("shake"), 400);
      return;
    }
    const timeStart = popup.querySelector("#popup-time-start").value || null;
    const timeEnd = popup.querySelector("#popup-time-end").value || null;

    if (!data[di]) data[di] = [];

    if (isEdit) {
      const act = data[di].find((a) => a.id === existingAct.id);
      if (act) {
        act.text = text;
        act.timeStart = timeStart;
        act.timeEnd = timeEnd;
      }
    } else {
      data[di].push({
        id: Date.now().toString(),
        text,
        timeStart,
        timeEnd,
        done: false,
      });
    }

    saveData(data);
    render();
    closePopup();
  });

  popup.querySelector("#popup-text").addEventListener("keydown", (e) => {
    if (e.key === "Enter") popup.querySelector(".btn-save").click();
  });
}

// ─── Actions ─────────────────────────────────────────────────────────────────
function toggleDone(di, id) {
  if (!data[di]) return;
  const act = data[di].find((a) => a.id === id);
  if (act) {
    act.done = !act.done;
    saveData(data);
    render();
  }
}

function deleteActivity(di, id) {
  if (!data[di]) return;
  data[di] = data[di].filter((a) => a.id !== id);
  saveData(data);
  render();
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  // Theme toggle
  let isDark = localStorage.getItem("theme") !== "light";
  function applyTheme() {
    document.body.classList.toggle("light", !isDark);
    themeBtn.innerHTML = isDark
      ? '<span class="material-symbols-outlined">light_mode</span>'
      : '<span class="material-symbols-outlined">dark_mode</span>';
    themeBtn.title = isDark ? "Light Mode" : "Dark Mode";
  }
  const themeBtn = document.createElement("button");
  themeBtn.className = "theme-btn";
  themeBtn.addEventListener("click", () => {
    isDark = !isDark;
    localStorage.setItem("theme", isDark ? "dark" : "light");
    applyTheme();
  });
  document.querySelector(".day-process .header").prepend(themeBtn);
  applyTheme();

  const calBtn = document.querySelector(".day-process .header .cal-btn");
  calBtn.addEventListener("click", () => {
    view = view === "day" ? "week" : "day";
    render();
  });

  const editBtn = document.createElement("button");
  editBtn.className = "edit-btn";
  editBtn.title = "Bearbeiten";
  editBtn.innerHTML = '<span class="material-symbols-outlined">edit</span>';
  editBtn.addEventListener("click", () => {
    editMode = !editMode;
    editBtn.classList.toggle("active", editMode);
    render();
  });
  document.querySelector(".day-process .header").appendChild(editBtn);

  document
    .querySelector(".add-activity button")
    .addEventListener("click", () => {
      openPopup(dayIndex(selectedDate));
    });

  render();
});
