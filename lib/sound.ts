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

// A fresh `new Audio(src).play()` per call has to decode the file from scratch every time,
// which shows up as a noticeable lag on a rapid-fire sound like the click. Click gets a small
// pool of pre-loaded elements instead, cycled round-robin so overlapping clicks don't cut
// each other off. The one-off win fanfare doesn't need this - it never fires back-to-back.
const CLICK_SRC = "./sounds/click.wav";
const CLICK_POOL_SIZE = 4;
let clickPool: Array<HTMLAudioElement> = [];
let clickPoolIndex = 0;

function getClickPool(): Array<HTMLAudioElement> {
  if (clickPool.length === 0) {
    for (let i = 0; i < CLICK_POOL_SIZE; i++) {
      const el = new Audio(CLICK_SRC);
      el.preload = "auto";
      el.load();
      clickPool.push(el);
    }
  }
  return clickPool;
}

export function playClick() {
  if (!isSoundEnabled() || suppressed) {
    return;
  }
  const pool = getClickPool();
  const el = pool[clickPoolIndex];
  clickPoolIndex = (clickPoolIndex + 1) % pool.length;
  try {
    el.currentTime = 0;
  } catch {
    // Not seekable yet (still loading) - playing from wherever it is beats not playing at all.
  }
  el.volume = getSoundVolume() / 100;
  el.play().catch(() => {});
}

export function playWon() {
  if (!isSoundEnabled() || suppressed) {
    return;
  }
  const audio = new Audio("./sounds/won.wav");
  audio.volume = getSoundVolume() / 100;
  audio.play().catch(() => {});
}
