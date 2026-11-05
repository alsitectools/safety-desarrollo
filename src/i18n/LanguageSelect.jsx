import { LANGS } from './core.js';
import { useI18n } from './I18nProvider.jsx';

/** Selector de idioma de la cabecera: se ve el código (ES, DE…) y la lista nativa muestra los nombres completos. */
export default function LanguageSelect() {
  const { lang, setLang, t } = useI18n();
  return (
    <label className="app-lang" title={t('common.language')}>
      <span className="app-lang__face" aria-hidden="true">
        <span className="app-lang__icon">🌐</span>
        <span className="app-lang__code">{lang.toUpperCase()}</span>
        <span className="app-lang__caret">▾</span>
      </span>
      <select
        className="app-lang__select"
        value={lang}
        onChange={(event) => setLang(event.target.value)}
        aria-label={t('common.language')}
      >
        {LANGS.map((item) => (
          <option key={item.code} value={item.code}>
            {item.name}
          </option>
        ))}
      </select>
    </label>
  );
}
