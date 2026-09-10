import Head from 'next/head'
import {useLanguage} from "@/i18n/LanguageContext";

// Same VK-only build gate as pages/index.tsx. The Yandex SDK script isn't just inert outside
// Yandex Games: merely loading it kicks off its own handshake with a (nonexistent, inside VK)
// parent frame, which logs "[SDK] too long resolve for method 'loadEnvironment'" and rewrites
// the page's history/URL to what it assumes is the Yandex-hosted path - breaking every relative
// asset URL (sounds, music) built after that point. Calling getYsdk() only when needed isn't
// enough to stop this, since it's triggered by the script tag existing at all - so the VK-only
// build must never emit it.
const REQUIRE_VK = process.env.NEXT_PUBLIC_REQUIRE_VK === "true";

// Yandex's own docs (sdk-about) split this into two *different* URLs, not one: a relative
// "/sdk.js" for a build actually hosted on Yandex's own servers, and the absolute
// "https://yandex.ru/games/sdk/v2" only for a custom domain. Games hosted on Yandex apparently
// also get the SDK injected by their platform at that relative path regardless - so a build that
// (like every build here, historically) always requests the absolute URL gets it loaded twice
// once actually uploaded there, throwing the SDK's own "YaGames is already defined" error
// (confirmed live: reproduced in a fresh incognito load against the real uploaded build, not a
// caching/dev artifact). "/sdk.js" 404s anywhere else (localhost, this repo's own GitHub Pages
// preview, a custom domain), so this only flips on for the zip actually built for upload - see
// README.md's release instructions for the required build command.
const YANDEX_HOSTED = process.env.NEXT_PUBLIC_YANDEX_HOSTED === "true";

export default function Header() {
  const {t} = useLanguage();
  return (
    <Head>
      <title>{t("title")}</title>
      <meta content="width=device-width, initial-scale=1" name="viewport" />
      <meta name="description" content={t("description")} />
      {/* Relative path: Yandex Games serves the exported build from a sub-path, not domain root */}
      <link rel="shortcut icon" href="./favicon.ico" />
      {REQUIRE_VK ? null : (
        /* Plain <script>, not next/script: must be present in the static-exported HTML itself
           (Yandex's platform check reads the served markup), not injected client-side after hydration.
           Deliberately synchronous - the game's own bundle scripts are deferred, so this must block
           and run first to guarantee window.YaGames exists before the app hydrates. */
        // eslint-disable-next-line @next/next/no-sync-scripts
        <script src={YANDEX_HOSTED ? "/sdk.js" : "https://yandex.ru/games/sdk/v2"}></script>
      )}
    </Head>
  )
}
