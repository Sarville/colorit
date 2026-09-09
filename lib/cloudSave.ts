import {getYsdk} from "./yandexSdk";
import {getVkBridge} from "./vkSdk";

const PROGRESS_KEY = "levelProgress";

// Yandex's player data API covers both signed-in players (real cross-device cloud save) and
// anonymous "lite" ones (saved against the device); VK's storage API is device/account-scoped
// key-value only (values must be strings) - both fall back to plain localStorage outside their
// own environment (local dev, GitHub Pages) so progress still persists there.
// key defaults to level progress but any of these platforms' key-value storage also backs other
// small cross-device flags (e.g. the "ads disabled" purchase entitlement in lib/support.ts).
export async function loadProgress<T>(key: string = PROGRESS_KEY): Promise<T | null> {
  const ysdk = await getYsdk();
  if (ysdk) {
    try {
      const player = await ysdk.getPlayer({scopes: false});
      const data = await player.getData([key]);
      return (data[key] as T) ?? null;
    } catch {
      return null;
    }
  }
  const vk = getVkBridge();
  if (vk) {
    try {
      const {keys} = await vk.send("VKWebAppStorageGet", {keys: [key]});
      const raw = keys.find((entry) => entry.key === key)?.value;
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (err) {
      console.error(`VK storage load failed for key "${key}"`, err);
      return null;
    }
  }
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : null;
}

export async function saveProgress(progress: unknown, key: string = PROGRESS_KEY) {
  const ysdk = await getYsdk();
  if (ysdk) {
    try {
      const player = await ysdk.getPlayer({scopes: false});
      await player.setData({[key]: progress}, true);
      return;
    } catch {
      // fall through to localStorage
    }
  }
  const vk = getVkBridge();
  if (vk) {
    try {
      await vk.send("VKWebAppStorageSet", {key, value: JSON.stringify(progress)});
      return;
    } catch (err) {
      // VK's storage API caps each value at 4096 bytes - a save this size regularly means a
      // caller is putting too much under one key, not a transient failure.
      console.error(`VK storage save failed for key "${key}", falling back to localStorage`, err);
    }
  }
  localStorage.setItem(key, JSON.stringify(progress));
}
