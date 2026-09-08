import {useLanguage} from "@/i18n/LanguageContext";
import {playClick} from "@/lib/sound";
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
      <h1 className={styles.title}>{t("brandName")}</h1>
      <div className={styles.buttons}>
        <div className={styles.selector}>
          <button onClick={() => { playClick(); onStart(); }}>{t("start")}</button>
        </div>
        <div className={styles.selector}>
          <button onClick={() => { playClick(); onSettings(); }}>{t("settings")}</button>
        </div>
        {showSignIn ? (
          <div className={styles.selector}>
            <button onClick={() => { playClick(); onSignIn(); }}>{t("yandexId")}</button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
