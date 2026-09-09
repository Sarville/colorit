import {ChangeEvent, CSSProperties, useState} from "react";
import {useLanguage} from "@/i18n/LanguageContext";
import {Language} from "@/i18n/translations";
import {useColorScheme} from "@/theme/ColorSchemeContext";
import {Color, getColorHex} from "@/components/Square/Square";
import {getSoundVolume, isSoundEnabled, playClick, setSoundEnabled, setSoundVolume} from "@/lib/sound";
import {getMusicVolume, isMusicEnabled, setMusicEnabled, setMusicVolume} from "@/lib/music";
import {MusicOffIcon, MusicOnIcon, SoundOffIcon, SoundOnIcon} from "@/components/Settings/icons";
import {ChevronRightIcon} from "@/components/icons";
import {Logo} from "@/components/Logo";
import {Splashes, defaultSplashes} from "@/components/Splashes";
import {FlagButton} from "@/components/FlagButton";
import styles from "./Settings.module.css";

const previewLayout: Array<Array<Color>> = [
  [Color.red, Color.yellow],
  [Color.green, Color.blue, Color.indigo],
];

export function Settings({onOpenTutorial, onClose, onSupportAuthor}: {
  onOpenTutorial: () => void,
  onClose: () => void,
  onSupportAuthor: () => void,
}) {
  const {language, setLanguage, t} = useLanguage();
  const {scheme, cycleScheme} = useColorScheme();
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [musicOn, setMusicOn] = useState(isMusicEnabled());
  const [soundVolume, setSoundVolumeState] = useState(getSoundVolume());
  const [musicVolume, setMusicVolumeState] = useState(getMusicVolume());

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

  function handleSoundVolumeChange(e: ChangeEvent<HTMLInputElement>) {
    const value = Number(e.target.value);
    setSoundVolumeState(value);
    setSoundVolume(value);
  }

  function handleMusicVolumeChange(e: ChangeEvent<HTMLInputElement>) {
    const value = Number(e.target.value);
    setMusicVolumeState(value);
    setMusicVolume(value);
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

  const sliderStyle = (value: number): CSSProperties => ({
    background: `linear-gradient(to right, #2f8ce0 0%, #2f8ce0 ${value}%, #dbe8f7 ${value}%, #dbe8f7 100%)`,
  });

  return (
    <div className={styles.page}>
      <Splashes items={defaultSplashes}/>
      <Logo className={styles.logo}/>
      <div className={styles.contentArea}>
        <div className={styles.panelWrap}>
          <h1 className={`col-heading ${styles.panelTitle}`}>{t("settings")}</h1>
          <div className={`col-panel ${styles.panel}`}>
            <div className={styles.row}>
              <FlagButton variant="tag" onClick={toggleSound}>{t("sound")}</FlagButton>
              <span className={styles.icon} onClick={toggleSound}>
                {soundOn ? <SoundOnIcon className={styles.iconSvg}/> : <SoundOffIcon className={styles.iconSvg}/>}
              </span>
            </div>
            <div className={styles.sliderRow}>
              <input
                type="range" min={0} max={100} value={soundVolume}
                onChange={handleSoundVolumeChange}
                className={styles.slider}
                style={sliderStyle(soundVolume)}
                aria-label={t("sound")}
              />
            </div>

            <div className={styles.row}>
              <FlagButton variant="tag" onClick={toggleMusic}>{t("music")}</FlagButton>
              <span className={styles.icon} onClick={toggleMusic}>
                {musicOn ? <MusicOnIcon className={styles.iconSvg}/> : <MusicOffIcon className={styles.iconSvg}/>}
              </span>
            </div>
            <div className={styles.sliderRow}>
              <input
                type="range" min={0} max={100} value={musicVolume}
                onChange={handleMusicVolumeChange}
                className={styles.slider}
                style={sliderStyle(musicVolume)}
                aria-label={t("music")}
              />
            </div>

            <div className={styles.row}>
              <FlagButton variant="tag" onClick={handleCycleScheme}>{t("colors")}</FlagButton>
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
              <FlagButton variant="tag" onClick={handleOpenTutorial}>{t("tutorial")}</FlagButton>
            </div>

            <div className={styles.row}>
              <FlagButton variant="tag" onClick={() => { playClick(); onSupportAuthor(); }}>{t("supportAuthor")}</FlagButton>
            </div>

            <div className={styles.row}>
              <FlagButton variant="tag" onClick={toggleLanguage}>{t("language")}</FlagButton>
              <span className={styles.icon} onClick={toggleLanguage}>
                {language.toUpperCase()}
                <ChevronRightIcon className={styles.langChevron}/>
              </span>
            </div>
          </div>
        </div>

        <FlagButton pointLeft className={styles.backBtn} onClick={handleClose}>
          {t("back")}
        </FlagButton>
      </div>
    </div>
  );
}
