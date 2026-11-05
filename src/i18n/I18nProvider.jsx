import { createContext, useContext, useMemo, useSyncExternalStore } from 'react';
import { getIntlLocale, getLang, setLang, subscribe, t } from './core.js';

const I18nContext = createContext(null);

/** Vuelve a pintar toda la app cuando cambia el idioma. */
export function I18nProvider({ children }) {
  const lang = useSyncExternalStore(subscribe, getLang, getLang);
  const value = useMemo(() => ({
    lang,
    locale: getIntlLocale(lang),
    setLang,
    t: (key, vars) => t(key, vars, lang),
  }), [lang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** const { t, lang, setLang } = useI18n(); */
export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n fuera de <I18nProvider>');
  return value;
}
