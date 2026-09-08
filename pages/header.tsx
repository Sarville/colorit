import Head from 'next/head'
import Script from 'next/script'
import {useLanguage} from "@/i18n/LanguageContext";

export default function Header() {
  const {t} = useLanguage();
  return (
    <>
      <Head>
        <title>{t("title")}</title>
        <meta content="width=device-width, initial-scale=1" name="viewport" />
        <meta name="description" content={t("description")} />
        {/* Relative path: Yandex Games serves the exported build from a sub-path, not domain root */}
        <link rel="shortcut icon" href="./favicon.ico" />
      </Head>
      <Script src="https://yandex.ru/games/sdk/v2" />
    </>
  )
}
