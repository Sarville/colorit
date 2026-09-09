import {useLanguage} from "@/i18n/LanguageContext";
import {playClick} from "@/lib/sound";
import {FlagButton} from "@/components/FlagButton";
import styles from "./AuthPrompt.module.css";

export function AuthPrompt({onSignIn, onDismiss}: { onSignIn: () => void, onDismiss: () => void }) {
  const {t} = useLanguage();

  return (
    <div className={styles.modal}>
      <div className={`col-panel ${styles.dialog}`}>
        <p>{t("signInPrompt")}</p>
        <FlagButton onClick={() => { playClick(); onSignIn(); }}>{t("signIn")}</FlagButton>
        <FlagButton ghost onClick={() => { playClick(); onDismiss(); }}>{t("notNow")}</FlagButton>
      </div>
    </div>
  );
}
