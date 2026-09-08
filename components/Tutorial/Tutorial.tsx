import {useState} from "react";
import {useLanguage} from "@/i18n/LanguageContext";
import {playClick} from "@/lib/sound";
import {Color, Modifier, Square} from "@/components/Square/Square";
import styles from "./Tutorial.module.css";

type Cell = { color: Color, targetColor: Color, modifier: Modifier };

function makeColumn(paintColor: Color, arrowAt: "top" | "bottom", filled: boolean): Array<Cell> {
  const arrow: Cell = {color: paintColor, targetColor: Color.none, modifier: arrowAt === "top" ? Modifier.down : Modifier.up};
  const empty = (): Cell => ({color: filled ? paintColor : Color.none, targetColor: paintColor, modifier: Modifier.none});
  return arrowAt === "top" ? [arrow, empty(), empty()] : [empty(), empty(), arrow];
}

const columns: Array<{paintColor: Color, arrowAt: "top" | "bottom"}> = [
  {paintColor: Color.blue, arrowAt: "bottom"},
  {paintColor: Color.red, arrowAt: "top"},
  {paintColor: Color.green, arrowAt: "bottom"},
];

function DemoBoard({filled}: { filled: boolean }) {
  return (
    <div className={styles.board}>
      {columns.map(({paintColor, arrowAt}, index) => (
        <div key={index} className={styles.boardColumn}>
          {makeColumn(paintColor, arrowAt, filled).map((cell, row) => (
            <Square key={`${index}-${row}`} color={cell.color} targetColor={cell.targetColor} modifier={cell.modifier}/>
          ))}
        </div>
      ))}
    </div>
  );
}

export function Tutorial({onClose}: { onClose: () => void }) {
  const {t} = useLanguage();
  const [slide, setSlide] = useState(0);
  const lastSlide = 1;

  function next() {
    playClick();
    if (slide < lastSlide) {
      setSlide(slide + 1);
    } else {
      onClose();
    }
  }

  return (
    <div className={styles.contentArea} onClick={next}>
      <h1 className={styles.title}>
        {t("howToPlay")}<br/>
        <span className={styles.brand}>{t("brandName")}</span>
      </h1>

      {slide === 0 ? (
        <div className={styles.slide}>
          <div className={styles.boardsRow}>
            <DemoBoard filled={false}/>
            <span className={styles.chevron}>&raquo;</span>
            <DemoBoard filled={true}/>
          </div>
          <p className={styles.caption}>{t("fillAllBoxes")}</p>
        </div>
      ) : (
        <div className={styles.slide}>
          <p className={styles.caption}>{t("specialBoxes")}</p>
          <div className={styles.specialRow}>
            <div className={styles.icon}><Square color={Color.blue} targetColor={Color.none} modifier={Modifier.right}/></div>
            <p>{t("fillsOneDirection")}</p>
          </div>
          <div className={styles.specialRow}>
            <div className={styles.icon}><Square color={Color.blue} targetColor={Color.none} modifier={Modifier.circle}/></div>
            <p>{t("fillsAllAround")}</p>
          </div>
        </div>
      )}

      <button className={styles.next} onClick={next}>{slide < lastSlide ? t("tapToContinue") : t("tutorialClose")}</button>
    </div>
  );
}
