import {useContext} from "react";
import {LevelContext, levelOptimal, levels, screens} from "@/pages";
import {useLanguage} from "@/i18n/LanguageContext";
import {packNames} from "@/i18n/translations";
import {playClick} from "@/lib/sound";
import {Splashes, defaultSplashes} from "@/components/Splashes";
import {FlagButton} from "@/components/FlagButton";
import styles from "./LevelPicker.module.css"

export function LevelPicker() {

  const {changeLevelNumber, changeCurrentScreen, levelProgress, pack, lastExitedLevel} = useContext(
    LevelContext
  );
  const {language, t} = useLanguage();
  return (
    <div className={styles.page}>
      <Splashes items={defaultSplashes}/>
      <div className={styles.contentArea}>
        <FlagButton
          pointLeft
          className={styles.packBadge}
          onClick={() => { playClick(); changeCurrentScreen(screens.SelectPack); }}
          aria-label={t("back")}
        >
          {packNames[language][pack]}
        </FlagButton>
        <div className={styles.subtitleWrap}>
          <img src="./images/brush_paint.webp" alt="" className={styles.subtitleBg}/>
          <h1 className={styles.subtitle}>{t("selectLevel")}</h1>
        </div>
        <div className={styles.pickerArea}>
          {levels[pack].map((_level, index) => {
            const progress = levelProgress[pack][index];
            const isOptimal = progress.best !== null && progress.best === levelOptimal[pack][index];
            const isHighlighted = lastExitedLevel === index;
            return (
              <button
                key={index}
                onClick={() => {
                  playClick()
                  changeLevelNumber(index)
                  changeCurrentScreen(screens.Game)
                }}
                className={`${styles.levelTile} ${isHighlighted ? styles.current : ""}`}
              >
                {isOptimal ? <img src="./images/star.webp" alt="" className={styles.star}/> : null}
                {progress.status === "locked" ? <div className={styles.tileIcon}/> : null}
                {progress.status === "complete" ? <div className={`${styles.tileIcon} ${styles.tileCheck}`}/> : null}
                <span className={styles.tileNumber}>{index + 1}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
