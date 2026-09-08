const STORAGE_KEY = "soundEnabled";

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

function play(src: string) {
  if (!isSoundEnabled() || suppressed) {
    return;
  }
  new Audio(src).play().catch(() => {});
}

export function playClick() {
  play("./sounds/click.wav");
}

export function playWon() {
  play("./sounds/won.wav");
}
