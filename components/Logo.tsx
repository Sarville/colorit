import {CSSProperties} from "react";
import {useLanguage} from "@/i18n/LanguageContext";

// Relative "./images/..." src - see the asset-path note on .col-bg in global.css.
export function Logo({className, style}: { className?: string, style?: CSSProperties }) {
  const {language, t} = useLanguage();
  const src = language === "ru" ? "./images/logo_ru.webp" : "./images/logo_en.webp";
  return <img src={src} alt={t("brandName")} className={className} style={style}/>;
}
