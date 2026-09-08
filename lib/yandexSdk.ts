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
  environment?: { i18n?: { lang?: string } };
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
// window.YaGames even when the build is opened standalone (e.g. GitHub Pages), but init()
// then rejects because there's no parent frame to talk to - so that failure is swallowed
// here and treated the same as "SDK not present", keeping the game playable standalone.
export function getYsdk(): Promise<YandexSdk | null> {
  if (typeof window === "undefined" || !window.YaGames) {
    return Promise.resolve(null);
  }
  if (!ysdkPromise) {
    ysdkPromise = window.YaGames.init().catch(() => null);
  }
  return ysdkPromise;
}
