import {useContext} from "react";
import {LevelContext, screens} from "@/pages";
import {useLanguage} from "@/i18n/LanguageContext";
import {packNames} from "@/i18n/translations";
import {playClick} from "@/lib/sound";
import {Splashes, defaultSplashes} from "@/components/Splashes";
import {FlagButton} from "@/components/FlagButton";
import styles from "./SelectPack.module.css"

export function SelectPack() {

  const {changeCurrentScreen, changePack} = useContext(
    LevelContext
  );
  const {language, t} = useLanguage();
  const names = packNames[language];

  function selectPack(pack: "Easy" | "Medium" | "Hard" | "Community") {
    playClick()
    changeCurrentScreen(screens.SelectLevel)
    changePack(pack)
  }

  return (
    <div className={styles.page}>
      <Splashes items={defaultSplashes}/>
      <div className={styles.contentArea}>
        <div className={styles.subtitleWrap}>
          <img src="./images/brush_paint.webp" alt="" className={styles.subtitleBg}/>
          <h1 className={styles.subtitle}>{t("selectPack")}</h1>
        </div>
        <div className={styles.buttons}>
          <FlagButton onClick={() => selectPack("Easy")}>{names.Easy}</FlagButton>
          <FlagButton onClick={() => selectPack("Medium")}>{names.Medium}</FlagButton>
          <FlagButton onClick={() => selectPack("Hard")}>{names.Hard}</FlagButton>
          <FlagButton onClick={() => selectPack("Community")}>{names.Community}</FlagButton>
        </div>
        <FlagButton
          pointLeft
          className={styles.backBtn}
          onClick={() => { playClick(); changeCurrentScreen(screens.MainMenu); }}
          aria-label={t("back")}
        >
          {t("back")}
        </FlagButton>
      </div>
    </div>
  );
}
