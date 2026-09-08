import {createContext, ReactNode, useContext, useEffect, useState} from "react";
import {ColorScheme} from "@/components/Square/Square";

const STORAGE_KEY = "colorScheme";
const DEFAULT_SCHEME: ColorScheme = 0;
const SCHEME_COUNT = 2;

type ColorSchemeContextValue = {
  scheme: ColorScheme;
  cycleScheme: () => void;
};

const ColorSchemeContext = createContext<ColorSchemeContextValue>({
  scheme: DEFAULT_SCHEME,
  cycleScheme: () => {},
});

export function ColorSchemeProvider({children}: { children: ReactNode }) {
  const [scheme, setScheme] = useState<ColorScheme>(DEFAULT_SCHEME);

  useEffect(() => {
    const stored = Number(localStorage.getItem(STORAGE_KEY));
    if (stored === 0 || stored === 1) {
      setScheme(stored);
    }
  }, []);

  function cycleScheme() {
    setScheme((current) => {
      const next = ((current + 1) % SCHEME_COUNT) as ColorScheme;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  return (
    <ColorSchemeContext.Provider value={{scheme, cycleScheme}}>
      {children}
    </ColorSchemeContext.Provider>
  );
}

export function useColorScheme() {
  return useContext(ColorSchemeContext);
}
