import { canPlaySound, SOUND_STORAGE_KEY, soundEnabledFromStorage, type SoundKind } from "./experience";

let unlocked = false;
let audioCtx: AudioContext | null = null;

export function markAudioUnlocked() {
  unlocked = true;
}

export function isAudioUnlocked() {
  return unlocked;
}

export function readSoundEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return soundEnabledFromStorage(window.localStorage.getItem(SOUND_STORAGE_KEY));
  } catch {
    return true;
  }
}

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext;
  if (!Ctx) return null;
  if (!audioCtx) audioCtx = new Ctx();
  if (audioCtx.state === "suspended") void audioCtx.resume();
  return audioCtx;
}

function tone(
  ctx: AudioContext,
  freq: number,
  when: number,
  duration: number,
  type: OscillatorType,
  peak: number,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, when);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(peak, when + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(when);
  osc.stop(when + duration + 0.02);
}

/**
 * Very quiet synthesized tones. Nothing plays until a pointer or key gesture
 * has run, and nothing plays when the Settings toggle is off.
 */
export function playUiSound(kind: SoundKind) {
  if (!canPlaySound({ enabled: readSoundEnabled(), unlocked })) return;
  try {
    const ctx = context();
    if (!ctx) return;
    const now = ctx.currentTime;
    if (kind === "click") {
      tone(ctx, 620, now, 0.045, "sine", 0.025);
      return;
    }
    if (kind === "refresh") {
      tone(ctx, 440, now, 0.08, "sine", 0.02);
      tone(ctx, 560, now + 0.06, 0.09, "sine", 0.018);
      return;
    }
    tone(ctx, 523, now, 0.12, "triangle", 0.03);
    tone(ctx, 784, now + 0.09, 0.16, "triangle", 0.026);
  } catch {
    // Autoplay limits and headless browsers without an audio device are expected.
  }
}
