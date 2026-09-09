/** @type {import('next').NextConfig} */
const nextConfig = {
  // Yandex Games hosts the exported build under an arbitrary sub-path, not domain root,
  // so asset URLs must be relative rather than the "/_next/..." Next.js emits by default.
  assetPrefix: "./",
  // The export serves each route as a directory with its own index.html (.../colorit/index.html),
  // so the page's real, working URL has a trailing slash. Without this, trailingSlash defaults to
  // false and the client router "corrects" the URL on hydration via history.replaceState, silently
  // dropping that trailing slash - after which every relative "./sounds/..." URL built at runtime
  // resolves one directory too high (.../vk/sounds/... instead of .../vk/colorit/sounds/...).
  trailingSlash: true,
}

module.exports = nextConfig
