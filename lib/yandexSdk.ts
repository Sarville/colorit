import {isVkEnvironment} from "./vkSdk";

declare global {
  interface Window {
    YaGames?: { init: () => Promise<YandexSdk> };
  }
}

export type YandexPlayer = {
  getMode: () => "lite" | "not_available" | string;
  getUniqueID: () => string;
  getData: (keys?: Array<string>) => Promise<Record<string, unknown>>;
  setData: (data: Record<string, unknown>, flush?: boolean) => Promise<void>;
};

export type YandexSdk = {
  features?: {
    LoadingAPI?: { ready: () => void };
    GameplayAPI?: { start: () => void; stop: () => void };
  };
  // `environment.app.id` is only non-empty inside a real Yandex Games parent frame - the SDK
  // still resolves outside of one (falling back to a "lite"/offline mode instead of rejecting),
  // logging "Can not get appId from environment" and leaving this "" - see lib/support.ts's
  // isOnKnownPlatform(), which relies on that to tell a real Yandex launch from local/standalone.
  environment?: { app?: { id?: string }, i18n?: { lang?: string } };
  adv: {
    showFullscreenAdv: (params: {
      callbacks?: {
        onOpen?: () => void;
        onClose?: (wasShown: boolean) => void;
        onError?: (error: unknown) => void;
        onOffline?: () => void;
      };
    }) => void;
  };
  auth?: { openAuthDialog: () => Promise<void> };
  getPlayer: (options?: { scopes?: boolean }) => Promise<YandexPlayer>;
  getPayments: (options?: { signed?: boolean }) => Promise<YandexPayments>;
};

export type YandexPurchase = {
  productID: string;
  purchaseToken: string;
  developerPayload?: string;
};

export type YandexPayments = {
  purchase: (options: { id: string; developerPayload?: string }) => Promise<YandexPurchase>;
  getPurchases: () => Promise<Array<YandexPurchase>>;
  consumePurchase: (purchaseToken: string) => Promise<void>;
};

let ysdkPromise: Promise<YandexSdk | null> | null = null;

// Resolves to the SDK only inside the real Yandex Games iframe. The loader script sets
// window.YaGames even when the build is opened standalone (e.g. GitHub Pages) or inside VK, but
// init() then either rejects or - inside VK specifically - hangs for a long time logging
// "[SDK] too long resolve for method 'loadEnvironment'" while it waits for a Yandex parent frame
// that will never reply. isVkEnvironment() is checked first so every getYsdk() caller (ads,
// cloud save, auth, purchases, ...) resolves to null immediately in that case instead of stalling
// on an RPC call that was never going to succeed.
export function getYsdk(): Promise<YandexSdk | null> {
  if (typeof window === "undefined" || !window.YaGames || isVkEnvironment()) {
    return Promise.resolve(null);
  }
  if (!ysdkPromise) {
    ysdkPromise = window.YaGames.init().catch(() => null);
  }
  return ysdkPromise;
}

// getYsdk() resolves non-null even completely outside Yandex Games (see the comment on
// `environment` above) - callers that need to know "is there a real Yandex player/cloud save to
// talk to" (not just "did the SDK script load") should use this instead.
export async function getRealYsdk(): Promise<YandexSdk | null> {
  const ysdk = await getYsdk();
  return ysdk?.environment?.app?.id ? ysdk : null;
}
