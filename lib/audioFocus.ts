import {suppressMusic, unsuppressMusic} from "./music";
import {suppressSound, unsuppressSound} from "./sound";

export function pauseAllAudio() {
  suppressMusic();
  suppressSound();
}

export function resumeAllAudio() {
  unsuppressMusic();
  unsuppressSound();
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      pauseAllAudio();
    } else {
      resumeAllAudio();
    }
  });
}
