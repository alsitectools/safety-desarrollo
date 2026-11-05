import { useI18n } from '../i18n/I18nProvider.jsx';

/** Indicador de carga. */
export function Loading({ label }) {
  const { t } = useI18n();
  return (
    <div className="state" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <span>{label || t('common.loading')}</span>
    </div>
  );
}

/**
 * Caja de error. Acepta un Error del cliente de la API (message, code, fields) o un texto.
 * Con `fieldLabels` traduce las claves de `fields` ({ nombre: 'Nombre' }).
 */
export function ErrorBox({ error, title, onRetry, fieldLabels }) {
  const { t } = useI18n();
  if (!error) return null;
  const message = typeof error === 'string' ? error : error.message || t('app.error.generic');
  const fields = typeof error === 'object' && error.fields ? Object.entries(error.fields) : [];
  const heading = title || (error.code === 'schema_missing' ? t('app.error.schemaMissing') : t('app.error.title'));
  return (
    <div className="error-box" role="alert">
      <span aria-hidden="true">⚠️</span>
      <div className="error-box__body">
        <div className="error-box__title">{heading}</div>
        <div>{message}</div>
        {fields.length > 0 && (
          <ul>
            {fields.map(([key, text]) => (
              <li key={key}>
                <strong>{t('app.error.fieldLine', { field: (fieldLabels && fieldLabels[key]) || key })}</strong> {String(text)}
              </li>
            ))}
          </ul>
        )}
      </div>
      {onRetry && (
        <button type="button" className="btn btn--sm" onClick={onRetry}>
          {t('common.retry')}
        </button>
      )}
    </div>
  );
}

/** Estado vacío con icono, título, texto y acción opcional. */
export function EmptyState({ icon = '📭', title, children, action }) {
  const { t } = useI18n();
  return (
    <div className="state">
      <div className="state__icon" aria-hidden="true">{icon}</div>
      <div className="state__title">{title || t('common.empty')}</div>
      {children && <div>{children}</div>}
      {action}
    </div>
  );
}
