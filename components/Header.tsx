import Head from 'next/head'
import {useLanguage} from "@/i18n/LanguageContext";

export default function Header() {
  const {t} = useLanguage();
  return (
    <Head>
      <title>{t("title")}</title>
      <meta content="width=device-width, initial-scale=1" name="viewport" />
      <meta name="description" content={t("description")} />
      {/* Relative path: Yandex Games serves the exported build from a sub-path, not domain root */}
      <link rel="shortcut icon" href="./favicon.ico" />
      {/* Plain <script>, not next/script: must be present in the static-exported HTML itself
          (Yandex's platform check reads the served markup), not injected client-side after hydration.
          Deliberately synchronous - the game's own bundle scripts are deferred, so this must block
          and run first to guarantee window.YaGames exists before the app hydrates. */}
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <script src="https://yandex.ru/games/sdk/v2"></script>
    </Head>
  )
}
