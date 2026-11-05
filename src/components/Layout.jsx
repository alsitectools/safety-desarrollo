import { goToPortal } from '../auth/usePortalAuth.js';
import { initials } from '../lib/format.js';
import LanguageSelect from '../i18n/LanguageSelect.jsx';
import { useI18n } from '../i18n/I18nProvider.jsx';

const BRAND = 'Safety Desarrollo';
// Marca registrada: no se traduce.
const LOGO_ALT = 'Alsina Safety';
const LOGO_SRC = `${import.meta.env.BASE_URL}logo-alsina-safety.png`;

// labelKey se traduce al pintar.
const NAV = [
  { name: 'panel', labelKey: 'app.nav.panel', hash: '#/panel' },
  { name: 'kanban', labelKey: 'app.nav.kanban', hash: '#/kanban' },
  { name: 'gantt', labelKey: 'gantt.nav', hash: '#/gantt' },
  { name: 'lista', labelKey: 'app.nav.list', hash: '#/lista' },
  { name: 'fabricantes', labelKey: 'app.nav.suppliers', hash: '#/fabricantes' },
  { name: 'config', labelKey: 'app.nav.config', hash: '#/config', adminOnly: true },
];

/** Cabecera común (marca, volver al portal, usuario) + navegación + contenido. */
export default function Layout({ user, isAppAdmin, active, children }) {
  const { t } = useI18n();
  const current = active === 'proyecto' ? 'lista' : active;
  return (
    <>
      <header className="app-header">
        <div className="app-header__bar">
          <a className="app-brand" href="#/panel" aria-label={t('app.brand.homeAria', { brand: BRAND })}>
            {/* Logotipo oficial sin deformar (alto fijo, ancho automático) y con su área de respeto en CSS. */}
            <img className="app-brand__logo" src={LOGO_SRC} alt={LOGO_ALT} width="2850" height="506" />
            <span className="app-brand__text" aria-hidden="true">
              <span className="app-brand__title">{t('app.brand.appName')}</span>
              <span className="app-brand__sub">{t('app.brand.subtitle')}</span>
            </span>
          </a>
          <span className="app-header__spacer" />
          <LanguageSelect />
          {user && (
            <span className="app-user" title={user.email || user.name}>
              <span className="app-user__name">{user.name}</span>
              <span className="app-user__avatar" aria-hidden="true">{initials(user.name)}</span>
            </span>
          )}
          <button type="button" className="btn-portal" onClick={goToPortal}>
            {t('app.nav.backToPortal')}
          </button>
        </div>
        <nav className="app-nav" aria-label={t('app.nav.aria')}>
          <ul className="app-nav__list">
            {NAV.filter((item) => !item.adminOnly || isAppAdmin).map((item) => (
              <li key={item.name}>
                <a
                  className="app-nav__link"
                  href={item.hash}
                  aria-current={current === item.name ? 'page' : undefined}
                >
                  {t(item.labelKey)}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className="app-main">{children}</main>
    </>
  );
}

/** Cabecera de página: título, subtítulo y acciones a la derecha. */
export function PageHead({ title, subtitle, actions }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="page-head__sub">{subtitle}</p>}
      </div>
      {actions && <div className="page-head__actions">{actions}</div>}
    </div>
  );
}
