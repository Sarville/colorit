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
      <p>{t("levelComplete")}</p>
      <p>{t("tapToContinue")}</p>
    </div>
  }
  return (
    <div className={styles.modal}>
      <div className={styles.modalBanner} onClick={props.onClick}>
        <div className={styles.modalContent}>
          <div className={styles[props.message]}></div>
          {text}
        </div>
      </div>
    </div>
  );
}
