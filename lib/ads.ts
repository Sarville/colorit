import {getYsdk} from "./yandexSdk";
import {getVkBridge} from "./vkSdk";
import {pauseAllAudio, resumeAllAudio} from "./audioFocus";
import {isAdsDisabled} from "./support";
import {isAndroidApp} from "./android";

// Yandex Mobile Ads (РСЯ) via @quenary/capacitor-yandex-ads, Android build only. The defaults are
// Yandex's public demo units - replace them with the real "R-M-..." ad unit ids from the РСЯ cabinet
// (env vars at build time) before release, or nothing real is ever served/paid.
const ANDROID_BANNER_ID = process.env.NEXT_PUBLIC_YAN_BANNER_ID ?? "demo-banner-yandex";
const ANDROID_INTERSTITIAL_ID = process.env.NEXT_PUBLIC_YAN_INTERSTITIAL_ID ?? "demo-interstitial-yandex";

type YandexAdsPlugin = typeof import("@quenary/capacitor-yandex-ads").YandexAds;
let androidAds: Promise<YandexAdsPlugin> | null = null;
let interstitialReady = false;
let bannerLoaded = false;

// The SDK must be initialised once, and the interstitial has to be preloaded (load -> show), so
// every show below is instant and just kicks off the next load. Offline, load() rejects and the
// next level completion simply tries again.
function getAndroidAds(): Promise<YandexAdsPlugin> {
  if (!androidAds) {
    androidAds = (async () => {
      const {YandexAds} = await import("@quenary/capacitor-yandex-ads");
      await YandexAds.setUserConsent({value: true});
      await YandexAds.initialize();
      const reload = () => {
        interstitialReady = false;
        YandexAds.loadInterstitial({adUnitId: ANDROID_INTERSTITIAL_ID}).then(() => { interstitialReady = true; }).catch(() => {});
      };
      YandexAds.addListener("interstitialAdShown", () => pauseAllAudio());
      YandexAds.addListener("interstitialAdDismissed", () => { resumeAllAudio(); reload(); });
      YandexAds.addListener("interstitialAdFailedToShow", () => { resumeAllAudio(); reload(); });
      reload();
      return YandexAds;
    })();
    androidAds.catch(() => { androidAds = null; }); // retry init on the next call
  }
  return androidAds;
}

async function updateAndroidBanner(adsDisabled: boolean) {
  const ads = await getAndroidAds();
  if (adsDisabled) {
    await ads.hideBanner();
    return;
  }
  if (!bannerLoaded) {
    await ads.loadBanner({adUnitId: ANDROID_BANNER_ID, position: "bottom", overlap: false});
    bannerLoaded = true;
  }
  await ads.showBanner();
}

// Mobile landscape (phone/tablet turned sideways) is short and wide, so a full-width top strip
// eats a large share of the play area - VK's docs (dev.vk.ru/ru/games/monetization/ad/banners)
// show a vertical side banner for exactly this case (layout_type: 'overlay', banner_align:
// 'right', orientation: 'vertical'). Everywhere else (desktop, and mobile portrait) uses the
// plain full-width top banner. Reuses the same "mobile landscape" media query as the game's own
// sidebar-layout switch in components/Game/Game.tsx.
function vkBannerParams() {
  const isMobileLandscape =
    typeof window !== "undefined" && window.matchMedia("(orientation: landscape) and (pointer: coarse)").matches;
  return isMobileLandscape
    ? {banner_location: "top" as const, layout_type: "overlay" as const, banner_align: "right" as const, orientation: "vertical" as const}
    : {banner_location: "top" as const};
}

let vkBannerAdsDisabled = true;
let vkOrientationWatcherStarted = false;

function watchVkBannerOrientation(vk: NonNullable<ReturnType<typeof getVkBridge>>) {
  if (vkOrientationWatcherStarted || typeof window === "undefined") {
    return;
  }
  vkOrientationWatcherStarted = true;
  window.matchMedia("(orientation: landscape) and (pointer: coarse)").addEventListener("change", () => {
    if (!vkBannerAdsDisabled) {
      vk.send("VKWebAppShowBannerAd", vkBannerParams()).catch((err) => console.error("VK banner failed", err));
    }
  });
}

export async function updateStickyBanner(adsDisabled: boolean): Promise<void> {
  const ysdk = await getYsdk();
  if (ysdk) {
    const call = adsDisabled ? ysdk.adv.hideBannerAdv() : ysdk.adv.showBannerAdv();
    await call.catch((err) => console.error("Yandex sticky banner failed", err));
    return;
  }
  if (isAndroidApp) {
    await updateAndroidBanner(adsDisabled).catch((err) => console.error("Android banner failed", err));
    return;
  }
  const vk = getVkBridge();
  if (!vk) {
    return;
  }
  vkBannerAdsDisabled = adsDisabled;
  if (adsDisabled) {
    await vk.send("VKWebAppHideBannerAd", {}).catch((err) => console.error("VK banner hide failed", err));
    return;
  }
  await vk.send("VKWebAppShowBannerAd", vkBannerParams()).catch((err) => console.error("VK banner failed", err));
  watchVkBannerOrientation(vk);
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
  if (isAndroidApp) {
    try {
      const ads = await getAndroidAds();
      if (interstitialReady) {
        lastShownAt = now;
        interstitialReady = false;
        await ads.showInterstitial();
      }
    } catch (err) {
      console.error("Android interstitial failed", err);
    }
    return;
  }
  const vk = getVkBridge();
  if (!vk) {
    console.error("No ad provider available (not running in Yandex Games or VK)");
    return;
  }
  // VK docs: interstitial shows without a prior VKWebAppCheckNativeAds readiness check
  // (that check is only needed to gate a rewarded-ad button); calling check first just
  // added a chance to bail out on "not loaded yet" before VK even tried to show it.
  lastShownAt = now;
  pauseAllAudio();
  try {
    await vk.send("VKWebAppShowNativeAds", {ad_format: "interstitial"});
  } catch (err) {
    console.error("VK ad failed", err);
    lastShownAt = 0; // let the next level completion retry
  } finally {
    resumeAllAudio();
  }
}
