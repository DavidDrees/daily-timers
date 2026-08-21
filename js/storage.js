// @ts-check

const PREFIX = "dailyTimers.v1";

const KEYS = {
  timers: `${PREFIX}.timers`,
  state: `${PREFIX}.state`,
  history: `${PREFIX}.history`,
};

/**
 * @typedef {Object} TimerDef
 * @property {string} id
 * @property {string} name
 * @property {number} targetSeconds
 * @property {string} createdAt
 * @property {boolean} archived
 * @property {number} order
 */

/**
 * @typedef {Object} PerTimerState
 * @property {number} accumulatedSeconds
 * @property {string|null} completedAt
 */

/**
 * @typedef {Object} DayState
 * @property {string} date
 * @property {Object<string, PerTimerState>} perTimer
 * @property {string|null} runningTimerId
 * @property {string|null} runningSince
 */

/**
 * @typedef {Object} DayRecord
 * @property {boolean} allComplete
 * @property {Object<string, {accumulatedSeconds:number, targetSeconds:number, complete:boolean}>} timers
 * @property {string} archivedAt
 */

function safeParse(json, fallback) {
  if (!json) return fallback;
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/** @returns {TimerDef[]} */
export function loadTimers() {
  return safeParse(localStorage.getItem(KEYS.timers), []);
}

/** @param {TimerDef[]} timers */
export function saveTimers(timers) {
  localStorage.setItem(KEYS.timers, JSON.stringify(timers));
}

/** @returns {DayState|null} */
export function loadState() {
  return safeParse(localStorage.getItem(KEYS.state), null);
}

/** @param {DayState} state */
export function saveState(state) {
  localStorage.setItem(KEYS.state, JSON.stringify(state));
}

/** @returns {Object<string, DayRecord>} */
export function loadHistory() {
  return safeParse(localStorage.getItem(KEYS.history), {});
}

/** @param {Object<string, DayRecord>} history */
export function saveHistory(history) {
  localStorage.setItem(KEYS.history, JSON.stringify(history));
}

/** @returns {{timers: TimerDef[], state: DayState|null, history: Object<string, DayRecord>}} */
export function exportAll() {
  return {
    timers: loadTimers(),
    state: loadState(),
    history: loadHistory(),
  };
}

/** @param {{timers: TimerDef[], state: DayState, history: Object<string, DayRecord>}} data */
export function importAll(data) {
  if (!data || typeof data !== "object") throw new Error("Invalid import data");
  if (Array.isArray(data.timers)) saveTimers(data.timers);
  if (data.state) saveState(data.state);
  if (data.history) saveHistory(data.history);
}

export const STORAGE_KEYS = KEYS;
