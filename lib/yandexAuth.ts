import {getYsdk} from "./yandexSdk";

// "lite" mode means an anonymous/guest player - not signed in to a Yandex ID.
export async function isSignedIn(): Promise<boolean | null> {
  const ysdk = await getYsdk();
  if (!ysdk) {
    return null; // not running on Yandex Games at all
  }
  try {
    const player = await ysdk.getPlayer({scopes: false});
    return player.getMode() !== "lite";
  } catch {
    return null;
  }
}

export async function openAuthDialog() {
  const ysdk = await getYsdk();
  await ysdk?.auth?.openAuthDialog();
}
