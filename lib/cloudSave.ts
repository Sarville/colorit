import {getYsdk} from "./yandexSdk";

const PROGRESS_KEY = "levelProgress";

// Yandex's player data API covers both signed-in players (real cross-device cloud save) and
// anonymous "lite" ones (saved against the device) - falls back to plain localStorage outside
// the Yandex environment (local dev, GitHub Pages) so progress still persists there.
export async function loadProgress<T>(): Promise<T | null> {
  const ysdk = await getYsdk();
  if (ysdk) {
    try {
      const player = await ysdk.getPlayer({scopes: false});
      const data = await player.getData([PROGRESS_KEY]);
      return (data[PROGRESS_KEY] as T) ?? null;
    } catch {
      return null;
    }
  }
  const stored = localStorage.getItem(PROGRESS_KEY);
  return stored ? JSON.parse(stored) : null;
}

export async function saveProgress(progress: unknown) {
  const ysdk = await getYsdk();
  if (ysdk) {
    try {
      const player = await ysdk.getPlayer({scopes: false});
      await player.setData({[PROGRESS_KEY]: progress}, true);
      return;
    } catch {
      // fall through to localStorage
    }
  }
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}
