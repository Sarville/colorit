const STORAGE_KEY = "musicEnabled";

const MENU_TRACK = "./sounds/music/menu.mp3";
const GAME_TRACKS = [
  "./sounds/music/game-1.mp3",
  "./sounds/music/game-2.mp3",
  "./sounds/music/game-3.mp3",
  "./sounds/music/game-4.mp3",
  "./sounds/music/game-5.mp3",
  "./sounds/music/game-6.mp3",
];

let audio: HTMLAudioElement | null = null;
let playlist: Array<string> = [];
let playlistIndex = 0;
let currentSrc: string | null = null;
// Set while a fullscreen ad is showing or the tab is hidden - see lib/audioFocus.ts.
let suppressed = false;

export function suppressMusic() {
  suppressed = true;
  audio?.pause();
}

export function unsuppressMusic() {
  suppressed = false;
  if (isMusicEnabled() && audio) {
    attemptPlay(audio);
  }
}

// Same event set Howler.js's autoplay-unlock uses (touchstart/touchend/click/keydown), on top of
// pointerdown - covers devices/browsers where one of these doesn't fire so the first real
// interaction, whatever form it takes, is never missed.
const UNLOCK_EVENTS = ["pointerdown", "touchstart", "touchend", "click", "keydown"] as const;

function getAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio();
    audio.addEventListener("ended", playNext);
    // The very first play() before any interaction happens muted (below) so it's already
    // running the instant the tap arrives - this listener just unmutes and, as a fallback,
    // retries play() if it's somehow still paused. Stays attached rather than removing itself
    // after one tap: a blocked play() rejects asynchronously, so .paused can still optimistically
    // read false right after that tap, making a one-shot "unlock" miss its only chance.
    UNLOCK_EVENTS.forEach((event) => window.addEventListener(event, unmuteAndResume));
  }
  return audio;
}

function unmuteAndResume() {
  if (!audio) {
    return;
  }
  audio.muted = false;
  if (isMusicEnabled() && !suppressed && audio.paused && audio.src) {
    audio.play().catch(() => {});
  }
}

function attemptPlay(el: HTMLAudioElement) {
  el.play().catch(() => {
    // Autoplay with sound needs a user gesture we don't have yet - autoplay muted instead
    // (browsers always allow that) so the track is already running and just needs unmuteAndResume
    // to make it audible, rather than only starting on the first tap.
    el.muted = true;
    el.play().catch(() => {});
  });
}

function shuffled(tracks: Array<string>): Array<string> {
  const copy = [...tracks];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function playNext() {
  if (playlist.length === 0) {
    return;
  }
  playlistIndex = (playlistIndex + 1) % playlist.length;
  playTrack(playlist[playlistIndex]);
}

function playTrack(src: string) {
  if (src === currentSrc) {
    return;
  }
  currentSrc = src;
  const el = getAudio();
  el.loop = playlist.length === 1;
  el.src = src;
  if (isMusicEnabled() && !suppressed) {
    attemptPlay(el);
  }
}

export function isMusicEnabled(): boolean {
  if (typeof window === "undefined") {
    return true;
  }
  return localStorage.getItem(STORAGE_KEY) !== "false";
}

export function setMusicEnabled(enabled: boolean) {
  localStorage.setItem(STORAGE_KEY, String(enabled));
  const el = getAudio();
  if (enabled && !suppressed) {
    attemptPlay(el);
  } else {
    el.pause();
  }
}

export function playMenuMusic() {
  playlist = [MENU_TRACK];
  playlistIndex = 0;
  playTrack(MENU_TRACK);
}

export function playGameMusic() {
  playlist = shuffled(GAME_TRACKS);
  playlistIndex = 0;
  playTrack(playlist[0]);
}
