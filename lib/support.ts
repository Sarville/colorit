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
    } catch {
      return false;
    }
  }
  const vk = getVkBridge();
  if (vk) {
    try {
      const {status} = await vk.send("VKWebAppShowOrderBox", {type: "item", item: SUPPORT_PRODUCT_ID});
      if (status !== "success") {
        return false;
      }
      await saveProgress(true, ADS_DISABLED_KEY);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}
