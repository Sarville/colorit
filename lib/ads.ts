import {getYsdk} from "./yandexSdk";
import {getVkBridge} from "./vkSdk";
import {pauseAllAudio, resumeAllAudio} from "./audioFocus";
import {isAdsDisabled} from "./support";

// ponytail: Yandex's own review guidelines cap fullscreen interstitials at once per minute,
// so 60s doubles as both "our" throttle and the platform floor - no config needed.
const MIN_INTERVAL_MS = 60_000;
let lastShownAt = 0;

export async function maybeShowLevelCompleteAd() {
  const now = Date.now();
  if (now - lastShownAt < MIN_INTERVAL_MS) {
    return;
  }
  if (await isAdsDisabled()) {
    return;
  }
  const ysdk = await getYsdk();
  if (ysdk) {
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
    return;
  }
  const vk = getVkBridge();
  if (!vk) {
    return;
  }
  try {
    const {result: available} = await vk.send("VKWebAppCheckNativeAds", {ad_format: "interstitial"});
    if (!available) {
      return;
    }
    lastShownAt = now;
    pauseAllAudio();
    await vk.send("VKWebAppShowNativeAds", {ad_format: "interstitial"});
  } catch {
    lastShownAt = 0; // let the next level completion retry
  } finally {
    resumeAllAudio();
  }
}
