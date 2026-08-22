// @ts-check
import { loadTimers, saveTimers, loadState, saveState, loadHistory, saveHistory, exportAll, importAll } from "./storage.js";
import { getLocalDateString, freshState, ensureCurrentDay, msUntilNextMidnight } from "./day.js";
import { createTimer, updateTimer, archiveTimer, startTimer, pauseTimer, ensureTimerEntry, isTimerComplete } from "./timers.js";
import { buildDayRecord } from "./history.js";
import { initTimersUI, renderTimers } from "./timers-ui.js";
import { initCalendarUI, renderCalendar } from "./calendar-ui.js";
import { playStartSound, playPauseSound, playCompleteSound } from "./sound.js";

/**
 * @typedef {import('./storage.js').TimerDef} TimerDef
 * @typedef {import('./storage.js').DayState} DayState
 * @typedef {import('./storage.js').DayRecord} DayRecord
 */

/** @type {TimerDef[]} */
let timers = loadTimers();
/** @type {Object<string, DayRecord>} */
let history = loadHistory();
/** @type {DayState} */
let state = loadState() || freshState(getLocalDateString(), timers.filter((t) => !t.archived).map((t) => t.id));

let midnightTimeoutId = /** @type {ReturnType<typeof setTimeout>|null} */ (null);
let checkpointIntervalId = /** @type {ReturnType<typeof setInterval>|null} */ (null);

// Tracks which timers we've already played the completion chime for today,
// so the sound fires once per timer per day (on the edge into completion)
// rather than on every render while it stays complete.
const completionSoundPlayed = new Set(
  timers.filter((t) => !t.archived && isTimerComplete(t, state, new Date())).map((t) => t.id)
);

function persistAll() {
  saveTimers(timers);
  saveState(state);
  saveHistory(history);
}

function rollForwardIfNeeded() {
  const result = ensureCurrentDay(timers, state, history, new Date());
  if (result.changed) {
    state = result.state;
    history = result.history;
    persistAll();
    completionSoundPlayed.clear();
  }
}

function checkCompletionSounds(now) {
  for (const timer of timers) {
    if (timer.archived) continue;
    const complete = isTimerComplete(timer, state, now);
    if (complete && !completionSoundPlayed.has(timer.id)) {
      completionSoundPlayed.add(timer.id);
      playCompleteSound();
    } else if (!complete && completionSoundPlayed.has(timer.id)) {
      completionSoundPlayed.delete(timer.id);
    }
  }
}

function render() {
  rollForwardIfNeeded();
  const now = new Date();
  checkCompletionSounds(now);
  renderTimers(timers, state, now);
  renderCalendar(history, buildDayRecord(timers, state, now), now);
}

// ---- Timer interactions ----
initTimersUI({
  onStartPause(timerId) {
    const now = new Date();
    if (state.runningTimerId === timerId) {
      state = pauseTimer(state, now);
      playPauseSound();
    } else {
      state = startTimer(state, timerId, now);
      playStartSound();
    }
    persistAll();
    render();
  },
  onFormSubmit({ id, name, targetSeconds }) {
    if (id) {
      timers = updateTimer(timers, id, { name, targetSeconds });
    } else {
      const order = timers.length;
      const timer = createTimer(name, targetSeconds, order);
      timers = [...timers, timer];
      state = ensureTimerEntry(state, timer.id);
    }
    persistAll();
    render();
  },
  onFormDelete(id) {
    const now = new Date();
    if (state.runningTimerId === id) {
      state = pauseTimer(state, now);
    }
    timers = archiveTimer(timers, id);
    persistAll();
    render();
  },
});

initCalendarUI(() => render());

// ---- Live countdown tick ----
// Re-renders both sections every second so the calendar's "today" cell
// flips to complete the moment a running timer crosses its target, not just
// on the next explicit start/pause/focus event.
setInterval(() => {
  const now = new Date();
  checkCompletionSounds(now);
  renderTimers(timers, state, now);
  renderCalendar(history, buildDayRecord(timers, state, now), now);
}, 1000);

// ---- Periodic checkpoint while a timer runs (crash safety) ----
checkpointIntervalId = setInterval(() => {
  if (state.runningTimerId) {
    persistAll();
  }
}, 15000);

// ---- Midnight rollover scheduling (safety net; visibilitychange/focus below are the real guard) ----
function scheduleMidnightCheck() {
  if (midnightTimeoutId) clearTimeout(midnightTimeoutId);
  midnightTimeoutId = setTimeout(() => {
    render();
    scheduleMidnightCheck();
  }, msUntilNextMidnight());
}
scheduleMidnightCheck();

// ---- Catch up rollover when the tab is refocused ----
// A running timer is intentionally left running across screen-off/backgrounding
// (e.g. a 90-minute standing-desk timer while the phone is locked) — it's only
// stopped when the user explicitly pauses it. Since `runningSince` is a wall-clock
// timestamp, elapsed time is always correctly recomputed from it on the next
// render, however long the app was backgrounded.
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) render();
});

window.addEventListener("focus", () => render());

// ---- Cross-tab sync ----
window.addEventListener("storage", () => {
  timers = loadTimers();
  history = loadHistory();
  state = loadState() || state;
  render();
});

// ---- Export / import ----
document.getElementById("export-btn")?.addEventListener("click", () => {
  const data = exportAll();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `daily-timers-backup-${getLocalDateString()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

const importInput = /** @type {HTMLInputElement} */ (document.getElementById("import-input"));
importInput?.addEventListener("change", async () => {
  const file = importInput.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    importAll(data);
    timers = loadTimers();
    history = loadHistory();
    state = loadState() || state;
    render();
  } catch (err) {
    alert("Could not import that file — it doesn't look like a valid Daily Timers backup.");
  } finally {
    importInput.value = "";
  }
});

// ---- Persistent storage (reduce eviction risk for history data) ----
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().catch(() => {});
}

// ---- Service worker registration ----
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}

// ---- Initial paint ----
persistAll();
render();
