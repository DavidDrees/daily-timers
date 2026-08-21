// @ts-check
import { getLocalDateString } from "./day.js";

/**
 * @typedef {import('./storage.js').DayRecord} DayRecord
 */

/**
 * Parses a "YYYY-MM-DD" string as a local-timezone date (never UTC — avoids
 * off-by-one-day bugs that `new Date("YYYY-MM-DD")` causes west of UTC).
 * @param {string} dateStr
 * @returns {Date}
 */
function parseDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * @param {Date} date
 * @param {number} n
 * @returns {Date}
 */
function addDays(date, n) {
  const next = new Date(date);
  next.setDate(next.getDate() + n);
  return next;
}

/**
 * Walks backward day-by-day from today so gaps (days with no history entry)
 * correctly break the streak. Today's completeness is passed in live
 * (computed from current in-memory state) since today isn't archived yet.
 * @param {Object<string, DayRecord>} history
 * @param {string} todayStr
 * @param {boolean} todayLiveComplete
 * @returns {number}
 */
export function computeCurrentStreak(history, todayStr, todayLiveComplete) {
  let streak = 0;
  let cursor = parseDate(todayStr);

  if (todayLiveComplete) {
    streak += 1;
    cursor = addDays(cursor, -1);
  } else {
    cursor = addDays(cursor, -1);
  }

  while (true) {
    const dateStr = getLocalDateString(cursor);
    const record = history[dateStr];
    if (record && record.allComplete) {
      streak += 1;
      cursor = addDays(cursor, -1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Chronological scan tracking the longest run of complete days; any missing
 * date (no history entry) breaks the run.
 * @param {Object<string, DayRecord>} history
 * @returns {number}
 */
export function computeLongestStreak(history) {
  const dates = Object.keys(history).sort();
  if (dates.length === 0) return 0;

  let longest = 0;
  let current = 0;
  let prevDate = /** @type {Date|null} */ (null);

  for (const dateStr of dates) {
    const record = history[dateStr];
    const date = parseDate(dateStr);
    const isConsecutive = prevDate !== null && getLocalDateString(addDays(prevDate, 1)) === dateStr;

    if (record.allComplete) {
      current = isConsecutive ? current + 1 : 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
    prevDate = date;
  }

  return longest;
}
