import {useCallback, useContext, useEffect, useRef, useState, type CSSProperties} from "react";
import {Color, Modifier, Square} from "../Square/Square";
import styles from "./Game.module.css";
import {LevelContext, levels, levelOptimal, screens} from "@/pages";
import {MessageModal} from "@/components/MessageModal/MessageModal";
import {levelStatus} from "@/levels/levelsUtils";
import {useLanguage} from "@/i18n/LanguageContext";
import {maybeShowLevelCompleteAd} from "@/lib/ads";
import {playClick, playWon} from "@/lib/sound";
import {GearIcon, HomeIcon, ResetIcon, TriangleLeftIcon, TriangleRightIcon} from "@/components/icons";
import {Splashes} from "@/components/Splashes";
import {checkGameIsWon, loadLevel, updateGame, type Level} from "@/lib/gameEngine";

export type {Level};


export function Game() {
  const {
    levelNumber, changeLevelNumber, levelProgress, changeLevelProgress, pack, changeCurrentScreen,
    changeLastExitedLevel, openSettings, dailyTiles, dailyPlayIndex, changeDailyPlayIndex, changeDailyBest,
  } = useContext(
    LevelContext
  );

  // A daily tile carries its own board + optimal-move count (see lib/dailyLevels.ts) rather than
  // indexing into one of the 3 normal packs, so every lookup below goes through this instead of
  // levels[pack][levelNumber] whenever a daily level is being played.
  const dailyEntry = dailyPlayIndex !== null ? (dailyTiles[dailyPlayIndex] ?? null) : null;
  const activeLevel: Level = dailyEntry ? dailyEntry.level : levels[pack][levelNumber];
  // Daily tiles are never locked (see lib/dailyLevels.ts) - only a normal-pack level can be.
  // The MessageModal("locked") overlay blocks clicks visually, but it's just a DOM element a
  // devtools user can hide (display:none) or remove - onClick below is the real gate, checked
  // independently of whatever's currently covering the board on screen.
  const isLocked = !dailyEntry && levelProgress[pack][levelNumber].status === levelStatus.locked;

  const [moves, setMoves] = useState(0);
  const [game, setGame] = useState(loadLevel(activeLevel));
  const [gameIsWon, setGameIsWon] = useState(false);
  const {t, language} = useLanguage();

  // The board's own width is CSS-driven (shrinks to fit the viewport height on short desktop
  // windows), so the header mirrors its measured pixel width to stay the same width rather
  // than always spanning full-bleed while the board sits narrower underneath it. Not used in
  // the sidebar layout below, which has its own fixed width instead.
  const gameBoardRef = useRef<HTMLDivElement>(null);
  const [headerWidth, setHeaderWidth] = useState<number | null>(null);
  useEffect(() => {
    const el = gameBoardRef.current;
    if (!el) return;
    // getBoundingClientRect (border-box), not entry.contentRect (content-box only) - the
    // board is box-sizing:border-box with its own padding, so contentRect under-reported its
    // actual on-screen width by exactly that padding, leaving the header narrower than the
    // board it's supposed to match.
    const observer = new ResizeObserver(() => setHeaderWidth(el.getBoundingClientRect().width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Wide-but-short viewport (phone/tablet in landscape, or a short desktop window): the icon
  // panel becomes a left sidebar instead of a full-width header above the board. Decided here
  // rather than with a CSS media query alone because the sidebar needs a genuinely different
  // arrangement of the same buttons (prev/next inline with the level label, icon row on its
  // own line, one stat per line) - reordering that via CSS alone (display:contents + order)
  // turned out to be unreliable on real mobile browsers.
  const [isSidebar, setIsSidebar] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(
      "(orientation: landscape) and (pointer: coarse), (max-height: 600px) and (min-aspect-ratio: 1/1)"
    );
    setIsSidebar(mql.matches);
    const onChange = () => setIsSidebar(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  // Enough width fits the stats beside the icon row instead of stacked below it - a shorter
  // header leaves more vertical room for the board, which matters most on tall narrow phones
  // where every row of header height is a row the board doesn't get. Keyed off the header's
  // own measured width (same ResizeObserver as the width-sync above), not the viewport - the
  // header is capped to the board's width, which is usually well under the viewport, so a
  // viewport-width breakpoint switched to this layout long before there was actually room for
  // three 52px icon buttons plus four stat columns on one line, clipping "Оптимальный".
  const isWideHeader = !isSidebar && headerWidth !== null && headerWidth >= 600;

  useEffect(() => {
    if (gameIsWon) {
      playWon();
      maybeShowLevelCompleteAd();
    }
  }, [gameIsWon]);

  const handleReset = useCallback(() => {
    setGameIsWon(false)
    setGame(loadLevel(activeLevel));
    setMoves(0);
  }, [activeLevel])

  useEffect(() => {
    // Reset the game every time the level (or, in daily mode, the tile) changes
    handleReset()
  }, [levelNumber, dailyPlayIndex, handleReset]);

  useEffect(() => {
    // Re-derive the win from the actual board fill rather than trusting the gameIsWon flag on
    // its own - it's set by onClick right after a real move, but a devtools user can flip React
    // state directly without ever playing a legal move. checkGameIsWon(game) is the same check
    // onClick already ran, just re-run against the current board as the source of truth before
    // this effect banks a completion/score/unlock.
    if (!gameIsWon || !checkGameIsWon(game)) {
      return;
    }
    if (dailyEntry) {
      if (dailyEntry.best === null || moves < dailyEntry.best) {
        changeDailyBest(dailyEntry.date, dailyEntry.slotIndex, moves)
      }
      return;
    }
    if (levelProgress[pack][levelNumber].best === null || moves < levelProgress[pack][levelNumber].best!) {
      const newProgress = structuredClone(levelProgress)
      newProgress[pack][levelNumber].best = moves
      newProgress[pack][levelNumber].status = levelStatus.complete
      // Unlock the next 5 levels
      for (let i = 1; i < Math.min(newProgress[pack].length - levelNumber, 6); i++) {
        if (newProgress[pack][levelNumber + i].status === levelStatus.locked) {
          newProgress[pack][levelNumber + i].status = levelStatus.unlocked
        }
      }
      changeLevelProgress(newProgress)
    }
  }, [gameIsWon, game, levelProgress, levelNumber, moves, changeLevelProgress, pack, dailyEntry, changeDailyBest]);

  function goHome() {
    setGameIsWon(false)
    if (dailyEntry) {
      changeCurrentScreen(screens.DailyLevels)
      return;
    }
    changeLastExitedLevel(levelNumber)
    changeCurrentScreen(screens.SelectLevel)
  }

  function incrementLevelNumber() {
    // Unset gameIsWon before changing level, so we don't accidentally mark the level as complete
    // when the new game is loaded before gameIsWon is recalculated
    setGameIsWon(false)
    if (dailyEntry) {
      if (dailyPlayIndex! + 1 === dailyTiles.length) {
        changeCurrentScreen(screens.DailyLevels)
      } else {
        changeDailyPlayIndex(dailyPlayIndex! + 1)
      }
      return;
    }
    if (levelNumber + 1 === levels[pack].length) {
      changeLastExitedLevel(levelNumber)
      changeCurrentScreen(screens.SelectLevel)
    } else {
      changeLevelNumber(levelNumber + 1)
    }
  }

  function decrementLevelNumber() {
    setGameIsWon(false)
    if (dailyEntry) {
      if (dailyPlayIndex! === 0) {
        changeCurrentScreen(screens.DailyLevels)
      } else {
        changeDailyPlayIndex(dailyPlayIndex! - 1)
      }
      return;
    }
    if (levelNumber === 0) {
      changeLastExitedLevel(levelNumber)
      changeCurrentScreen(screens.SelectLevel)
    } else {
      changeLevelNumber(levelNumber - 1)
    }
  }

  function onClick(x: number, y: number) {
    if (isLocked) {
      return;
    }
    if (game[x][y].modifier !== Modifier.none) {
      playClick()
      setMoves(moves => moves + 1)
      setGame(game => {
        const newState = updateGame(x, y, game);
        const won = checkGameIsWon(newState)
        setGameIsWon(won)
        return newState
      })
    }
  }

  game.forEach((row) => {
    row.forEach((square) => {
      square.onClick = () => onClick(square.x!, square.y!)
    })
  })

  // Level data is a fixed rectangular grid, but some levels pad it with fully blank rows
  // (every cell colorless, targetless and modifier-less) above/below the actual puzzle so
  // unrelated levels can share one grid shape. Trimming those from the render (not from
  // `game` itself - x/y indices throughout this file are array positions into the untrimmed
  // grid) keeps the board panel hugging just the real rows instead of leaving empty space.
  const isRowBlank = (row: Level[number]) =>
    row.every((square) => square.color === Color.none && square.targetColor === Color.none && square.modifier === Modifier.none);
  const firstVisibleRow = game.findIndex((row) => !isRowBlank(row));
  const lastVisibleRow = game.length - 1 - [...game].reverse().findIndex((row) => !isRowBlank(row));
  const visibleRowCount = firstVisibleRow === -1 ? game.length : lastVisibleRow - firstVisibleRow + 1;

  const best = dailyEntry ? dailyEntry.best : levelProgress[pack][levelNumber].best;
  const optimal = dailyEntry ? dailyEntry.optimal : levelOptimal[pack][levelNumber];
  // One of the 3 pre-cropped slogan stickers (see public/images/slogan_<lang>_<1-3>.webp),
  // cycled by level so it doesn't repeat on every screen.
  const sloganIndex = ((dailyEntry ? dailyPlayIndex! : levelNumber) % 3) + 1;
  // Daily levels show their position in the (newest-day-first) list, not their (meaningless to
  // the player) index inside whichever pool entry they came from.
  const displayLevelNumber = dailyEntry ? dailyPlayIndex! + 1 : levelNumber + 1;

  const previousButton = (
    <button onClick={() => { playClick(); decrementLevelNumber(); }} className={`col-circle ${styles.navCircle}`} aria-label="prev">
      <TriangleLeftIcon/>
    </button>
  );
  const nextButton = (
    <button onClick={() => { playClick(); incrementLevelNumber(); }} className={`col-circle ${styles.navCircle}`} aria-label="next">
      <TriangleRightIcon/>
    </button>
  );
  const iconRow = (
    <div className={styles.iconRow}>
      <button onClick={() => { playClick(); goHome(); }} className={`col-circle ${styles.iconCircle}`} aria-label="home">
        <HomeIcon/>
      </button>
      <button onClick={() => { playClick(); handleReset(); }} className={`col-circle col-circle--accent ${styles.iconCircle}`} aria-label="reset">
        <ResetIcon/>
      </button>
      <button onClick={() => { playClick(); openSettings(); }} className={`col-circle ${styles.iconCircle}`} aria-label="settings">
        <GearIcon/>
      </button>
    </div>
  );

  return (
    <div className={`${styles.page} ${isSidebar ? styles.pageSidebar : ""}`}>
      <Splashes items={[
        {src: "splash6", style: {top: "1%", left: "-47px", width: "22vw", maxWidth: 100, transform: "rotate(-10deg)"}},
        {src: "splash3", style: {bottom: "1%", right: "-47px", width: "22vw", maxWidth: 100, transform: "rotate(12deg)"}},
      ]}/>
      {isSidebar ? null : (
        <img
          src={`./images/slogan_${language}_${sloganIndex}.webp`}
          alt=""
          aria-hidden="true"
          className={`col-splash ${styles.slogan}`}
        />
      )}
      <div
        className={`col-panel ${styles.header} ${isSidebar ? styles.headerSidebar : ""}`}
        style={headerWidth && !isSidebar ? {"--measuredWidth": `${headerWidth}px`} as CSSProperties : undefined}
      >
        {isSidebar ? (
          <>
            <div className={styles.sidebarTopRow}>
              {previousButton}
              <p className={`col-heading ${styles.levelLabel}`}>{t("level")} {displayLevelNumber}</p>
              {nextButton}
            </div>
            {iconRow}
            <div className={styles.sidebarStats}>
              <div className={styles.statLine}>
                <span className={styles.statLabel}>{t("moves")}</span>
                <span className={styles.statValue}>{moves}</span>
              </div>
              <div className={styles.statLine}>
                <span className={styles.statLabel}>{t("best")}</span>
                <span className={styles.statValue}>{best ?? "-"}</span>
              </div>
              <div className={styles.statLine}>
                <span className={styles.statLabel}>{t("optimal")}</span>
                <span className={styles.statValue}>{optimal ?? "-"}</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className={styles.navRow}>
              {previousButton}
              <div className={styles.levelLabelWrap}>
                <img src="./images/brush_paint.webp" alt="" className={styles.levelLabelBg}/>
                <p className={styles.levelLabel}>{t("level")} {displayLevelNumber}</p>
              </div>
              {nextButton}
            </div>
            {isWideHeader ? null : iconRow}
            {isWideHeader ? (
              <div className={styles.statsRow}>
                <div className={styles.statColumn}>
                  <span className={styles.statLabel}>{t("moves")}</span>
                  <span className={styles.statValue}>{moves}</span>
                </div>
                {iconRow}
                <div className={styles.statsRight}>
                  <div className={styles.statColumn}>
                    <span className={styles.statLabel}>{t("best")}</span>
                    <span className={styles.statValue}>{best ?? "-"}</span>
                  </div>
                  <div className={styles.statColumn}>
                    <span className={styles.statLabel}>{t("optimal")}</span>
                    <span className={styles.statValue}>{optimal ?? "-"}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className={styles.stats}>
                <div className={styles.statColumn}>
                  <span className={styles.statLabel}>{t("moves")}</span>
                  <span className={styles.statValue}>{moves}</span>
                </div>
                <div className={styles.statsRight}>
                  <div className={styles.statColumn}>
                    <span className={styles.statLabel}>{t("best")}</span>
                    <span className={styles.statValue}>{best ?? "-"}</span>
                  </div>
                  <div className={styles.statColumn}>
                    <span className={styles.statLabel}>{t("optimal")}</span>
                    <span className={styles.statValue}>{optimal ?? "-"}</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <div className={`${styles.level} ${isSidebar ? styles.levelSidebar : ""}`}>
        {gameIsWon ? <MessageModal onClick={incrementLevelNumber} message={"complete"}/> : null}
        <div
          ref={gameBoardRef}
          className={`col-panel ${styles.gameBoard}`}
          style={{"--rows": visibleRowCount, "--cols": game[0]?.length ?? 1} as CSSProperties}
        >
          {isLocked ? <MessageModal onClick={undefined} message={"locked"}/> : null}
          {game.map((row, index) => (
            index < firstVisibleRow || index > lastVisibleRow ? null : (
              <div key={index} className={styles.row}>
                {row.map((square) => (
                  <Square key={square.key} {...square} />
                ))}
              </div>
            )
          ))}
        </div>
      </div>
    </div>
  );
}
