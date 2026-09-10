import {MouseEventHandler} from "react";
import {useLanguage} from "@/i18n/LanguageContext";
import styles from "./MessageModal.module.css";


type MessageModalProps = {
  onClick: MouseEventHandler<HTMLDivElement> | undefined
  message: "complete" | "locked"
}

export function MessageModal(props: MessageModalProps) {
  const {t} = useLanguage();
  let text = <></>
  if (props.message === "locked") {
    text = <div>
      <p>{t("lockedLine1")}</p>
      <p>{t("lockedLine2")}</p>
      <p>{t("lockedLine3")}</p>
    </div>
  } else if (props.message === "complete") {
    text = <div>
      <p className={styles.headline}>{t("levelComplete")}</p>
      <p className={styles.subline}>{t("tapToContinue")}</p>
    </div>
  }
  const containedClass = props.message === "locked" ? styles.modalContained : "";
  return (
    <div className={`${styles.modal} ${containedClass}`} onClick={props.onClick}>
      <div className={`col-panel ${styles.card}`}>
        <div className={`${styles.badge} col-circle col-circle--accent`}>
          <div className={styles[props.message]}></div>
        </div>
        {text}
      </div>
    </div>
  );
}
