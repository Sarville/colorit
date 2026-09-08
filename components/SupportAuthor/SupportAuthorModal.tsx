import {useState} from "react";
import {useLanguage} from "@/i18n/LanguageContext";
import {playClick} from "@/lib/sound";
import styles from "./SupportAuthorModal.module.css";

export function SupportAuthorModal({adsDisabled, onSupport, onClose}: {
  adsDisabled: boolean,
  onSupport: () => Promise<void>,
  onClose: () => void,
}) {
  const {t} = useLanguage();
  const [purchasing, setPurchasing] = useState(false);

  async function handleSupport() {
    playClick();
    setPurchasing(true);
    await onSupport();
    setPurchasing(false);
  }

  return (
    <div className={styles.modal}>
      <div className={styles.dialog}>
        <p>{adsDisabled ? t("supportAfterText") : t("supportBeforeText")}</p>
        <button className={styles.support} disabled={purchasing} onClick={handleSupport}>
          {adsDisabled ? t("supportAgainButton") : t("supportButton")}
        </button>
        <button className={styles.dismiss} onClick={() => { playClick(); onClose(); }}>{t("close")}</button>
      </div>
    </div>
  );
}
