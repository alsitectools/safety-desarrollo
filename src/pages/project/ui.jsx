// Piezas de interfaz propias de la ficha de proyecto (modal, formulario genérico, insignias).
import { useEffect, useRef, useState } from 'react';
import { t as translate } from '../../i18n/core.js';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { parseNumberInput } from './lib/format.js';

export function Modal({ title, onClose, children, wide = false }) {
  const { t } = useI18n();
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  // Solo al abrir: foco en el primer campo y Escape para cerrar (onClose cambia en cada render).
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') closeRef.current?.();
    };
    document.addEventListener('keydown', onKey);
    ref.current?.querySelector('.pd-modal__body input, .pd-modal__body select, .pd-modal__body textarea')?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  return (
    <div className="pd-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <div className={`pd-modal${wide ? ' pd-modal--wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <div className="pd-modal__head">
          <h3>{title}</h3>
          <button type="button" className="pd-icon-btn" onClick={onClose} aria-label={t('common.close')}>
            ×
          </button>
        </div>
        <div className="pd-modal__body">{children}</div>
      </div>
    </div>
  );
}

export function FieldRow({ label, error, required, help, full, children }) {
  return (
    <label className={`pd-field${full ? ' pd-field--full' : ''}${error ? ' pd-field--error' : ''}`}>
      <span className="pd-field__label">
        {label}
        {required ? <span className="pd-req"> *</span> : null}
      </span>
      {children}
      {help ? <span className="pd-field__help">{help}</span> : null}
      {error ? <span className="pd-field__error">{error}</span> : null}
    </label>
  );
}

// Mensaje de error de una petición (Error de api/client.js).
export function ErrorMessage({ error }) {
  const { t } = useI18n();
  if (!error) return null;
  const text = typeof error === 'string' ? error : error.message || t('project.ui.genericError');
  return (
    <div className="pd-error" role="alert">
      {text}
    </div>
  );
}

export function Badge({ tone = 'neutral', children, title }) {
  return (
    <span className={`pd-badge pd-badge--${tone}`} title={title}>
      {children}
    </span>
  );
}

export function Empty({ children, action }) {
  return (
    <div className="pd-empty">
      <p>{children}</p>
      {action}
    </div>
  );
}

export function SectionHead({ title, children }) {
  return (
    <div className="pd-section-head">
      <h3>{title}</h3>
      <div className="pd-section-head__actions">{children}</div>
    </div>
  );
}

