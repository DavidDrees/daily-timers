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

const COMPLETE_ALARM_SECONDS = 15;
const COMPLETE_BEEP_PERIOD = 1.0; // seconds between beep-pairs

// A repeating oven-timer-style buzzer (square wave, alternating pitch) that
// keeps going for 15 seconds — a single quick chime was too easy to miss
// when a 90-minute timer finishes with the phone out of hand.
export function playCompleteSound() {
  safely(() => {
    const ctx = getContext();
    const start = ctx.currentTime;
    for (let t = 0; t < COMPLETE_ALARM_SECONDS; t += COMPLETE_BEEP_PERIOD) {
      playTone(ctx, 880, start + t, 0.14, 0.24, "square");
      playTone(ctx, 659.25, start + t + 0.17, 0.14, 0.24, "square");
    }
  });
}
