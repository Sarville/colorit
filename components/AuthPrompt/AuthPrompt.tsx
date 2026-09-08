import {useLanguage} from "@/i18n/LanguageContext";
import {playClick} from "@/lib/sound";
import styles from "./AuthPrompt.module.css";

export function AuthPrompt({onSignIn, onDismiss}: { onSignIn: () => void, onDismiss: () => void }) {
  const {t} = useLanguage();

  return (
    <div className={styles.modal}>
      <div className={styles.dialog}>
        <p>{t("signInPrompt")}</p>
        <button className={styles.signIn} onClick={() => { playClick(); onSignIn(); }}>{t("signIn")}</button>
        <button className={styles.dismiss} onClick={() => { playClick(); onDismiss(); }}>{t("notNow")}</button>
      </div>
    </div>
  );
}
