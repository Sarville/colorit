import {useContext} from "react";
import {LevelContext, levelOptimal, levels, screens} from "@/pages";
import {useLanguage} from "@/i18n/LanguageContext";
import {packNames} from "@/i18n/translations";
import {playClick} from "@/lib/sound";
import styles from "./LevelPicker.module.css"

export function LevelPicker() {

  const {changeLevelNumber, changeCurrentScreen, levelProgress, pack, lastExitedLevel} = useContext(
    LevelContext
  );
  const {language, t} = useLanguage();
  return (
    <div className={styles.contentArea}>
      <div className={styles.selector}>
        <button onClick={() => { playClick(); changeCurrentScreen(screens.SelectPack); }}>{packNames[language][pack]}</button>
      </div>
      <h1>{t("selectLevel")}</h1>
      <div className={styles.pickerArea}>
        {levels[pack].map((_level, index) => {
          const progress = levelProgress[pack][index];
          const isOptimal = progress.best !== null && progress.best === levelOptimal[pack][index];
          const isHighlighted = lastExitedLevel === index;
          return (
            <div
              key={index}
              onClick={() => {
                playClick()
                changeLevelNumber(index)
                changeCurrentScreen(screens.Game)
              }}
              className={styles.clickableArea}
            >
              <div className={`${styles.levelStatus} ${styles[progress.status]} ${isHighlighted ? styles.highlighted : ""}`}>
                {isOptimal ? <div className={styles.star}></div> : null}
              </div>
              <div className={styles.levelNumber}>{index + 1}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}