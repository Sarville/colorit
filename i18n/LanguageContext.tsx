import {createContext, ReactNode, useContext, useEffect, useState} from "react";
import {Language, TranslationKey, translations} from "./translations";
import {getYsdk} from "@/lib/yandexSdk";

const STORAGE_KEY = "language";
const DEFAULT_LANGUAGE: Language = "ru";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextValue>({
  language: DEFAULT_LANGUAGE,
  setLanguage: () => {},
  t: (key) => translations[DEFAULT_LANGUAGE][key],
});

export function LanguageProvider({children}: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "ru" || stored === "en") {
      setLanguage(stored);
      return;
    }
    // No explicit choice yet - follow the Yandex client's own language setting.
    getYsdk().then((ysdk) => {
      const lang = ysdk?.environment?.i18n?.lang;
      if (lang) {
        setLanguage(lang.startsWith("ru") ? "ru" : "en");
      }
    });
  }, []);

  function changeLanguage(next: Language) {
    setLanguage(next);
    localStorage.setItem(STORAGE_KEY, next);
  }

  function t(key: TranslationKey) {
    return translations[language][key];
  }

  return (
    <LanguageContext.Provider value={{language, setLanguage: changeLanguage, t}}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
