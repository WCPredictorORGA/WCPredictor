import { createContext, useContext, useState } from 'react';
import dict from './i18n.js';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('lang') || 'fr');

  const setLang = (next) => {
    setLangState(next);
    localStorage.setItem('lang', next);
  };

  const t = (key) => dict[lang]?.[key] ?? dict['fr']?.[key] ?? key;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLang = () => useContext(LanguageContext);
