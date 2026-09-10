import {getYsdk} from "./yandexSdk";
import {getVkBridge} from "./vkSdk";
import {pauseAllAudio, resumeAllAudio} from "./audioFocus";
import {isAdsDisabled} from "./support";

// Yandex-only: the sticky banner (position/API-control configured in the Yandex Games cabinet,
// see docs/vk-gotchas.md) has no VK equivalent in this codebase. getYsdk() resolves to a non-null
// "lite" SDK even outside a real Yandex frame (see lib/yandexSdk.ts), so calling showBannerAdv()
// there is harmless - it just reports ADV_IS_NOT_CONNECTED and is swallowed here.
export async function updateStickyBanner(adsDisabled: boolean): Promise<void> {
  const ysdk = await getYsdk();
  if (!ysdk) {
    return;
  }
  const call = adsDisabled ? ysdk.adv.hideBannerAdv() : ysdk.adv.showBannerAdv();
  await call.catch(() => {});
}

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
    console.error("No ad provider available (not running in Yandex Games or VK)");
    return;
  }
  try {
    const {result: available} = await vk.send("VKWebAppCheckNativeAds", {ad_format: "interstitial"});
    if (!available) {
      console.error("VK reports no native ad available (ad_format: interstitial)");
      return;
    }
    lastShownAt = now;
    pauseAllAudio();
    await vk.send("VKWebAppShowNativeAds", {ad_format: "interstitial"});
  } catch (err) {
    console.error("VK ad failed", err);
    lastShownAt = 0; // let the next level completion retry
  } finally {
    resumeAllAudio();
  }
}
