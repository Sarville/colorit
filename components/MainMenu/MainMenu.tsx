import {useLanguage} from "@/i18n/LanguageContext";
import {playClick} from "@/lib/sound";
import {Logo} from "@/components/Logo";
import {Splashes, defaultSplashes} from "@/components/Splashes";
import {FlagButton} from "@/components/FlagButton";
import styles from "./MainMenu.module.css";

type MainMenuProps = {
  onStart: () => void,
  onSettings: () => void,
  showSignIn: boolean,
  onSignIn: () => void,
};

export function MainMenu({onStart, onSettings, showSignIn, onSignIn}: MainMenuProps) {
  const {t} = useLanguage();

  return (
    <div className={styles.page}>
      <Splashes items={defaultSplashes}/>
      <Logo className={styles.logo}/>
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
