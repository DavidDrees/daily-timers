// @ts-check
import { getLocalDateString } from "./day.js";
import { getDayStatus, classifyDayRecord } from "./history.js";
import { computeCurrentStreak, computeLongestStreak } from "./streaks.js";

/**
 * @typedef {import('./storage.js').DayRecord} DayRecord
 */

const gridEl = /** @type {HTMLElement} */ (document.getElementById("calendar-grid"));
const monthLabelEl = /** @type {HTMLElement} */ (document.getElementById("cal-month-label"));
const prevBtn = /** @type {HTMLButtonElement} */ (document.getElementById("cal-prev"));
const nextBtn = /** @type {HTMLButtonElement} */ (document.getElementById("cal-next"));
const currentStreakEl = /** @type {HTMLElement} */ (document.getElementById("current-streak-value"));
const longestStreakEl = /** @type {HTMLElement} */ (document.getElementById("longest-streak-value"));

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const today = new Date();
let viewedYear = today.getFullYear();
let viewedMonth = today.getMonth();

/**
 * @param {() => void} onNavigate called after the viewed month changes, so the caller can re-render
 */
export function initCalendarUI(onNavigate) {
  prevBtn.addEventListener("click", () => {
    viewedMonth -= 1;
    if (viewedMonth < 0) {
      viewedMonth = 11;
      viewedYear -= 1;
    }
    onNavigate();
  });

  nextBtn.addEventListener("click", () => {
    viewedMonth += 1;
    if (viewedMonth > 11) {
      viewedMonth = 0;
      viewedYear += 1;
    }
    onNavigate();
  });
}

/**
 * @param {Object<string, DayRecord>} history
 * @param {DayRecord} todayRecord live day-record snapshot for today, built the same way an archived day is
 * @param {Date} [now]
 */
export function renderCalendar(history, todayRecord, now = new Date()) {
  const todayStr = getLocalDateString(now);
  const todayStatus = classifyDayRecord(todayRecord);

  monthLabelEl.textContent = `${MONTH_NAMES[viewedMonth]} ${viewedYear}`;

  const firstOfMonth = new Date(viewedYear, viewedMonth, 1);
  const leadingBlanks = firstOfMonth.getDay();
  const daysInMonth = new Date(viewedYear, viewedMonth + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < leadingBlanks; i++) {
    cells.push(`<div class="cal-day cal-empty"></div>`);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = getLocalDateString(new Date(viewedYear, viewedMonth, day));
    const isToday = dateStr === todayStr;
    const status = isToday ? todayStatus : getDayStatus(history, dateStr);
    cells.push(
      `<div class="cal-day status-${status} ${isToday ? "is-today" : ""}" title="${dateStr}">${day}</div>`
    );
  }

  gridEl.innerHTML =
    WEEKDAYS.map((w) => `<div class="cal-weekday">${w}</div>`).join("") + cells.join("");

  currentStreakEl.textContent = String(computeCurrentStreak(history, todayStr, todayRecord.allComplete));
  longestStreakEl.textContent = String(computeLongestStreak(history));
}
