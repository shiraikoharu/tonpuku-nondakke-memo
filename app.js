const RECORDS_KEY = "tonpukuCountMemoRecords";
const SETTINGS_KEY = "tonpukuCountMemoSettings";
const DEFAULT_SETTINGS = { dailyLimit: 3 };

const state = {
  records: [],
  settings: { ...DEFAULT_SETTINGS },
  viewYear: 0,
  viewMonth: 0,
  selectedDate: "",
  toastTimer: 0
};

const els = {
  todayDate: document.getElementById("todayDate"),
  todayCount: document.getElementById("todayCount"),
  remainingText: document.getElementById("remainingText"),
  lastTime: document.getElementById("lastTime"),
  limitNote: document.getElementById("limitNote"),
  takenButton: document.getElementById("takenButton"),
  toast: document.getElementById("toast"),
  dailyLimit: document.getElementById("dailyLimit"),
  calendarTitle: document.getElementById("calendarTitle"),
  calendarGrid: document.getElementById("calendarGrid"),
  prevMonth: document.getElementById("prevMonth"),
  nextMonth: document.getElementById("nextMonth"),
  detailTitle: document.getElementById("detailTitle"),
  detailTotal: document.getElementById("detailTotal"),
  countAdjust: document.getElementById("countAdjust"),
  recordList: document.getElementById("recordList"),
  exportButton: document.getElementById("exportButton"),
  importButton: document.getElementById("importButton"),
  importFile: document.getElementById("importFile")
};

function pad2(value) {
  return String(value).padStart(2, "0");
}

function localDateKey(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function localTime(date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function localIsoWithOffset(date) {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absolute = Math.abs(offsetMinutes);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}.${String(date.getMilliseconds()).padStart(3, "0")}${sign}${pad2(Math.floor(absolute / 60))}:${pad2(absolute % 60)}`;
}

function formatJapaneseDate(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${year}年${month}月${day}日（${weekdays[date.getDay()]}）`;
}

function formatShortDate(dateKey) {
  const [, month, day] = dateKey.split("-").map(Number);
  return `${month}/${day}`;
}

function loadRecords() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECORDS_KEY) || "[]");
    state.records = Array.isArray(parsed) ? parsed.filter(isRecordLike) : [];
  } catch {
    state.records = [];
  }
}

function loadSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    const dailyLimit = Number(parsed.dailyLimit);
    state.settings = {
      dailyLimit: Number.isInteger(dailyLimit) && dailyLimit >= 1 && dailyLimit <= 10
        ? dailyLimit
        : DEFAULT_SETTINGS.dailyLimit
    };
  } catch {
    state.settings = { ...DEFAULT_SETTINGS };
  }
}

function saveRecords() {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(state.records));
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
}

function isRecordLike(record) {
  return record
    && typeof record.id === "string"
    && /^\d{4}-\d{2}-\d{2}$/.test(record.date)
    && /^\d{2}:\d{2}$/.test(record.time);
}

function recordsForDate(dateKey) {
  return state.records
    .filter((record) => record.date === dateKey)
    .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
}

function makeRecord(now, options = {}) {
  const randomSource = window.crypto || window.msCrypto;
  const randomPart = randomSource && randomSource.getRandomValues
    ? randomSource.getRandomValues(new Uint32Array(1))[0].toString(36)
    : Math.random().toString(36).slice(2);

  const record = {
    id: `${Date.now()}-${randomPart}`,
    date: options.dateKey || localDateKey(now),
    time: localTime(now),
    createdAt: localIsoWithOffset(now)
  };

  if (options.manual) {
    record.manual = true;
  }

  return record;
}

