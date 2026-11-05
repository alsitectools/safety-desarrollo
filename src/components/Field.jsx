import { cloneElement, isValidElement, useId } from 'react';
import { useI18n } from '../i18n/I18nProvider.jsx';

/**
 * Campo de formulario: etiqueta + control + ayuda/error.
 * El control hijo recibe id, aria-invalid y aria-describedby automáticamente.
 *   <Field label="Nombre" required error={errors.nombre}><input className="input" … /></Field>
 * Con `check` el control (checkbox) va antes de la etiqueta.
 */
export default function Field({ label, required, error, hint, check, className, children }) {
  const id = useId();
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  const control = isValidElement(children)
    ? cloneElement(children, {
      id: children.props.id || id,
      'aria-invalid': error ? 'true' : undefined,
      'aria-describedby': describedBy,
    })
    : children;
  const labelNode = (
    <label className="field__label" htmlFor={isValidElement(children) ? children.props.id || id : undefined}>
      {label}
      {required && <span className="req" aria-hidden="true">*</span>}
    </label>
  );
  return (
    <div className={`field${check ? ' field--check' : ''}${className ? ` ${className}` : ''}`}>
      {check ? (
        <>
          {control}
          {labelNode}
        </>
      ) : (
        <>
          {labelNode}
          {control}
        </>
      )}
      {error ? (
        <span className="field__error" id={`${id}-err`}>{error}</span>
      ) : hint ? (
        <span className="field__hint" id={`${id}-hint`}>{hint}</span>
      ) : null}
    </div>
  );
}

/** Select con opción vacía. options: [{ value, label }] */
export function Select({ value, onChange, options, placeholder, allowEmpty = true, ...rest }) {
  const { t } = useI18n();
  return (
    <select className="select" value={value ?? ''} onChange={(event) => onChange(event.target.value)} {...rest}>
      {allowEmpty && <option value="">{placeholder ?? t('common.all')}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

/**
 * Convierte { clave: 'Etiqueta' } en opciones para <Select>.
 * `translate(key, label)` opcional para traducir cada etiqueta, p. ej. (key) => labelOf(catalog, 'gama', key).
 */
export function optionsFromLabels(labels, order, translate) {
  const keys = order || Object.keys(labels || {});
  return keys.map((key) => {
    const label = (labels && labels[key]) || key;
    return { value: key, label: translate ? translate(key, label) : label };
  });
}
