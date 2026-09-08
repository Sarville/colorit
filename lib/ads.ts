import {getYsdk} from "./yandexSdk";
import {pauseAllAudio, resumeAllAudio} from "./audioFocus";

// ponytail: Yandex's own review guidelines cap fullscreen interstitials at once per minute,
// so 60s doubles as both "our" throttle and the platform floor - no config needed.
const MIN_INTERVAL_MS = 60_000;
let lastShownAt = 0;

export async function maybeShowLevelCompleteAd() {
  const now = Date.now();
  if (now - lastShownAt < MIN_INTERVAL_MS) {
    return;
  }
  const ysdk = await getYsdk();
  if (!ysdk) {
    return;
  }
  lastShownAt = now;
  ysdk.adv.showFullscreenAdv({
    callbacks: {
      onOpen: () => {
        pauseAllAudio();
      },
      onClose: () => {
        resumeAllAudio();
      },
      onError: () => {
        lastShownAt = 0; // let the next level completion retry
        resumeAllAudio();
      },
    },
  });
}
