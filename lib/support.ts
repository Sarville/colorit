import {getYsdk} from "./yandexSdk";
import {getVkBridge} from "./vkSdk";
import {loadProgress, saveProgress} from "./cloudSave";

// This is the product/item ID to register in each platform's dashboard:
// Yandex Games cabinet -> Monetization -> In-app purchases -> id "support_author", price 100 RUB.
// VK app cabinet -> Payments -> this is passed as `item` to VKWebAppShowOrderBox; its price (100
// votes) is returned by the payments callback server, not set in the VK dashboard.
export const SUPPORT_PRODUCT_ID = "support_author";

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
