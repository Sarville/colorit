import {useLanguage} from "@/i18n/LanguageContext";
import {playClick} from "@/lib/sound";
import {FlagButton} from "@/components/FlagButton";
import styles from "./ResetProgressModal.module.css";

export function ResetProgressModal({onConfirm, onClose}: {
  onConfirm: () => void,
  onClose: () => void,
}) {
  const {t} = useLanguage();
  return (
    <div className={styles.modal}>
      <div className={`col-panel ${styles.dialog}`}>
        <p>{t("resetProgressWarning")}</p>
        <FlagButton dense onClick={() => { playClick(); onConfirm(); }}>{t("resetProgressConfirm")}</FlagButton>
        <FlagButton dense ghost onClick={() => { playClick(); onClose(); }}>{t("cancel")}</FlagButton>
      </div>
    </div>
  );
}
