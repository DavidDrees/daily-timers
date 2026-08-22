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
 */
function playTone(ctx, freq, startTime, duration, peakGain = 0.18) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
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

export function playCompleteSound() {
  safely(() => {
    const ctx = getContext();
    const now = ctx.currentTime;
    playTone(ctx, 523.25, now, 0.14); // C5
    playTone(ctx, 659.25, now + 0.11, 0.14); // E5
    playTone(ctx, 783.99, now + 0.22, 0.32); // G5, held — little celebratory chime
  });
}
