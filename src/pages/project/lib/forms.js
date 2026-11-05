// Conversión formulario ↔ payload de la API para la ficha (puro). Los formularios guardan texto; la API espera tipos.

import { t } from '../../../i18n/core.js';
import { fieldLabel } from '../../../i18n/labels.js';
import { parseNumberInput } from './format.js';

const OPEN_ACTION_STATES = ['pendiente', 'enviado'];

export function isActionOpen(action) {
  return OPEN_ACTION_STATES.includes(action?.estado);
}

// Filtro de la pestaña Acciones: { soloAbiertas, ownerId, fase }.
export function filterActions(actions, { soloAbiertas = false, ownerId = '', fase = '' } = {}) {
  return (actions || []).filter((action) => {
    if (soloAbiertas && !isActionOpen(action)) return false;
    if (ownerId !== '' && ownerId !== null && Number(action.ownerId) !== Number(ownerId)) return false;
    if (fase === '__none__') return !action.fase;
    if (fase && action.fase !== fase) return false;
    return true;
  });
}

// specs (objeto de la API) → valores de formulario (texto/booleano) para los campos de la familia.
export function specsToForm(fields, specs) {
  const out = {};
  for (const field of fields || []) {
    const value = specs ? specs[field.key] : undefined;
    if (field.type === 'bool') out[field.key] = value === true;
    else out[field.key] = value === null || value === undefined ? '' : String(value);
  }
  return out;
}

// Claves libres de specs (no definidas en la familia) → lista [{ key, value }] editable.
export function extraSpecsToList(fields, specs) {
  const known = new Set((fields || []).map((field) => field.key));
  return Object.entries(specs || {})
    .filter(([key]) => !known.has(key))
    .map(([key, value]) => ({ key, value: value === null || value === undefined ? '' : String(value) }));
}

// Valores del formulario → specs para la API. Los campos calculados no se envían (los recalcula el servidor).
// Devuelve { specs, errors } con errors { 'specs.<key>': mensaje }.
export function formToSpecs(fields, form, extras = []) {
  const specs = {};
  const errors = {};
  for (const field of fields || []) {
    if (field.calculado) continue;
    const raw = form?.[field.key];
    if (field.type === 'bool') {
      specs[field.key] = raw === true;
    } else if (field.type === 'number') {
      const num = parseNumberInput(raw);
      if (Number.isNaN(num)) errors[`specs.${field.key}`] = t('project.form.mustBeNumber', { label: fieldLabel(field.familyCode, field) });
      else specs[field.key] = num;
    } else {
      const text = raw === undefined || raw === null ? '' : String(raw).trim();
      specs[field.key] = text === '' ? null : text;
    }
  }
  for (const extra of extras || []) {
    const key = String(extra?.key || '').trim();
    if (!key) continue;
    const text = String(extra.value ?? '').trim();
    specs[key] = text === '' ? null : text;
  }
  return { specs, errors };
}

// Piezas de transporte del formulario [{ nombre, pesoKg (texto), dims }] → API. Ignora filas vacías.
export function formToPiezas(rows) {
  const piezas = [];
  const errors = {};
  (rows || []).forEach((row, index) => {
    const nombre = String(row?.nombre || '').trim();
    const dims = String(row?.dims || '').trim();
    const peso = parseNumberInput(row?.pesoKg);
    if (!nombre && !dims && peso === null) return;
    if (!nombre) errors[`piezasTransporte.${index}`] = t('project.form.pieceNameRequired');
    if (Number.isNaN(peso)) errors[`piezasTransporte.${index}`] = t('project.form.pieceWeightNumber');
    piezas.push({ nombre, pesoKg: Number.isNaN(peso) ? null : peso, dims });
  });
  return { piezas, errors };
}

// Convierte campos numéricos de un formulario: { campo: texto } → { campo: número|null } y errores en el idioma activo (labels ya traducidos por quien llama).
export function numericFields(form, keys, labels = {}) {
  const values = {};
  const errors = {};
  for (const key of keys) {
    const num = parseNumberInput(form?.[key]);
    if (Number.isNaN(num)) errors[key] = t('project.form.mustBeNumber', { label: labels[key] || key });
    else values[key] = num;
  }
  return { values, errors };
}

// '' → null para campos opcionales de texto/fecha/id.
export function emptyToNull(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  return value;
}

export function idOrNull(value) {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  return Number.isInteger(num) && num > 0 ? num : null;
}
