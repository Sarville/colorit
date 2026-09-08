import {useContext} from "react";
import {LevelContext, screens} from "@/pages";
import {useLanguage} from "@/i18n/LanguageContext";
import {packNames} from "@/i18n/translations";
import {playClick} from "@/lib/sound";
import styles from "./SelectPack.module.css"

export function SelectPack() {

  const {changeCurrentScreen, changePack} = useContext(
    LevelContext
  );
  const {language, t} = useLanguage();
  const names = packNames[language];
  return (
    <div className={styles.contentArea}>
      <h1>{t("selectPack")}</h1>
      <div className={styles.selector}>
        <button onClick={() => {
          playClick()
          changeCurrentScreen(screens.SelectLevel)
          changePack("Easy")
        }}>{names.Easy}
        </button>
      </div>

      <div className={styles.selector}>
        <button onClick={() => {
          playClick()
          changeCurrentScreen(screens.SelectLevel)
          changePack("Medium")
        }}>{names.Medium}
        </button>
      </div>

      <div className={styles.selector}>
        <button onClick={() => {
          playClick()
          changeCurrentScreen(screens.SelectLevel)
          changePack("Hard")
        }}>{names.Hard}
        </button>
      </div>

      <div className={styles.selector}>
        <button onClick={() => {
          playClick()
          changeCurrentScreen(screens.SelectLevel)
          changePack("Community")
        }}>{names.Community}
        </button>
      </div>

      <div className={styles.backRow}>
        <div className={styles.backSelector}>
          <button onClick={() => { playClick(); changeCurrentScreen(screens.MainMenu); }}>{t("back")}</button>
        </div>
      </div>
    </div>
  );
}