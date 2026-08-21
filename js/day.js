// @ts-check
import { settleRunning } from "./timers.js";
import { buildDayRecord } from "./history.js";

/**
 * @typedef {import('./storage.js').TimerDef} TimerDef
 * @typedef {import('./storage.js').DayState} DayState
 * @typedef {import('./storage.js').DayRecord} DayRecord
 */

/**
 * Local (not UTC) date string, so midnight rollover and DST fall out of the
 * platform Date object instead of manual offset math.
 * @param {Date} [date]
 * @returns {string} "YYYY-MM-DD"
 */
export function getLocalDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * @param {string[]} timerIds
 * @returns {DayState}
 */
export function freshState(date, timerIds) {
  /** @type {DayState['perTimer']} */
  const perTimer = {};
  for (const id of timerIds) perTimer[id] = { accumulatedSeconds: 0, completedAt: null };
  return { date, perTimer, runningTimerId: null, runningSince: null };
}

/**
 * Ensures `state`/`history` reflect "today". If the stored state belongs to
 * a past local date, settles any running timer, archives that day into
 * history, and resets state for today. No-ops if already current, and
 * defensively ignores a system clock that moved backward (never destroys
 * same-day progress).
 *
 * @param {TimerDef[]} timers
 * @param {DayState} state
 * @param {Object<string, DayRecord>} history
 * @param {Date} [now]
 * @returns {{state: DayState, history: Object<string, DayRecord>, changed: boolean}}
 */
export function ensureCurrentDay(timers, state, history, now = new Date()) {
  const today = getLocalDateString(now);

  if (today === state.date) {
    return { state, history, changed: false };
  }

  if (today < state.date) {
    // Clock moved backward — don't archive or reset, just leave things as-is.
    return { state, history, changed: false };
  }

  const settled = settleRunning(state, now);
  const dayRecord = buildDayRecord(timers, settled, now);
  const nextHistory = { ...history, [state.date]: dayRecord };
  const nextState = freshState(
    today,
    timers.filter((t) => !t.archived).map((t) => t.id)
  );

  return { state: nextState, history: nextHistory, changed: true };
}

/**
 * Milliseconds until 5s after the next local midnight, for scheduling a
 * live rollover check while the app stays open.
 * @param {Date} [now]
 * @returns {number}
 */
export function msUntilNextMidnight(now = new Date()) {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5, 0);
  return next.getTime() - now.getTime();
}
