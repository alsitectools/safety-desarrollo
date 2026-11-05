// Nombres traducidos de las listas fijas del backend (por código), con el texto del backend como respaldo.
// En español manda siempre el texto del backend: así se ve lo que el admin haya renombrado en Configuración.
import { getLang, t } from './core.js';
import esCatalog from './es/catalog.js';

/** familia: objeto { code, nombre } o código */
export function familyName(family) {
  if (!family) return '—';
  const code = typeof family === 'string' ? family : family.code;
  const fallback = typeof family === 'string' ? family : family.nombre || family.code;
  if (getLang() === 'es' && typeof family !== 'string' && family.nombre) return family.nombre;
  return t(`catalog.family.${code}`, { defaultValue: fallback });
}

/** campo técnico de una familia: fieldLabel('borde', { key, label }) */
export function fieldLabel(familyCode, field) {
  if (!field) return '';
  if (getLang() === 'es' && field.label) return field.label;
  return t(`catalog.field.${familyCode || field.familyCode}.${field.key}`, { defaultValue: field.label || field.key });
}

export function caminoLabel(camino, empty = '—') {
  if (!camino) return empty;
  return t(`catalog.camino.${camino}`, { defaultValue: camino });
}

const deliverableKeyByText = new Map(
  Object.entries(esCatalog.deliverable).map(([key, text]) => [text.trim().toLowerCase(), key]),
);

/** Entregable de checklist: si coincide con una plantilla estándar se traduce; si lo escribió alguien, tal cual. */
export function deliverableText(text) {
  const key = deliverableKeyByText.get(String(text || '').trim().toLowerCase());
  return key ? t(`catalog.deliverable.${key}`, { defaultValue: text }) : text;
}

/** Mensaje de un error de la API (err.code = body.error). En español se respeta el texto del servidor, más preciso. */
export function apiErrorMessage(error) {
  if (!error) return '';
  const reason = error.body && error.body.reason;
  if (getLang() === 'es' && error.body && error.body.message) return error.body.message;
  if (reason && t(`catalog.errors.${reason}`, { defaultValue: '' })) return t(`catalog.errors.${reason}`);
  if (error.code && t(`catalog.errors.${error.code}`, { defaultValue: '' })) return t(`catalog.errors.${error.code}`);
  return error.message || t('catalog.errors.generic', { status: error.status ?? '' });
}

/** Mensaje de validación de un campo (err.fields[x]): el servidor lo da en español. */
export function fieldErrorMessage(message) {
  if (!message) return message;
  return getLang() === 'es' ? message : t('catalog.errors.fieldInvalid');
}
