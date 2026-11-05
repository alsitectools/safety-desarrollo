// Formato y etiquetas para la ficha de proyecto (puro, sin React ni DOM). Sigue el idioma activo (i18n/core.js).
import { getIntlLocale, t } from '../../../i18n/core.js';
import { labelOf, phaseLabelOf } from '../../../lib/format.js';

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})/;

export function formatDate(value) {
  if (!value) return '—';
  const match = DATE_RE.exec(String(value));
  if (!match) return String(value);
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.toLocaleDateString(getIntlLocale(), { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
}

export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(getIntlLocale(), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatNumber(value, decimals = 2) {
  if (value === null || value === undefined || value === '') return '—';
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value);
  return num.toLocaleString(getIntlLocale(), { minimumFractionDigits: 0, maximumFractionDigits: decimals, useGrouping: 'always' });
}

export function formatMoney(value, currency = 'EUR') {
  if (value === null || value === undefined || value === '') return '—';
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value);
  const amount = num.toLocaleString(getIntlLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always' });
  return `${amount} ${currency || 'EUR'}`;
}

export function formatBytes(size) {
  const num = Number(size);
  if (!Number.isFinite(num) || num <= 0) return '';
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${formatNumber(num / 1024, 0)} KB`;
  return `${formatNumber(num / (1024 * 1024), 1)} MB`;
}

// Etiqueta traducida de un valor de enum (respaldo: catalog.enumLabels del bootstrap).
export function enumLabel(catalog, enumName, value) {
  return labelOf(catalog, enumName, value);
}

export function phaseLabel(catalog, fase) {
  return phaseLabelOf(catalog, fase);
}

export function caminoLabel(catalog, camino) {
  if (!camino) return '—';
  return t(`catalog.camino.${camino}`, { defaultValue: catalog?.caminoLabels?.[camino] || camino });
}

export function personName(people, id) {
  if (id === null || id === undefined || id === '') return '—';
  const person = (people || []).find((item) => Number(item.id) === Number(id));
  return person ? person.nombre : '—';
}

export function supplierName(suppliers, id) {
  if (id === null || id === undefined || id === '') return '—';
  const supplier = (suppliers || []).find((item) => Number(item.id) === Number(id));
  return supplier ? supplier.nombre : '—';
}

export function initials(name) {
  return String(name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

// Convierte el texto de un input numérico en número o null ('' → null, coma decimal admitida).
export function parseNumberInput(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim().replace(',', '.');
  if (text === '') return null;
  const num = Number(text);
  return Number.isFinite(num) ? num : NaN;
}

// Opciones { value, label } de un enum del catálogo, en el orden de catalog.enums.
export function enumOptions(catalog, enumName) {
  const values = catalog?.enums?.[enumName] || [];
  return values.map((value) => ({ value, label: enumLabel(catalog, enumName, value) }));
}

// Une la URL base del Especialista con el ancla de la familia ('#eps').
export function especialistaLink(baseUrl, anchor) {
  if (!baseUrl) return '';
  const base = String(baseUrl).replace(/#.*$/, '');
  if (!anchor) return base;
  return `${base}${anchor.startsWith('#') ? anchor : `#${anchor}`}`;
}

export function isSafeHttpUrl(value) {
  try {
    const url = new URL(String(value));
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
