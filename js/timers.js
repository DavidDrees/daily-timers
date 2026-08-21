// @ts-check
import { uuid } from "./utils.js";

/**
 * @typedef {import('./storage.js').TimerDef} TimerDef
 * @typedef {import('./storage.js').DayState} DayState
 */

/** Absolute safety cap on a single uninterrupted run session, in seconds.
 * Protects against a missed pause/settle event (e.g. laptop slept while a
 * timer was running) silently accumulating hours of bogus time. */
export const MAX_AUTO_RUN_SECONDS = 6 * 3600;

/**
 * @param {string} name
 * @param {number} targetSeconds
 * @param {number} order
 * @returns {TimerDef}
 */
export function createTimer(name, targetSeconds, order) {
  return {
    id: uuid(),
    name: name.trim(),
    targetSeconds: Math.max(1, Math.round(targetSeconds)),
    createdAt: new Date().toISOString(),
    archived: false,
    order,
  };
}

/**
 * @param {TimerDef[]} timers
 * @param {string} id
 * @param {{name?: string, targetSeconds?: number}} updates
 * @returns {TimerDef[]}
 */
export function updateTimer(timers, id, updates) {
  return timers.map((t) => {
    if (t.id !== id) return t;
    const next = { ...t };
    if (updates.name !== undefined) next.name = updates.name.trim();
    if (updates.targetSeconds !== undefined) next.targetSeconds = Math.max(1, Math.round(updates.targetSeconds));
    return next;
  });
}

/**
 * Soft-delete: keeps past history snapshots intact, drops it from future
 * "all complete" checks and the dashboard.
 * @param {TimerDef[]} timers
 * @param {string} id
 * @returns {TimerDef[]}
 */
export function archiveTimer(timers, id) {
  return timers.map((t) => (t.id === id ? { ...t, archived: true } : t));
}

/**
 * @param {DayState} state
 * @param {string} timerId
 * @param {Date} now
 * @returns {DayState}
 */
export function startTimer(state, timerId, now) {
  const settled = settleRunning(state, now);
  return {
    ...settled,
    runningTimerId: timerId,
    runningSince: now.toISOString(),
  };
}

/**
 * Pause whatever is currently running (no-op if nothing is running).
 * @param {DayState} state
 * @param {Date} now
 * @returns {DayState}
 */
export function pauseTimer(state, now) {
  return settleRunning(state, now);
}

/**
 * Folds any in-progress run into accumulatedSeconds and clears the running
 * pointer. Caps the elapsed session at MAX_AUTO_RUN_SECONDS.
 * @param {DayState} state
 * @param {Date} now
 * @returns {DayState}
 */
export function settleRunning(state, now) {
  if (!state.runningTimerId || !state.runningSince) return state;

  const elapsedSeconds = clampElapsed((now.getTime() - new Date(state.runningSince).getTime()) / 1000);
  const timerId = state.runningTimerId;
  const prevEntry = state.perTimer[timerId] || { accumulatedSeconds: 0, completedAt: null };
  const accumulatedSeconds = prevEntry.accumulatedSeconds + elapsedSeconds;

  return {
    ...state,
    perTimer: {
      ...state.perTimer,
      [timerId]: {
        accumulatedSeconds,
        completedAt: prevEntry.completedAt,
      },
    },
    runningTimerId: null,
    runningSince: null,
  };
}

function clampElapsed(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return 0;
  return Math.min(seconds, MAX_AUTO_RUN_SECONDS);
}

/**
 * Ensures `state.perTimer` has an entry for a timer (e.g. one just created
 * mid-day, after the day's state was already initialized).
 * @param {DayState} state
 * @param {string} timerId
 * @returns {DayState}
 */
export function ensureTimerEntry(state, timerId) {
  if (state.perTimer[timerId]) return state;
  return {
    ...state,
    perTimer: { ...state.perTimer, [timerId]: { accumulatedSeconds: 0, completedAt: null } },
  };
}

/**
 * Live accumulated seconds for a timer, including any in-progress run.
 * @param {DayState} state
 * @param {string} timerId
 * @param {Date} now
 * @returns {number}
 */
export function getLiveAccumulated(state, timerId, now) {
  const entry = state.perTimer[timerId] || { accumulatedSeconds: 0, completedAt: null };
  if (state.runningTimerId === timerId && state.runningSince) {
    return entry.accumulatedSeconds + clampElapsed((now.getTime() - new Date(state.runningSince).getTime()) / 1000);
  }
  return entry.accumulatedSeconds;
}

/**
 * @param {TimerDef} timer
 * @param {DayState} state
 * @param {Date} now
 * @returns {number} seconds remaining, floored at 0
 */
export function getLiveRemaining(timer, state, now) {
  return Math.max(0, timer.targetSeconds - getLiveAccumulated(state, timer.id, now));
}

/**
 * @param {TimerDef} timer
 * @param {DayState} state
 * @param {Date} now
 * @returns {boolean}
 */
export function isTimerComplete(timer, state, now) {
  return getLiveAccumulated(state, timer.id, now) >= timer.targetSeconds;
}
