/** @type {import('next').NextConfig} */
const nextConfig = {
  // Yandex Games hosts the exported build under an arbitrary sub-path, not domain root,
  // so asset URLs must be relative rather than the "/_next/..." Next.js emits by default.
  assetPrefix: "./",
}

module.exports = nextConfig
