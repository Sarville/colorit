import {createContext, useEffect, useState} from 'react';

import styles from "./index.module.css";
import Header from "./header";
import {Game, Level} from "@/components/Game/Game";
import {LevelPicker} from "@/components/LevelPicker/LevelPicker";
import {Settings} from "@/components/Settings/Settings";
import {MainMenu} from "@/components/MainMenu/MainMenu";
import {Tutorial} from "@/components/Tutorial/Tutorial";
import {AuthPrompt} from "@/components/AuthPrompt/AuthPrompt";
import {EasyLevels, EasyDefaultProgress} from "@/levels/Easy";
import {MediumLevels, MediumDefaultProgress} from "@/levels/Medium";
import {HardLevels, HardDefaultProgress} from "@/levels/Hard";
import {CommunityLevels, CommunityDefaultProgress} from "@/levels/Community";
import {levelProgressProps, packChoices} from "@/levels/levelsUtils";
import {SelectPack} from "@/components/SelectPack/SelectPack";
import {LanguageProvider} from "@/i18n/LanguageContext";
import {ColorSchemeProvider} from "@/theme/ColorSchemeContext";
import {getYsdk} from "@/lib/yandexSdk";
import {playGameMusic, playMenuMusic} from "@/lib/music";
import {loadProgress, saveProgress} from "@/lib/cloudSave";
import {isSignedIn, openAuthDialog} from "@/lib/yandexAuth";

export const enum screens {
  MainMenu = "MainMenu",
  SelectPack = "SelectPack",
  SelectLevel = "SelectLevel",
  Game = "Game",
  Settings = "Settings",
  Tutorial = "Tutorial",
}

type levelsProps = {
  "Easy": Array<Level>,
  "Medium": Array<Level>,
  "Hard": Array<Level>,
  "Community": Array<Level>,
}

export const levels: levelsProps = {
  "Easy": EasyLevels,
  "Medium": MediumLevels,
  "Hard": HardLevels,
  "Community": CommunityLevels,
}

type levelPackProgressProps = {
  "Easy": Array<levelProgressProps>,
  "Medium": Array<levelProgressProps>,
  "Hard": Array<levelProgressProps>,
  "Community": Array<levelProgressProps>
}

export const levelProgressDefault: levelPackProgressProps = {
  "Easy": EasyDefaultProgress,
  "Medium": MediumDefaultProgress,
  "Hard": HardDefaultProgress,
  "Community": CommunityDefaultProgress,
}

// TODO
//  Update game screen one square at a time so you get a nice flow, e.g. medium 47
//  Jest tests
//  Fix all the ts-ignore errors.
//  Handle back button (move from game back to level select)


const defaultPack: packChoices = "Easy"

export const LevelContext = createContext({
  levelNumber: 0,
  changeLevelNumber: (_level: number) => {},
  changeCurrentScreen: (_screen: screens) => {},
  levelProgress: levelProgressDefault,
  changeLevelProgress: (_levelProgress: levelPackProgressProps) => {},
  pack: defaultPack,
  changePack: (_pack: packChoices) => {},
});

export default function Home() {
  const [progressLoaded, setProgressLoaded] = useState(false)
  const [currentScreen, setCurrentScreen] = useState(screens.MainMenu)
  const [levelNumber, setLevelNumber] = useState(0);
  const [levelProgress, setLevelProgress] = useState(levelProgressDefault)
  const [pack, setPack] = useState<packChoices>(defaultPack)
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  useEffect(() => {
    loadProgress<levelPackProgressProps>().then((progress) => {
      if (progress) {
        setLevelProgress(progress);
      }
      // Only allow saving once the initial cloud/local read has resolved, otherwise a save
      // effect triggered before it completes could overwrite real progress with the defaults.
      setProgressLoaded(true);
    });
  }, []);

  useEffect(() => {
    getYsdk().then((ysdk) => ysdk?.features?.LoadingAPI?.ready());
  }, []);

  useEffect(() => {
    isSignedIn().then((result) => {
      setSignedIn(result);
      if (result === false) {
        setShowAuthPrompt(true);
      }
    });
  }, []);

  function handleSignIn() {
    setShowAuthPrompt(false);
    openAuthDialog().then(() => isSignedIn()).then(setSignedIn);
  }

  // Level music only while the board itself is on screen; everywhere else (including pack/level
  // pickers) keeps the menu track playing, uninterrupted - playMenuMusic()/playGameMusic() are
  // no-ops if that track is already playing, so this doesn't restart it on every menu screen.
  const inGame = currentScreen === screens.Game;
  useEffect(() => {
    if (inGame) {
      playGameMusic();
    } else {
      playMenuMusic();
    }
  }, [inGame]);

  useEffect(() => {
    if (progressLoaded) {
      saveProgress(levelProgress);
    }
  }, [levelProgress, progressLoaded]);


  function changeLevelNumber(level: number) {
    setLevelNumber(() => level);
  }

  function changeLevelProgress(progress: levelPackProgressProps) {
    setLevelProgress(() => progress);
  }

  function changeCurrentScreen(screen: screens) {
    setCurrentScreen(() => screen)
  }

  function changePack(pack: packChoices) {
    setPack(() => pack)
  }

  return (
    <LanguageProvider>
      <ColorSchemeProvider>
        <LevelContext.Provider
          value={{
            levelNumber,
            changeLevelNumber,
            changeCurrentScreen,
            levelProgress,
            changeLevelProgress,
            // @ts-ignore
            pack,
            changePack,
          }}
        >
          <Header/>
          {showAuthPrompt ? (
            <AuthPrompt onSignIn={handleSignIn} onDismiss={() => setShowAuthPrompt(false)}/>
          ) : null}
          <main className={styles.main}>
            {currentScreen === screens.MainMenu ? (
              <MainMenu
                onStart={() => setCurrentScreen(screens.SelectPack)}
                onSettings={() => setCurrentScreen(screens.Settings)}
                showSignIn={signedIn === false}
                onSignIn={handleSignIn}
              />
            ) : null}
            {currentScreen === screens.SelectPack ? <SelectPack/> : null}
            {currentScreen === screens.SelectLevel ? <LevelPicker/> : null}
            {currentScreen === screens.Game ? <Game/> : null}
            {currentScreen === screens.Settings ? (
              <Settings
                onOpenTutorial={() => setCurrentScreen(screens.Tutorial)}
                onClose={() => setCurrentScreen(screens.MainMenu)}
              />
            ) : null}
            {currentScreen === screens.Tutorial ? (
              <Tutorial onClose={() => setCurrentScreen(screens.Settings)}/>
            ) : null}
          </main>
        </LevelContext.Provider>
      </ColorSchemeProvider>
    </LanguageProvider>
  );
}

