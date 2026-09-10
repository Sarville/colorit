import {useContext} from "react";
import {LevelContext, levelOptimal, levels, screens} from "@/pages";
import {useLanguage} from "@/i18n/LanguageContext";
import {packNames} from "@/i18n/translations";
import {playClick} from "@/lib/sound";
import {Splashes, defaultSplashes} from "@/components/Splashes";
import {FlagButton} from "@/components/FlagButton";
import styles from "./LevelPicker.module.css"

export function LevelPicker({daily}: {daily?: boolean}) {

  const {
    changeLevelNumber, changeCurrentScreen, levelProgress, pack, lastExitedLevel,
    dailyTiles, changeDailyPlayIndex,
  } = useContext(LevelContext);
  const {language, t} = useLanguage();

  const tileCount = daily ? dailyTiles.length : levels[pack].length;

  function openTile(index: number) {
    playClick()
    if (daily) {
      changeDailyPlayIndex(index)
    } else {
      // Game.tsx treats any non-null dailyPlayIndex as "playing a daily level", regardless of
      // which pack/levelNumber is also set - without clearing it here, a normal-pack tile opened
      // after any earlier daily visit would keep showing whatever daily tile was last selected.
      changeDailyPlayIndex(null)
      changeLevelNumber(index)
    }
    changeCurrentScreen(screens.Game)
  }

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
          {daily ? t("dailyLevels") : packNames[language][pack]}
        </FlagButton>
        <div className={styles.subtitleWrap}>
          <img src="./images/brush_paint.webp" alt="" className={styles.subtitleBg}/>
          <h1 className={styles.subtitle}>{t("selectLevel")}</h1>
        </div>
        <div className={styles.pickerArea}>
          {Array.from({length: tileCount}, (_, index) => {
            const tile = daily ? dailyTiles[index] : undefined;
            const best = daily ? (tile?.best ?? null) : levelProgress[pack][index].best;
            const optimal = daily && tile ? tile.optimal : levelOptimal[pack][index];
            const isOptimal = best !== null && best === optimal;
            // Daily mode: today's 5 tiles (always first, see flattenDailyHistory) get the "you are
            // here" look as a group, since they're the ones worth full credit - see
            // components/Game/Game.tsx / lib/scoring.ts's dailyScoreForSlot for why a past day's
            // tile, still playable below, scores less.
            const isHighlighted = daily ? !!tile?.isCurrentDay : lastExitedLevel === index;
            const status = daily ? (best !== null ? "complete" : undefined) : levelProgress[pack][index].status;
            return (
              <button
                key={index}
                onClick={() => openTile(index)}
                className={`${styles.levelTile} ${isHighlighted ? styles.current : ""}`}
              >
                {isOptimal ? <img src="./images/star.webp" alt="" className={styles.star}/> : null}
                {status === "locked" ? <div className={styles.tileIcon}/> : null}
                {status === "complete" ? <div className={`${styles.tileIcon} ${styles.tileCheck}`}/> : null}
                <span className={styles.tileNumber}>{index + 1}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
