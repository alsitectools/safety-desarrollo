// Formato según el idioma elegido (i18n/core.js) y utilidades puras de presentación (sin React ni DOM).
import { getIntlLocale, t } from '../i18n/core.js';

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})/;

const currencyFormatters = new Map();
const numberFormatters = new Map();

function currencyFormatter(currency, decimals) {
  const locale = getIntlLocale();
  const key = `${locale}|${currency}|${decimals}`;
  if (!currencyFormatters.has(key)) {
    let formatter;
    try {
      formatter = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        useGrouping: 'always',
      });
    } catch {
      formatter = null; // moneda desconocida → número + código
    }
    currencyFormatters.set(key, formatter);
  }
  return currencyFormatters.get(key);
}

function numberFormatter(decimals) {
  const locale = getIntlLocale();
  const key = `${locale}|${decimals}`;
  if (!numberFormatters.has(key)) {
    numberFormatters.set(key, new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping: 'always',
    }));
  }
  return numberFormatters.get(key);
}

export function isNum(value) {
  return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
}

/** 27500 → "27.500" · 1538.5 (2) → "1.538,50" · null → "—" */
export function formatNumber(value, decimals = 0, empty = '—') {
  if (!isNum(value)) return empty;
  return numberFormatter(decimals).format(Number(value));
}

/** 27500, 'EUR' → "27.500 €" (sin decimales salvo que se pidan) · null → "—" */
export function formatMoney(value, currency = 'EUR', { decimals = 0, empty = '—' } = {}) {
  if (!isNum(value)) return empty;
  const code = String(currency || 'EUR').toUpperCase();
  const formatter = currencyFormatter(code, decimals);
  if (!formatter) return `${formatNumber(value, decimals)} ${code}`;
  return formatter.format(Number(value));
}

/** Importe compacto para gráficos: 1250000 → "1,25 M€", 27500 → "27,5 k€" */
export function formatMoneyShort(value, currency = 'EUR') {
  if (!isNum(value)) return '—';
  const n = Number(value);
  const symbol = { EUR: '€', USD: '$', GBP: '£' }[String(currency).toUpperCase()] || ` ${currency}`;
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${formatNumber(n / 1e6, 2)} M${symbol}`;
  if (abs >= 1e4) return `${formatNumber(n / 1e3, 1)} k${symbol}`;
  return `${formatNumber(n, 0)} ${symbol}`.replace('  ', ' ');
}

const dateFormatters = new Map();

function dateFormatter(withTime) {
  const locale = getIntlLocale();
  const key = `${locale}|${withTime}`;
  if (!dateFormatters.has(key)) {
    dateFormatters.set(key, new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      ...(withTime ? { hour: '2-digit', minute: '2-digit', hour12: false } : { timeZone: 'UTC' }),
    }));
  }
  return dateFormatters.get(key);
}

/** '2026-10-29' → '29/10/2026' en español (en UTC: no hay desfase de zona horaria) */
export function formatDate(value, empty = '—') {
  if (!value) return empty;
  const match = String(value).match(DATE_RE);
  if (!match) return empty;
  return dateFormatter(false).format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))));
}

/** Marca de tiempo ISO → '29/10/2026 11:00' en hora local del navegador. */
export function formatDateTime(value, empty = '—') {
  if (!value) return empty;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return empty;
  return dateFormatter(true).format(date).replace(',', '');
}

function dayNumber(isoDate) {
  const match = String(isoDate || '').match(DATE_RE);
  if (!match) return null;
  return Math.round(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86400000);
}

/** Días de `from` a `to` (fechas YYYY-MM-DD). null si falta alguna. */
export function daysBetween(from, to) {
  const a = dayNumber(from);
  const b = dayNumber(to);
  if (a === null || b === null) return null;
  return b - a;
}

/** Texto relativo: 0 → "hoy", 1 → "mañana", 7 → "en 7 días", -3 → "hace 3 días" */
export function relativeDays(days) {
  if (days === null || days === undefined || !Number.isFinite(days)) return '';
  if (days === 0) return t('common.today');
  if (days === 1) return t('common.tomorrow');
  if (days === -1) return t('common.yesterday');
  return days > 0 ? t('common.inDays', { count: days }) : t('common.daysAgo', { count: -days });
}

/** Fecha local del navegador como 'YYYY-MM-DD'. */
export function todayIso(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** 'Juan Francisco Comes' → 'JC' · 'MEC India' → 'MI' · '' → '?' */
export function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Etiqueta de un enum del catálogo de /bootstrap: labelOf(catalog, 'prioridad', 'alta') → 'Alta' */
export function labelOf(catalog, enumName, value, empty = '—') {
  if (value === null || value === undefined || value === '') return empty;
  const labels = catalog && catalog.enumLabels && catalog.enumLabels[enumName];
  return t(`catalog.enum.${enumName}.${value}`, { defaultValue: (labels && labels[value]) || String(value) });
}

export function phaseLabelOf(catalog, fase, empty = '—') {
  if (!fase) return empty;
  return t(`catalog.phase.${fase}`, { defaultValue: (catalog && catalog.phaseLabels && catalog.phaseLabels[fase]) || fase });
}

/** { EUR: { previsto, real, ... }, USD: {...} } → [{ currency, previsto, real, desviacion, lineas }] (EUR primero) */
export function currencyRows(totals) {
  if (!totals || typeof totals !== 'object') return [];
  return Object.keys(totals)
    .sort((a, b) => (a === 'EUR' ? -1 : b === 'EUR' ? 1 : a.localeCompare(b)))
    .map((currency) => {
      const t = totals[currency] || {};
      const previsto = Number(t.previsto) || 0;
      const real = Number(t.real) || 0;
      return {
        currency,
        previsto,
        real,
        desviacion: isNum(t.desviacion) ? Number(t.desviacion) : real - previsto,
        lineas: Number(t.lineas) || 0,
      };
    });
}

/** Texto corto de totales por moneda: "27.500 € · 12.000 US$" (solo previsto) */
export function formatTotalsShort(totals, key = 'previsto') {
  const rows = currencyRows(totals).filter((row) => row[key]);
  if (!rows.length) return '—';
  return rows.map((row) => formatMoney(row[key], row.currency)).join(' · ');
}

/** Bytes legibles: 120334 → "117,5 KB" */
export function formatBytes(bytes) {
  if (!isNum(bytes)) return '—';
  const n = Number(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${formatNumber(n / 1024, 1)} KB`;
  return `${formatNumber(n / (1024 * 1024), 1)} MB`;
}
