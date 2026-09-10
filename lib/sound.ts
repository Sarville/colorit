const STORAGE_KEY = "soundEnabled";
const VOLUME_KEY = "soundVolume";
const DEFAULT_VOLUME = 100;

// Set while a fullscreen ad is showing or the tab is hidden - see lib/audioFocus.ts.
let suppressed = false;

export function suppressSound() {
  suppressed = true;
}

export function unsuppressSound() {
  suppressed = false;
}

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") {
    return true;
  }
  return localStorage.getItem(STORAGE_KEY) !== "false";
}

export function setSoundEnabled(enabled: boolean) {
  localStorage.setItem(STORAGE_KEY, String(enabled));
}

// 0-100, persisted separately from the on/off toggle above.
export function getSoundVolume(): number {
  if (typeof window === "undefined") {
    return DEFAULT_VOLUME;
  }
  const raw = localStorage.getItem(VOLUME_KEY);
  if (raw === null) {
    return DEFAULT_VOLUME;
  }
  const stored = Number(raw);
  return stored >= 0 && stored <= 100 ? stored : DEFAULT_VOLUME;
}

export function setSoundVolume(volume: number) {
  localStorage.setItem(VOLUME_KEY, String(volume));
}

// `new Audio(src).play()` has to spin up a fresh media pipeline every call, which in
// webviews (e.g. VK) shows up as audible lag even with the file preloaded. Decoding once
// into an in-memory AudioBuffer and firing it through Web Audio removes that per-play cost -
// playback starts as soon as start(0) is called, and concurrent plays don't cut each other off.
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }
  if (!audioCtx) {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) {
      return null;
    }
    audioCtx = new Ctor();
  }
  return audioCtx;
}

const CLICK_SRC = "./sounds/click.wav";
const WON_SRC = "./sounds/won.wav";

const buffers = new Map<string, AudioBuffer>();
const loading = new Map<string, Promise<AudioBuffer | null>>();

function loadBuffer(ctx: AudioContext, src: string): Promise<AudioBuffer | null> {
  let promise = loading.get(src);
  if (!promise) {
    promise = fetch(src)
      .then((res) => res.arrayBuffer())
      .then((data) => ctx.decodeAudioData(data))
      .then((buffer) => {
        buffers.set(src, buffer);
        return buffer;
      })
      .catch(() => null);
    loading.set(src, promise);
  }
  return promise;
}

// Kick off decoding as soon as the module loads, so buffers are ready before the first click.
{
  const ctx = getAudioContext();
  if (ctx) {
    loadBuffer(ctx, CLICK_SRC);
    loadBuffer(ctx, WON_SRC);
  }
}

function playBuffer(ctx: AudioContext, buffer: AudioBuffer) {
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.value = getSoundVolume() / 100;
  source.connect(gain).connect(ctx.destination);
  source.start(0);
}

function play(src: string) {
  if (!isSoundEnabled() || suppressed) {
    return;
  }
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  const buffer = buffers.get(src);
  if (buffer) {
    playBuffer(ctx, buffer);
  } else {
    // Not decoded yet (e.g. very first interaction) - play as soon as it lands.
    loadBuffer(ctx, src).then((b) => b && playBuffer(ctx, b));
  }
}

export function playClick() {
  play(CLICK_SRC);
}

export function playWon() {
  play(WON_SRC);
}
