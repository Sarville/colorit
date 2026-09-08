import bridge from "@vkontakte/vk-bridge";

let initPromise: Promise<boolean> | null = null;

// VK only appends launch params (vk_user_id, sign, ...) to the URL when the page is opened
// inside a VK client, so their presence is the standard way to tell "running as a VK Mini App"
// apart from a standalone deploy - vk-bridge itself works either way, it would just never get a
// reply outside VK.
export function isVkEnvironment(): boolean {
  return typeof window !== "undefined" && new URLSearchParams(window.location.search).has("vk_user_id");
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
