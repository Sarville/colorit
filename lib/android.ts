// True only in the Capacitor/RuStore build (NEXT_PUBLIC_ANDROID=true, see README) - a build-time
// flag like REQUIRE_VK / YANDEX_HOSTED, since nothing else tells the static export which target it is.
export const isAndroidApp = process.env.NEXT_PUBLIC_ANDROID === "true";