// Botón de borrado con confirmación nativa; muestra el error con alert si falla.
export function DeleteButton({ onDelete, confirmText, label, small = true }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const click = async () => {
    if (!window.confirm(confirmText || t('common.confirmDelete'))) return;
    setBusy(true);
    try {
      await onDelete();
    } catch (error) {
      window.alert(error?.message || t('project.ui.deleteFailed'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <button type="button" className={`pd-btn pd-btn--danger${small ? ' pd-btn--sm' : ''}`} onClick={click} disabled={busy}>
      {busy ? t('project.ui.deleting') : label || t('common.delete')}
    </button>
  );
}

function initialValue(field, initial) {
  const value = initial?.[field.name];
  if (field.type === 'checkbox') return value === true;
  if (value === null || value === undefined) return field.default ?? '';
  return String(value);
}

// Convierte los valores del formulario a la forma de la API.
export function formValuesToPayload(fields, values) {
  const payload = {};
  const errors = {};
  for (const field of fields) {
    if (field.readOnly) continue;
    const raw = values[field.name];
    if (field.type === 'checkbox') {
      payload[field.name] = raw === true;
      continue;
    }
    if (field.type === 'number') {
      const num = parseNumberInput(raw);
      if (Number.isNaN(num)) errors[field.name] = translate('project.form.mustBeNumber', { label: field.label });
      else if (field.required && num === null) errors[field.name] = translate('project.form.isRequired', { label: field.label });
      else payload[field.name] = num;
      continue;
    }
    if (field.type === 'id') {
      payload[field.name] = raw === '' || raw === null || raw === undefined ? null : Number(raw);
      continue;
    }
    const text = raw === null || raw === undefined ? '' : String(raw).trim();
    if (field.required && !text) {
      errors[field.name] = translate('project.form.isRequired', { label: field.label });
      continue;
    }
    if (field.type === 'url' && text && !/^https?:\/\//i.test(text)) {
      errors[field.name] = translate('project.form.invalidUrl');
      continue;
    }
    if (field.type === 'currency') {
      if (text && !/^[A-Za-z]{3}$/.test(text)) errors[field.name] = translate('project.form.invalidCurrency');
      else payload[field.name] = (text || 'EUR').toUpperCase();
      continue;
    }
    payload[field.name] = text === '' ? (field.emptyAs !== undefined ? field.emptyAs : null) : text;
  }
  return { payload, errors };
}

/**
 * Formulario genérico en modal.
 * fields: [{ name, label, type: text|textarea|number|date|url|select|id|checkbox|currency, options: [{value,label}],
 *            required, help, full, placeholder, emptyAs, readOnly }]
 * onSubmit(payload) → Promise; los errores { fields } del servidor se pintan en su campo.
 */
export function FormModal({ title, fields, initial, onSubmit, onClose, submitLabel, wide = false, children }) {
  const { t } = useI18n();
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((field) => [field.name, initialValue(field, initial)])));
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (name, value) => setValues((prev) => ({ ...prev, [name]: value }));

  const submit = async (event) => {
    event.preventDefault();
    const { payload, errors: localErrors } = formValuesToPayload(fields, values);
    setErrors(localErrors);
    if (Object.keys(localErrors).length) {
      setError(t('project.ui.checkFields'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit(payload, values);
      onClose();
    } catch (err) {
      setErrors(err?.fields || {});
      setError(err);
      setSaving(false);
    }
  };

  return (
    <Modal title={title} onClose={onClose} wide={wide}>
      <form className="pd-form" onSubmit={submit} noValidate>
        <div className="pd-form__grid">
          {fields.map((field) => (
            <FieldRow
              key={field.name}
              label={field.label}
              required={field.required}
              help={field.help}
              error={errors[field.name]}
              full={field.full || field.type === 'textarea'}
            >
              <FieldInput field={field} value={values[field.name]} onChange={(value) => set(field.name, value)} />
            </FieldRow>
          ))}
        </div>
        {children ? children(values, set) : null}
        <ErrorMessage error={error} />
        <div className="pd-form__actions">
          <button type="button" className="pd-btn" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="pd-btn pd-btn--primary" disabled={saving}>
            {saving ? t('common.saving') : submitLabel || t('common.save')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function FieldInput({ field, value, onChange }) {
  const { t } = useI18n();
  const common = {
    value: value ?? '',
    onChange: (event) => onChange(event.target.value),
    placeholder: field.placeholder,
    disabled: field.readOnly,
    required: field.required,
  };
  switch (field.type) {
    case 'textarea':
      return <textarea rows={field.rows || 3} {...common} />;
    case 'number':
      return <input type="text" inputMode="decimal" {...common} />;
    case 'date':
      return <input type="date" {...common} />;
    case 'url':
      return <input type="url" {...common} />;
    case 'currency':
      return <input type="text" maxLength={3} className="pd-input--short" {...common} />;
    case 'checkbox':
      return (
        <input
          type="checkbox"
          checked={value === true}
          onChange={(event) => onChange(event.target.checked)}
          disabled={field.readOnly}
        />
      );
    case 'select':
    case 'id':
      return (
        <select {...common}>
          {field.required && field.type === 'select' && value !== '' && value !== null && value !== undefined ? null : (
            <option value="" disabled={Boolean(field.required)}>
              {field.required ? t('project.ui.selectPlaceholder') : field.emptyLabel || '—'}
            </option>
          )}
          {(field.options || []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    default:
      return <input type="text" {...common} />;
  }
}

// Envuelve una acción asíncrona: { busy, error, run(fn) }.
export function useRunner() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const run = async (fn) => {
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (err) {
      setError(err);
      return undefined;
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, setError, run };
}

// Enlace externo seguro (solo http/https).
export function ExternalLink({ href, children }) {
  if (!href || !/^https?:\/\//i.test(String(href))) return <span>{children || href || '—'}</span>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children || href}
    </a>
  );
}
