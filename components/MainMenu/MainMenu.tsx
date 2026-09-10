import {useEffect, useState} from "react";
import {useLanguage} from "@/i18n/LanguageContext";
import {playClick} from "@/lib/sound";
import {Logo} from "@/components/Logo";
import {Splashes, defaultSplashes} from "@/components/Splashes";
import {FlagButton} from "@/components/FlagButton";
import {shouldShowThankYouAnimation} from "@/lib/support";
import styles from "./MainMenu.module.css";

type MainMenuProps = {
  onStart: () => void,
  onSettings: () => void,
  showSignIn: boolean,
  onSignIn: () => void,
  adsDisabled: boolean,
  score: number,
};

// defaultSplashes' last entry is the bottom-right corner blob - the thank-you animation takes
// its spot on this screen, so it's dropped from the shared set rather than stacking both.
const splashesWithoutCorner = defaultSplashes.slice(0, -1);

export function MainMenu({onStart, onSettings, showSignIn, onSignIn, adsDisabled, score}: MainMenuProps) {
  const {t} = useLanguage();
  // Starts false (matching the server-rendered markup, which has no platform to check against)
  // and flips after the async platform/purchase check resolves - computing this directly during
  // render would read a different value on the server than the client and desync the SSR'd
  // <img src> from hydration onward, since React doesn't patch already-hydrated attributes.
  const [showThankYou, setShowThankYou] = useState(false);
  useEffect(() => {
    shouldShowThankYouAnimation(adsDisabled).then(setShowThankYou);
  }, [adsDisabled]);

  return (
    <div className={styles.page}>
      <Splashes items={showThankYou ? splashesWithoutCorner : defaultSplashes}/>
      {showThankYou ? (
        <img src="./images/thankyou.webp" alt="" aria-hidden="true" className={styles.thankYou}/>
      ) : null}
      <Logo className={styles.logo}/>
      <div className={styles.scoreWrap}>
        <p className={styles.scoreLabel}>{t("score")}</p>
        <div className={styles.scoreMedal}>
          <p className={styles.scoreValue}>{score}</p>
        </div>
      </div>
      <div className={styles.buttons}>
        <FlagButton onClick={() => { playClick(); onStart(); }}>{t("start")}</FlagButton>
        <FlagButton onClick={() => { playClick(); onSettings(); }}>{t("settings")}</FlagButton>
        {showSignIn ? (
          <FlagButton onClick={() => { playClick(); onSignIn(); }}>{t("yandexId")}</FlagButton>
        ) : null}
      </div>
    </div>
  );
}
