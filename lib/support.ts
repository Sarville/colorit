import {getYsdk, getRealYsdk} from "./yandexSdk";
import {getVkBridge, isVkEnvironment, isOkPlatform} from "./vkSdk";
import {loadProgress, saveProgress} from "./cloudSave";

// This is the product/item ID to register in each platform's dashboard:
// Yandex Games cabinet -> Monetization -> In-app purchases -> id "support_author", price 100 RUB.
// VK app cabinet -> Payments -> this is passed as `item` to VKWebAppShowOrderBox for both VK and OK
// (same call, same bridge); its price is returned by the payments callback server per-platform, not
// set in the VK dashboard - see ops/vk-payments/server.js's ITEM_PRICE/ITEM_PRICE_OK.
export const SUPPORT_PRODUCT_ID = "support_author";

// Chosen prices per platform's own currency (not 1:1 with RUB or with each other) - must stay in
// sync with ops/vk-payments/server.js's ITEM_PRICE/ITEM_PRICE_OK, which are what actually gets
// charged; these are only for the button label.
export const VK_ITEM_PRICE = 20; // голосов
export const OK_ITEM_PRICE = 100; // ОКи

// Yandex purchases show their own real-currency price via the platform's own purchase dialog, so
// "100 ₽" here is just the label for that case (and for local/standalone dev, where nothing is
// actually charged) - VK and OK show their own currency's amount instead, since a mislabeled amount
// would misrepresent what the player is about to be charged.
export function supportPriceLabel(): string {
  if (isOkPlatform()) {
    return `${OK_ITEM_PRICE} ОКов`;
  }
  if (isVkEnvironment()) {
    return `${VK_ITEM_PRICE} голосов`;
  }
  return "100 ₽";
}

const ADS_DISABLED_KEY = "adsDisabled";

export async function isAdsDisabled(): Promise<boolean> {
  return (await loadProgress<boolean>(ADS_DISABLED_KEY)) === true;
}

// Testing-only: lets a `?resetProgress` URL param wipe this device/account's "already bought"
// flag so the purchase flow can be re-tested. Only ever clears the caller's own entitlement flag,
// never a real order - VK doesn't track "already purchased" for this item either, so it's safe to
// re-trigger VKWebAppShowOrderBox afterward.
export async function resetSupportState(): Promise<void> {
  await saveProgress(false, ADS_DISABLED_KEY);
}

// Yandex purchases are consumable: consumePurchase() deletes the record so the product can be
// bought again (needed here since "support again" must stay available after the first buy). If
// the tab closes between purchase() resolving and consumePurchase() running, the purchase is left
// dangling and blocks every future attempt - call this once at startup to sweep any of those up.
export async function restoreYandexPurchases(): Promise<void> {
  const ysdk = await getYsdk();
  if (!ysdk) {
    return;
  }
  const payments = await ysdk.getPayments().catch(() => null);
  if (!payments) {
    return;
  }
  const purchases = await payments.getPurchases().catch(() => []);
  const own = purchases.filter((purchase) => purchase.productID === SUPPORT_PRODUCT_ID);
  if (own.length === 0) {
    return;
  }
  await saveProgress(true, ADS_DISABLED_KEY);
  await Promise.all(own.map((purchase) => payments.consumePurchase(purchase.purchaseToken).catch(() => {})));
}

// True once there's a real platform to have bought anything on: VK's launch params are present
// (whether or not this particular load happens to be framed - a valid vk_user_id/sign pair means
// a real VK session either way), or the Yandex SDK reports a real app id. getYsdk() itself
// resolves non-null even outside Yandex Games (it falls back to an offline/"lite" mode rather
// than rejecting), so `!== null` alone can't tell real Yandex apart from local/standalone - only
// `environment.app.id` being non-empty means an actual Yandex parent frame answered.
async function isOnKnownPlatform(): Promise<boolean> {
  return isVkEnvironment() || (await getRealYsdk()) !== null;
}

// The thank-you animation on the main menu doubles as proof of purchase, so it must never even
// be requested from the server without one - except in a standalone/dev build, where it should
// always be visible (there's no real payment to gate it behind while testing it).
export async function shouldShowThankYouAnimation(adsDisabled: boolean): Promise<boolean> {
  if (adsDisabled) {
    return true;
  }
  return !(await isOnKnownPlatform());
}

export async function purchaseSupportAuthor(): Promise<boolean> {
  const ysdk = await getYsdk();
  if (ysdk) {
    const payments = await ysdk.getPayments().catch(() => null);
    if (!payments) {
      return false;
    }
    try {
      const purchase = await payments.purchase({id: SUPPORT_PRODUCT_ID});
      await saveProgress(true, ADS_DISABLED_KEY);
      await payments.consumePurchase(purchase.purchaseToken).catch(() => {});
      return true;
    } catch (err) {
      console.error("Yandex purchase failed", err);
      return false;
    }
  }
  const vk = getVkBridge();
  if (vk) {
    try {
      const result = await vk.send("VKWebAppShowOrderBox", {type: "item", item: SUPPORT_PRODUCT_ID});
      // @vkontakte/vk-bridge's types claim {status: 'success'|'cancel'|'fail'}, but the real VK
      // client responds with {success: boolean} - confirmed from a live response:
      // {"success":true,"order_id":"2357856"}. Trust the observed shape over the package's types.
      // @ts-ignore
      if (!result.success) {
        console.error("VK purchase failed, full response:", JSON.stringify(result));
        return false;
      }
      await saveProgress(true, ADS_DISABLED_KEY);
      return true;
    } catch (err) {
      console.error("VK purchase rejected, full error:", JSON.stringify(err));
      return false;
    }
  }
  console.error("No payment provider available (not running in Yandex Games or VK)");
  return false;
}
