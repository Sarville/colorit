import bridge from "@vkontakte/vk-bridge";

let initPromise: Promise<boolean> | null = null;

// VK only appends launch params (vk_user_id, sign, ...) to the URL when the page is opened
// inside a VK client, so their presence is the standard way to tell "running as a VK Mini App"
// apart from a standalone deploy - vk-bridge itself works either way, it would just never get a
// reply outside VK.
export function isVkEnvironment(): boolean {
  return typeof window !== "undefined" && new URLSearchParams(window.location.search).has("vk_user_id");
}

// OK (Odnoklassniki) runs this same Mini App via the same vk-bridge/launch-params scheme (see
// docs/vk-gotchas.md), just with one extra launch param, vk_client=ok, layered on top of the usual
// vk_user_id/sign ones - so isVkEnvironment() above already covers "is a bridge available" for OK
// too. This only distinguishes which of the two platforms it is, for platform-specific UI (price
// label) and payment routing.
export function isOkPlatform(): boolean {
  return typeof window !== "undefined" && new URLSearchParams(window.location.search).get("vk_client") === "ok";
}

// Dismisses VK's own loading spinner and must run once before any other bridge call.
export function initVkBridge(): Promise<boolean> {
  if (!isVkEnvironment()) {
    return Promise.resolve(false);
  }
  if (!initPromise) {
    initPromise = bridge.send("VKWebAppInit").then(() => true).catch(() => false);
  }
  return initPromise;
}

export function getVkBridge() {
  return isVkEnvironment() ? bridge : null;
}
