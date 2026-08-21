// @ts-check
import { getLiveAccumulated } from "./timers.js";

/**
 * @typedef {import('./storage.js').TimerDef} TimerDef
 * @typedef {import('./storage.js').DayState} DayState
 * @typedef {import('./storage.js').DayRecord} DayRecord
 */

/**
 * Build a day record snapshot from the current timer defs + accumulated state.
 * Archived timers are excluded from the completeness check. Uses live
 * accumulated time (including any timer currently running), so this is safe
 * to call both for archiving a past day (already settled, so live time is a
 * no-op) and for a live "today" preview while a timer is still running.
 * @param {TimerDef[]} timers
 * @param {DayState} state
 * @param {Date} [now]
 * @returns {DayRecord}
 */
export function buildDayRecord(timers, state, now = new Date()) {
  const activeTimers = timers.filter((t) => !t.archived);
  /** @type {DayRecord['timers']} */
  const perTimer = {};
  let allComplete = activeTimers.length > 0;

  for (const timer of activeTimers) {
    const accumulatedSeconds = getLiveAccumulated(state, timer.id, now);
    const complete = accumulatedSeconds >= timer.targetSeconds;
    perTimer[timer.id] = {
      accumulatedSeconds,
      targetSeconds: timer.targetSeconds,
      complete,
    };
    if (!complete) allComplete = false;
  }

  return {
    allComplete,
    timers: perTimer,
    archivedAt: now.toISOString(),
  };
}

/**
 * Classifies a day into one of four states:
 * - "no-data": the day was never recorded (app not opened) or had no active timer goals
 * - "incomplete": there were timer goals but nothing was tracked at all
 * - "partial": some time was tracked but not every goal was met
 * - "complete": every goal was met
 * @param {DayRecord|undefined|null} record
 * @returns {'complete'|'partial'|'incomplete'|'no-data'}
 */
export function classifyDayRecord(record) {
  if (!record) return "no-data";
  const entries = Object.values(record.timers);
  if (entries.length === 0) return "no-data";
  if (record.allComplete) return "complete";
  const anyTracked = entries.some((entry) => entry.accumulatedSeconds > 0);
  return anyTracked ? "partial" : "incomplete";
}

/**
 * @param {Object<string, DayRecord>} history
 * @param {string} dateStr
 * @returns {'complete'|'partial'|'incomplete'|'no-data'}
 */
export function getDayStatus(history, dateStr) {
  return classifyDayRecord(history[dateStr]);
}
