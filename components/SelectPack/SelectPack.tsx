import {useContext} from "react";
import {LevelContext, screens} from "@/pages";
import {useLanguage} from "@/i18n/LanguageContext";
import {packNames} from "@/i18n/translations";
import {playClick} from "@/lib/sound";
import {Logo} from "@/components/Logo";
import {Splashes, defaultSplashes} from "@/components/Splashes";
import {ChevronLeftIcon} from "@/components/icons";
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
      <button
        className={`col-circle ${styles.backButton}`}
        onClick={() => { playClick(); changeCurrentScreen(screens.MainMenu); }}
        aria-label={t("back")}
      >
        <ChevronLeftIcon/>
      </button>
      <Logo className={styles.logo}/>
      <div className={styles.contentArea}>
        <h1 className={styles.subtitle}>{t("selectPack")}</h1>
        <div className={styles.buttons}>
          <FlagButton onClick={() => selectPack("Easy")}>{names.Easy}</FlagButton>
          <FlagButton onClick={() => selectPack("Medium")}>{names.Medium}</FlagButton>
          <FlagButton onClick={() => selectPack("Hard")}>{names.Hard}</FlagButton>
          <FlagButton onClick={() => selectPack("Community")}>{names.Community}</FlagButton>
        </div>
      </div>
    </div>
  );
}
