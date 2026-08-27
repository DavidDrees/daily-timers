// @ts-check
import { formatDuration } from "./utils.js";
import { getLiveRemaining, getLiveAccumulated, isTimerComplete } from "./timers.js";

/**
 * @typedef {import('./storage.js').TimerDef} TimerDef
 * @typedef {import('./storage.js').DayState} DayState
 */

const listEl = /** @type {HTMLElement} */ (document.getElementById("timer-list"));
const addBtn = /** @type {HTMLButtonElement} */ (document.getElementById("add-timer-btn"));
const formEl = /** @type {HTMLFormElement} */ (document.getElementById("timer-form"));
const formTitle = /** @type {HTMLElement} */ (document.getElementById("timer-form-title"));
const formId = /** @type {HTMLInputElement} */ (document.getElementById("timer-form-id"));
const formName = /** @type {HTMLInputElement} */ (document.getElementById("timer-form-name"));
const formMinutes = /** @type {HTMLInputElement} */ (document.getElementById("timer-form-minutes"));
const formSeconds = /** @type {HTMLInputElement} */ (document.getElementById("timer-form-seconds"));
const formDeleteBtn = /** @type {HTMLButtonElement} */ (document.getElementById("timer-form-delete"));
const formCancelBtn = /** @type {HTMLButtonElement} */ (document.getElementById("timer-form-cancel"));

/**
 * @param {{
 *   onStartPause: (timerId: string) => void,
 *   onFormSubmit: (data: {id: string|null, name: string, targetSeconds: number}) => void,
 *   onFormDelete: (id: string) => void,
 * }} handlers
 */
export function initTimersUI(handlers) {
  listEl.addEventListener("click", (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    const startBtn = target.closest("[data-action='start-pause']");
    if (startBtn instanceof HTMLElement && startBtn.dataset.id) {
      handlers.onStartPause(startBtn.dataset.id);
      return;
    }
    const nameBtn = target.closest("[data-action='edit']");
    if (nameBtn instanceof HTMLElement && nameBtn.dataset.id) {
      openEditForm(nameBtn.dataset.id, nameBtn.dataset.name || "", Number(nameBtn.dataset.target || 0));
    }
  });

  addBtn.addEventListener("click", () => openAddForm());
  formCancelBtn.addEventListener("click", () => closeForm());

  formEl.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = formName.value.trim();
    if (!name) return;
    const minutes = Math.max(0, Number(formMinutes.value) || 0);
    const seconds = Math.max(0, Math.min(59, Number(formSeconds.value) || 0));
    const targetSeconds = minutes * 60 + seconds;
    if (targetSeconds <= 0) {
      formMinutes.focus();
      return;
    }
    handlers.onFormSubmit({ id: formId.value || null, name, targetSeconds });
    closeForm();
  });

  formDeleteBtn.addEventListener("click", () => {
    if (!formId.value) return;
    handlers.onFormDelete(formId.value);
    closeForm();
  });
}

function openAddForm() {
  formTitle.textContent = "Add timer";
  formId.value = "";
  formName.value = "";
  formMinutes.value = "0";
  formSeconds.value = "0";
  formDeleteBtn.classList.add("hidden");
  formEl.classList.remove("hidden");
  formName.focus();
}

/**
 * @param {string} id
 * @param {string} name
 * @param {number} targetSeconds
 */
function openEditForm(id, name, targetSeconds) {
  formTitle.textContent = "Edit timer";
  formId.value = id;
  formName.value = name;
  formMinutes.value = String(Math.floor(targetSeconds / 60));
  formSeconds.value = String(targetSeconds % 60);
  formDeleteBtn.classList.remove("hidden");
  formEl.classList.remove("hidden");
  formName.focus();
}

function closeForm() {
  formEl.classList.add("hidden");
}

/**
 * @param {TimerDef[]} timers
 * @param {DayState} state
 * @param {Date} now
 */
export function renderTimers(timers, state, now) {
  const active = timers.filter((t) => !t.archived).sort((a, b) => a.order - b.order);

  if (active.length === 0) {
    listEl.innerHTML = `<p style="color:var(--text-dim)">No timers yet. Add one to get started.</p>`;
    return;
  }

  listEl.innerHTML = active
    .map((timer) => {
      const remaining = getLiveRemaining(timer, state, now);
      const accumulated = getLiveAccumulated(state, timer.id, now);
      const complete = isTimerComplete(timer, state, now);
      const isRunning = state.runningTimerId === timer.id;
      const pct = Math.min(100, Math.round((accumulated / timer.targetSeconds) * 100));

      return `
        <div class="timer-card ${complete ? "is-complete" : ""}">
          <div class="timer-card-top">
            <span class="timer-name">${escapeHtml(timer.name)}</span>
            <button type="button" class="icon-btn" data-action="edit" data-id="${timer.id}" data-name="${escapeAttr(timer.name)}" data-target="${timer.targetSeconds}" aria-label="Edit ${escapeAttr(timer.name)}" title="Edit">✏️</button>
          </div>
          <div class="timer-remaining">${complete ? "Done ✓" : formatDuration(remaining)}</div>
          <div class="progress-track">
            <div class="progress-fill" style="width:${pct}%"></div>
          </div>
          <div class="timer-card-actions">
            <button type="button" class="btn ${complete ? "btn-complete" : isRunning ? "btn-primary" : ""}" data-action="start-pause" data-id="${timer.id}" ${complete ? "disabled" : ""}>
              ${complete ? "Complete" : isRunning ? "Pause" : "Start"}
            </button>
          </div>
        </div>
      `;
    })
    .join("");
}

/** @param {string} s */
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c));
}

/** @param {string} s */
function escapeAttr(s) {
  return escapeHtml(s);
}