function showToast(message) {
  window.clearTimeout(state.toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  state.toastTimer = window.setTimeout(() => {
    els.toast.classList.remove("is-visible");
  }, 1400);
}

function addRecord() {
  const record = makeRecord(new Date());
  state.records.push(record);
  saveRecords();
  state.selectedDate = record.date;
  render();
  showToast("記録しました");
}

function addManualRecordForSelectedDate() {
  const record = makeRecord(new Date(), {
    dateKey: state.selectedDate,
    manual: true
  });
  state.records.push(record);
  saveRecords();
  render();
}

function removeLatestRecordForSelectedDate() {
  const selectedRecords = recordsForDate(state.selectedDate);
  const latest = selectedRecords[selectedRecords.length - 1];
  if (!latest) {
    return;
  }

  state.records = state.records.filter((record) => record.id !== latest.id);
  saveRecords();
  render();
}

function deleteRecord(id) {
  if (!window.confirm("この記録を削除しますか？")) {
    return;
  }
  state.records = state.records.filter((record) => record.id !== id);
  saveRecords();
  render();
}

function renderLimitOptions() {
  els.dailyLimit.innerHTML = "";
  for (let count = 1; count <= 10; count += 1) {
    const option = document.createElement("option");
    option.value = String(count);
    option.textContent = `${count}回`;
    els.dailyLimit.append(option);
  }
  els.dailyLimit.value = String(state.settings.dailyLimit);
}

function renderToday() {
  const today = localDateKey(new Date());
  const todaysRecords = recordsForDate(today);
  const limit = state.settings.dailyLimit;
  const remaining = limit - todaysRecords.length;
  const lastTimedRecord = [...todaysRecords].reverse().find((record) => record.manual !== true);

  els.todayDate.textContent = formatJapaneseDate(today);
  els.todayCount.textContent = `${todaysRecords.length}回`;
  els.lastTime.textContent = lastTimedRecord ? lastTimedRecord.time : "--:--";
  els.remainingText.classList.toggle("is-limit", remaining <= 0);

  if (remaining > 0) {
    els.remainingText.textContent = `あと${remaining}回`;
  } else {
    els.remainingText.textContent = "今日の上限に達しています";
  }

  els.limitNote.hidden = todaysRecords.length <= limit;
}

function renderCalendar() {
  const todayKey = localDateKey(new Date());
  const selectedKey = state.selectedDate;
  const year = state.viewYear;
  const month = state.viewMonth;
  const firstDate = new Date(year, month, 1);
  const lastDate = new Date(year, month + 1, 0);
  const firstDay = firstDate.getDay();
  const daysInMonth = lastDate.getDate();

  els.calendarTitle.textContent = `${year}年${month + 1}月`;
  els.calendarGrid.innerHTML = "";

  for (let index = 0; index < firstDay; index += 1) {
    const empty = document.createElement("div");
    empty.className = "day-cell is-empty";
    els.calendarGrid.append(empty);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = `${year}-${pad2(month + 1)}-${pad2(day)}`;
    const count = recordsForDate(dateKey).length;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "day-cell";
    button.classList.toggle("is-today", dateKey === todayKey);
    button.classList.toggle("is-selected", dateKey === selectedKey);
    button.setAttribute("aria-label", `${formatJapaneseDate(dateKey)} ${count}回`);
    button.innerHTML = `<span>${day}</span>${count ? `<span class="day-count">${count}回</span>` : ""}`;
    button.addEventListener("click", () => {
      state.selectedDate = dateKey;
      render();
      document.getElementById("detailCard").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    els.calendarGrid.append(button);
  }
}

function renderDetail() {
  const selectedRecords = recordsForDate(state.selectedDate);
  els.detailTitle.textContent = formatShortDate(state.selectedDate);
  els.detailTotal.textContent = `合計 ${selectedRecords.length}回`;
  els.countAdjust.innerHTML = "";
  els.recordList.innerHTML = "";

  const minusButton = document.createElement("button");
  minusButton.type = "button";
  minusButton.className = "adjust-button";
  minusButton.textContent = "−";
  minusButton.setAttribute("aria-label", "この日の回数を1回減らす");
  minusButton.disabled = selectedRecords.length === 0;
  minusButton.addEventListener("click", removeLatestRecordForSelectedDate);

  const count = document.createElement("span");
  count.className = "adjust-count";
  count.textContent = `${selectedRecords.length}回`;

  const plusButton = document.createElement("button");
  plusButton.type = "button";
  plusButton.className = "adjust-button";
  plusButton.textContent = "+";
  plusButton.setAttribute("aria-label", "この日の回数を1回増やす");
  plusButton.addEventListener("click", addManualRecordForSelectedDate);

  els.countAdjust.append(minusButton, count, plusButton);

  if (selectedRecords.length === 0) {
    const empty = document.createElement("p");
    empty.className = "record-empty";
    empty.textContent = "この日の記録はありません。";
    els.recordList.append(empty);
    return;
  }

  selectedRecords.forEach((record) => {
    const row = document.createElement("div");
    row.className = "record-row";

    const timeWrap = document.createElement("span");
    timeWrap.className = "record-time-wrap";

    const time = document.createElement("span");
    time.className = "record-time";
    time.textContent = record.manual === true ? "手動追加" : record.time;
    timeWrap.append(time);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "delete-button";
    button.textContent = "削除";
    button.addEventListener("click", () => deleteRecord(record.id));

    row.append(timeWrap, button);
    els.recordList.append(row);
  });
}

function render() {
  renderToday();
  renderCalendar();
  renderDetail();
}

function exportBackup() {
  const backup = {
    app: "tonpuku-count-memo",
    exportedAt: localIsoWithOffset(new Date()),
    records: state.records,
    settings: state.settings
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `tonpuku-count-memo-${localDateKey(new Date())}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function importBackupFile(file) {
  if (!file) {
    return;
  }
  if (!window.confirm("現在の記録を復元データで置き換えます。よろしいですか？")) {
    els.importFile.value = "";
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const parsed = JSON.parse(String(reader.result || "{}"));
      const importedRecords = Array.isArray(parsed) ? parsed : parsed.records;
      const importedSettings = Array.isArray(parsed) ? DEFAULT_SETTINGS : parsed.settings || DEFAULT_SETTINGS;
      const dailyLimit = Number(importedSettings.dailyLimit);

      if (!Array.isArray(importedRecords)) {
        throw new Error("records is not an array");
      }

      state.records = importedRecords.filter(isRecordLike);
      state.settings = {
        dailyLimit: Number.isInteger(dailyLimit) && dailyLimit >= 1 && dailyLimit <= 10
          ? dailyLimit
          : DEFAULT_SETTINGS.dailyLimit
      };
      saveRecords();
      saveSettings();
      renderLimitOptions();
      render();
      showToast("復元しました");
    } catch {
      window.alert("JSONファイルを読み込めませんでした。");
    } finally {
      els.importFile.value = "";
    }
  });
  reader.readAsText(file);
}

function bindEvents() {
  els.takenButton.addEventListener("click", addRecord);
  els.dailyLimit.addEventListener("change", () => {
    state.settings.dailyLimit = Number(els.dailyLimit.value);
    saveSettings();
    render();
  });
  els.prevMonth.addEventListener("click", () => {
    state.viewMonth -= 1;
    if (state.viewMonth < 0) {
      state.viewMonth = 11;
      state.viewYear -= 1;
    }
    renderCalendar();
  });
  els.nextMonth.addEventListener("click", () => {
    state.viewMonth += 1;
    if (state.viewMonth > 11) {
      state.viewMonth = 0;
      state.viewYear += 1;
    }
    renderCalendar();
  });
  els.exportButton.addEventListener("click", exportBackup);
  els.importButton.addEventListener("click", () => els.importFile.click());
  els.importFile.addEventListener("change", () => importBackupFile(els.importFile.files[0]));
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }
}

function init() {
  const now = new Date();
  state.viewYear = now.getFullYear();
  state.viewMonth = now.getMonth();
  state.selectedDate = localDateKey(now);
  loadRecords();
  loadSettings();
  renderLimitOptions();
  bindEvents();
  render();
  registerServiceWorker();
}

init();
