// @ts-check
// Small synthesized sound effects via the Web Audio API — no audio files to
// fetch/cache, so this works offline for free and needs no service-worker
// changes. Browsers require a user gesture before audio can play; the
// AudioContext is created lazily on first call, which always happens inside
// a click handler (start/pause), so autoplay restrictions aren't an issue.

let audioCtx = /** @type {AudioContext|null} */ (null);

function getContext() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * @param {AudioContext} ctx
 * @param {number} freq
 * @param {number} startTime
 * @param {number} duration
 * @param {number} [peakGain]
 * @param {OscillatorType} [type]
 */
function playTone(ctx, freq, startTime, duration, peakGain = 0.18, type = "sine") {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
  return osc;
}

// Web Audio can be unavailable or blocked in some contexts; sound is a
// nice-to-have, so failures are swallowed rather than surfaced to the user.
function safely(fn) {
  try {
    fn();
  } catch {
    // ignore
  }
}

export function playStartSound() {
  safely(() => {
    const ctx = getContext();
    const now = ctx.currentTime;
    playTone(ctx, 523.25, now, 0.12); // C5
    playTone(ctx, 784.0, now + 0.08, 0.16); // G5 — rising, "go"
  });
}

export function playPauseSound() {
  safely(() => {
    const ctx = getContext();
    const now = ctx.currentTime;
    playTone(ctx, 784.0, now, 0.1); // G5
    playTone(ctx, 523.25, now + 0.07, 0.16); // C5 — falling, "stop"
  });
}

const COMPLETE_ALARM_SECONDS = 10;
const COMPLETE_BEEP_PERIOD = 1.0; // seconds between beep-pairs

/**
 * Schedules the completion buzzer (repeating square-wave beep pair) to
 * begin `delaySeconds` from now, using the Web Audio clock rather than a JS
 * timer. This is deliberately called once, up front, at the moment a timer
 * is started — not discovered later by polling — because audio scheduling
 * runs on its own thread and keeps its timing even while the tab is
 * backgrounded and setInterval/setTimeout get throttled by the browser.
 * Returns the scheduled oscillator nodes so the caller can cancel them
 * (e.g. the user paused before the timer actually finished).
 * @param {number} delaySeconds
 * @returns {OscillatorNode[]}
 */
export function scheduleCompletionAlarm(delaySeconds) {
  /** @type {OscillatorNode[]} */
  const nodes = [];
  safely(() => {
    const ctx = getContext();
    const start = ctx.currentTime + Math.max(0, delaySeconds);
    for (let t = 0; t < COMPLETE_ALARM_SECONDS; t += COMPLETE_BEEP_PERIOD) {
      nodes.push(playTone(ctx, 880, start + t, 0.14, 0.24, "square"));
      nodes.push(playTone(ctx, 659.25, start + t + 0.17, 0.14, 0.24, "square"));
    }
  });
  return nodes;
}

/**
 * Cancels a previously scheduled alarm. Safe to call on nodes that have
 * already played (stopping an already-stopped oscillator just throws,
 * which `safely` swallows).
 * @param {OscillatorNode[]} nodes
 */
export function cancelScheduledAlarm(nodes) {
  for (const osc of nodes) {
    safely(() => osc.stop());
  }
}
