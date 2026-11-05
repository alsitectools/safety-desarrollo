import { useState } from 'react';
import Modal from '../components/Modal.jsx';
import Field, { Select } from '../components/Field.jsx';
import { ErrorBox } from '../components/States.jsx';
import { useI18n } from '../i18n/I18nProvider.jsx';

/**
 * Formulario en modal a partir de una especificación de campos.
 * specs: [{ key, label, type: text|email|url|number|select|bool|textarea|list, options, required, hint, span, placeholder, readOnly }]
 *   - list: texto separado por comas ↔ array de strings (null si vacío)
 * onSubmit(body) → Promise; si lanza un Error con `fields`, se marcan los campos.
 */
export default function FormModal({ title, specs, initial = {}, submitLabel, onSubmit, onClose }) {
  const { t } = useI18n();
  const [form, setForm] = useState(() => {
    const next = {};
    specs.forEach((spec) => {
      const value = initial[spec.key];
      if (spec.type === 'bool') next[spec.key] = value === undefined ? Boolean(spec.default) : Boolean(value);
      else if (spec.type === 'list') next[spec.key] = Array.isArray(value) ? value.join(', ') : '';
      else next[spec.key] = value === null || value === undefined ? (spec.default ?? '') : String(value);
    });
    return next;
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const labels = Object.fromEntries(specs.map((spec) => [spec.key, spec.label]));
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  async function submit(event) {
    event.preventDefault();
    const local = {};
    const body = {};
    specs.forEach((spec) => {
      if (spec.readOnly) return;
      const raw = form[spec.key];
      if (spec.type === 'bool') {
        body[spec.key] = Boolean(raw);
        return;
      }
      const text = String(raw ?? '').trim();
      if (spec.required && !text) local[spec.key] = t('form.errors.required');
      if (spec.type === 'number') {
        if (text && !Number.isFinite(Number(text.replace(',', '.')))) local[spec.key] = t('form.errors.number');
        body[spec.key] = text ? Number(text.replace(',', '.')) : null;
      } else if (spec.type === 'list') {
        const items = text.split(',').map((s) => s.trim()).filter(Boolean);
        body[spec.key] = items.length ? items : null;
      } else if (spec.type === 'email' && text && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
        local[spec.key] = t('form.errors.email');
        body[spec.key] = text;
      } else {
        body[spec.key] = spec.nullIfEmpty && !text ? null : text;
      }
    });
    setErrors(local);
    if (Object.keys(local).length) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit(body);
    } catch (err) {
      setError(err);
      if (err.fields) setErrors(err.fields);
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      title={title}
      onClose={saving ? undefined : onClose}
      footer={(
        <>
          <button type="button" className="btn" onClick={onClose} disabled={saving}>{t('common.cancel')}</button>
          <button type="submit" form="form-modal" className="btn btn--primary" disabled={saving}>
            {saving ? t('common.saving') : (submitLabel || t('common.save'))}
          </button>
        </>
      )}
    >
      <form id="form-modal" onSubmit={submit} noValidate className="stack">
        {error && <ErrorBox error={error} fieldLabels={labels} />}
        <div className="form-grid">
          {specs.map((spec) => {
            const common = { error: errors[spec.key], hint: spec.hint, required: spec.required, label: spec.label };
            const className = spec.span ? 'span-all' : undefined;
            if (spec.type === 'bool') {
              return (
                <Field key={spec.key} {...common} check className={className}>
                  <input type="checkbox" checked={form[spec.key]} onChange={(e) => set(spec.key, e.target.checked)} />
                </Field>
              );
            }
            if (spec.type === 'select') {
              return (
                <Field key={spec.key} {...common} className={className}>
                  <Select
                    value={form[spec.key]}
                    onChange={(value) => set(spec.key, value)}
                    options={spec.options || []}
                    allowEmpty={!spec.required}
                    placeholder={spec.placeholder || '—'}
                    disabled={spec.readOnly}
                  />
                </Field>
              );
            }
            if (spec.type === 'textarea') {
              return (
                <Field key={spec.key} {...common} className={className || 'span-all'}>
                  <textarea className="textarea" value={form[spec.key]} onChange={(e) => set(spec.key, e.target.value)} />
                </Field>
              );
            }
            return (
              <Field key={spec.key} {...common} className={className}>
                <input
                  className="input"
                  type={spec.type === 'number' ? 'text' : spec.type === 'list' ? 'text' : spec.type || 'text'}
                  inputMode={spec.type === 'number' ? 'decimal' : undefined}
                  value={form[spec.key]}
                  placeholder={spec.placeholder}
                  readOnly={spec.readOnly}
                  onChange={(e) => set(spec.key, e.target.value)}
                />
              </Field>
            );
          })}
        </div>
      </form>
    </Modal>
  );
}
