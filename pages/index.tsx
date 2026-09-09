import {createContext, useEffect, useState} from 'react';

import Header from "@/components/Header";
import {Game, Level} from "@/components/Game/Game";
import {LevelPicker} from "@/components/LevelPicker/LevelPicker";
import {Settings} from "@/components/Settings/Settings";
import {MainMenu} from "@/components/MainMenu/MainMenu";
import {Tutorial} from "@/components/Tutorial/Tutorial";
import {AuthPrompt} from "@/components/AuthPrompt/AuthPrompt";
import {SupportAuthorModal} from "@/components/SupportAuthor/SupportAuthorModal";
import {EasyLevels, EasyDefaultProgress, EasyOptimal} from "@/levels/Easy";
import {MediumLevels, MediumDefaultProgress, MediumOptimal} from "@/levels/Medium";
import {HardLevels, HardDefaultProgress, HardOptimal} from "@/levels/Hard";
import {CommunityLevels, CommunityDefaultProgress, CommunityOptimal} from "@/levels/Community";
import {levelProgressProps, packChoices} from "@/levels/levelsUtils";
import {SelectPack} from "@/components/SelectPack/SelectPack";
import {LanguageProvider} from "@/i18n/LanguageContext";
import {ColorSchemeProvider} from "@/theme/ColorSchemeContext";
import {getYsdk} from "@/lib/yandexSdk";
import {initVkBridge, isVkEnvironment} from "@/lib/vkSdk";
import {playGameMusic, playMenuMusic} from "@/lib/music";
import {loadProgress, saveProgress} from "@/lib/cloudSave";
import {isSignedIn, openAuthDialog} from "@/lib/yandexAuth";
import {isAdsDisabled, purchaseSupportAuthor, resetSupportState, restoreYandexPurchases} from "@/lib/support";

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

// VK's storage API caps each key's value at 4096 bytes - all four packs combined under one
// "levelProgress" key runs well past that (~6KB with real progress), so VKWebAppStorageSet
// silently failed and progress fell back to this device's localStorage instead of VK's account
// storage (that's why the purchase, saved under its own small key, survived but levels didn't).
// One key per pack keeps each save comfortably under the limit.
// ponytail: Community is user-submitted and could eventually grow past the limit on its own;
// split it further (e.g. by community level id range) if that ever happens.
const progressKeyForPack = (pack: packChoices) => `levelProgress_${pack}`;
const packChoicesList: Array<packChoices> = ["Easy", "Medium", "Hard", "Community"];

type levelOptimalProps = {
  "Easy": Array<number | null>,
  "Medium": Array<number | null>,
  "Hard": Array<number | null>,
  "Community": Array<number | null>,
}

// Minimum move count per level, parsed from the level pack's `solution` attribute at build time -
// used to show "Optimal: N" and to award the star badge when a level is solved in that many moves.
export const levelOptimal: levelOptimalProps = {
  "Easy": EasyOptimal,
  "Medium": MediumOptimal,
  "Hard": HardOptimal,
  "Community": CommunityOptimal,
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
  lastExitedLevel: null as number | null,
  changeLastExitedLevel: (_level: number | null) => {},
  openSettings: () => {},
});

// Set only for the games.sarville.online/vk build - VK's own hosting (vk.com/app<id>) already
// guarantees VK-only access, but a self-hosted iframe URL is a public link like any other, so
// this build refuses to render outside a real VK launch (see isVkEnvironment) instead of relying
// on VK's platform boundary.
const REQUIRE_VK = process.env.NEXT_PUBLIC_REQUIRE_VK === "true";

export default function Home() {
  const [vkRequiredButMissing, setVkRequiredButMissing] = useState(false);
  const [progressLoaded, setProgressLoaded] = useState(false)
  const [currentScreen, setCurrentScreen] = useState(screens.MainMenu)
  const [levelNumber, setLevelNumber] = useState(0);
  const [levelProgress, setLevelProgress] = useState(levelProgressDefault)
  const [pack, setPack] = useState<packChoices>(defaultPack)
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [lastExitedLevel, setLastExitedLevel] = useState<number | null>(null);
  const [screenBeforeSettings, setScreenBeforeSettings] = useState(screens.MainMenu);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [adsDisabled, setAdsDisabled] = useState(false);

  useEffect(() => {
    // Testing-only: `?resetProgress` in the URL skips the load entirely, so levelProgress stays
    // at levelProgressDefault and the save effect below then overwrites the stored keys with it -
    // an easy way to test the fresh-install flow without clearing VK storage by hand.
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("resetProgress")) {
      resetSupportState();
      setProgressLoaded(true);
      return;
    }
    Promise.all(
      packChoicesList.map((pack) => loadProgress<Array<levelProgressProps>>(progressKeyForPack(pack)))
    ).then((perPack) => {
      const merged = {...levelProgressDefault};
      let hasAny = false;
      packChoicesList.forEach((pack, i) => {
        if (perPack[i]) {
          merged[pack] = perPack[i]!;
          hasAny = true;
        }
      });
      if (hasAny) {
        setLevelProgress(merged);
      }
      // Only allow saving once the initial cloud/local read has resolved, otherwise a save
      // effect triggered before it completes could overwrite real progress with the defaults.
      setProgressLoaded(true);
    });
  }, []);

  useEffect(() => {
    getYsdk().then((ysdk) => ysdk?.features?.LoadingAPI?.ready());
    initVkBridge();
    if (REQUIRE_VK && !isVkEnvironment()) {
      setVkRequiredButMissing(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("resetProgress")) {
      setAdsDisabled(false);
      return;
    }
    restoreYandexPurchases().then(() => isAdsDisabled()).then(setAdsDisabled);
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
    // Tells Yandex Games whether the player is mid-level right now - used for playtime
    // stats and to gate when the platform considers it safe to interrupt with ads.
    getYsdk().then((ysdk) => {
      const gameplay = ysdk?.features?.GameplayAPI;
      if (inGame) {
        gameplay?.start();
      } else {
        gameplay?.stop();
      }
    });
  }, [inGame]);

  useEffect(() => {
    if (progressLoaded) {
      packChoicesList.forEach((pack) => saveProgress(levelProgress[pack], progressKeyForPack(pack)));
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

  function changeLastExitedLevel(level: number | null) {
    setLastExitedLevel(level)
  }

  async function handleSupportAuthor(): Promise<boolean> {
    const success = await purchaseSupportAuthor();
    if (success) {
      setAdsDisabled(true);
    }
    return success;
  }

  function openSettings() {
    setScreenBeforeSettings(currentScreen)
    setCurrentScreen(screens.Settings)
  }

  if (vkRequiredButMissing) {
    return (
      <main style={{display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", textAlign: "center", padding: "2rem"}}>
        <p>Эта игра открывается только внутри ВКонтакте.</p>
      </main>
    );
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
            lastExitedLevel,
            changeLastExitedLevel,
            openSettings,
          }}
        >
          <Header/>
          {showAuthPrompt ? (
            <AuthPrompt onSignIn={handleSignIn} onDismiss={() => setShowAuthPrompt(false)}/>
          ) : null}
          {showSupportModal ? (
            <SupportAuthorModal
              adsDisabled={adsDisabled}
              onSupport={handleSupportAuthor}
              onClose={() => setShowSupportModal(false)}
            />
          ) : null}
          <main>
            {currentScreen === screens.MainMenu ? (
              <MainMenu
                onStart={() => setCurrentScreen(screens.SelectPack)}
                onSettings={openSettings}
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
                onClose={() => setCurrentScreen(screenBeforeSettings)}
                onSupportAuthor={() => setShowSupportModal(true)}
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

