import {useState} from "react";
import {useLanguage} from "@/i18n/LanguageContext";
import {Language} from "@/i18n/translations";
import {useColorScheme} from "@/theme/ColorSchemeContext";
import {Color, getColorHex} from "@/components/Square/Square";
import {isSoundEnabled, playClick, setSoundEnabled} from "@/lib/sound";
import {isMusicEnabled, setMusicEnabled} from "@/lib/music";
import {MusicOffIcon, MusicOnIcon, SoundOffIcon, SoundOnIcon} from "@/components/Settings/icons";
import styles from "./Settings.module.css";

const previewLayout: Array<Array<Color>> = [
  [Color.red, Color.yellow],
  [Color.green, Color.blue, Color.indigo],
];

export function Settings({onOpenTutorial, onClose}: { onOpenTutorial: () => void, onClose: () => void }) {
  const {language, setLanguage, t} = useLanguage();
  const {scheme, cycleScheme} = useColorScheme();
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [musicOn, setMusicOn] = useState(isMusicEnabled());

  function toggleSound() {
    const next = !soundOn;
    setSoundEnabled(next);
    setSoundOn(next);
    if (next) {
      playClick();
    }
  }

  function toggleMusic() {
    playClick();
    const next = !musicOn;
    setMusicEnabled(next);
    setMusicOn(next);
  }

  function toggleLanguage() {
    playClick();
    setLanguage(language === "ru" ? "en" as Language : "ru" as Language);
  }

  function handleCycleScheme() {
    playClick();
    cycleScheme();
  }

  function handleOpenTutorial() {
    playClick();
    onOpenTutorial();
  }

  function handleClose() {
    playClick();
    onClose();
  }

  return (
    <div className={styles.contentArea}>
      <div className={styles.row}>
        <div className={styles.selector}>
          <button onClick={toggleSound}>{t("sound")}</button>
        </div>
        <span className={styles.icon} onClick={toggleSound}>
          {soundOn ? <SoundOnIcon className={styles.iconSvg}/> : <SoundOffIcon className={styles.iconSvg}/>}
        </span>
      </div>

      <div className={styles.row}>
        <div className={styles.selector}>
          <button onClick={toggleMusic}>{t("music")}</button>
        </div>
        <span className={styles.icon} onClick={toggleMusic}>
          {musicOn ? <MusicOnIcon className={styles.iconSvg}/> : <MusicOffIcon className={styles.iconSvg}/>}
        </span>
      </div>

      <div className={styles.row}>
        <div className={styles.selector}>
          <button onClick={handleCycleScheme}>{t("colors")}</button>
        </div>
        <div className={styles.colorPreview} onClick={handleCycleScheme}>
          {previewLayout.map((row, rowIndex) => (
            <div key={rowIndex} className={styles.colorPreviewRow}>
              {row.map((color) => (
                <span key={color} className={styles.swatch} style={{backgroundColor: getColorHex(color, scheme)}}/>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.selector}>
          <button onClick={handleOpenTutorial}>{t("tutorial")}</button>
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.selector}>
          <button onClick={toggleLanguage}>{t("language")}</button>
        </div>
        <span className={styles.icon}>{language.toUpperCase()}</span>
      </div>

      <div className={styles.backRow}>
        <div className={styles.backSelector}>
          <button onClick={handleClose}>{t("back")}</button>
        </div>
      </div>
    </div>
  );
}
