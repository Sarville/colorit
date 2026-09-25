import {registerPlugin} from "@capacitor/core";

// Thin Capacitor bridge to android/app/src/main/java/ru/sarville/colorit/RuStorePayPlugin.java.
// Imported dynamically (only from the Android branches) so the Yandex/VK builds never load it.
export type RuStorePurchase = {
  purchaseId: string;
  productId: string;
  productType: "NON_CONSUMABLE_PRODUCT" | "CONSUMABLE_PRODUCT" | string;
  status: "PAID" | "CONFIRMED" | string;
  acknowledgement: "PENDING" | "ACKNOWLEDGED" | string;
};

export const RuStorePay = registerPlugin<{
  getPurchases(): Promise<{purchases: RuStorePurchase[]}>;
  purchase(options: {productId: string}): Promise<{purchaseId: string}>;
  acknowledge(options: {purchaseId: string}): Promise<void>;
}>("RuStorePay");
