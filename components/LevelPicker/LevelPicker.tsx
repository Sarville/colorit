import {useContext} from "react";
import {LevelContext, levelOptimal, levels, screens} from "@/pages";
import {useLanguage} from "@/i18n/LanguageContext";
import {packNames} from "@/i18n/translations";
import {playClick} from "@/lib/sound";
import {Logo} from "@/components/Logo";
import {Splashes, defaultSplashes} from "@/components/Splashes";
import {ChevronLeftIcon} from "@/components/icons";
import styles from "./LevelPicker.module.css"

export function LevelPicker() {

  const {changeLevelNumber, changeCurrentScreen, levelProgress, pack, lastExitedLevel} = useContext(
    LevelContext
  );
  const {language, t} = useLanguage();
  return (
    <div className={styles.page}>
      <Splashes items={defaultSplashes}/>
      <button
        className={`col-circle ${styles.backButton}`}
        onClick={() => { playClick(); changeCurrentScreen(screens.SelectPack); }}
        aria-label={t("back")}
      >
        <ChevronLeftIcon/>
      </button>
      <Logo className={styles.logo}/>
      <div className={styles.contentArea}>
        <div className="col-heading">{packNames[language][pack]}</div>
        <h1 className={styles.subtitle}>{t("selectLevel")}</h1>
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
                {isOptimal ? <div className={styles.star}/> : null}
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
