// Comparativa lado a lado de fabricantes candidatos de un proyecto (puro; etiquetas en el idioma activo).
import { t } from '../../../i18n/core.js';
import { fieldLabel } from '../../../i18n/labels.js';
// Entrada: relaciones proyecto-fabricante (con lastQuote), productos del proyecto y campos técnicos de la familia.

const EXCLUDED_STATES = new Set(['descartado']);
const EXCLUDED_ROLES = new Set(['laboratorio', 'referencia']);

// Candidatos por defecto: no descartados y que fabrican/suministran (no laboratorios ni referencias).
export function defaultCandidates(projectSuppliers, { includeDiscarded = false } = {}) {
  return (projectSuppliers || []).filter(
    (ps) => !EXCLUDED_ROLES.has(ps.rol) && (includeDiscarded || !EXCLUDED_STATES.has(ps.estado)),
  );
}

function hasValue(value) {
  return value !== null && value !== undefined && value !== '';
}

// Construye la tabla: { columns: [{ id, nombre, pais, rol, estado, productNombre }], rows: [{ key, label, unit, group, values: [..], best }] }.
// best = índice de la columna con el menor importe entre las de la moneda más frecuente (solo fila 'importe'), o null.
// familyCode (opcional) traduce las etiquetas de los campos; si no, se usa field.familyCode.
export function buildComparison({ projectSuppliers, products, fields, familyCode }) {
  const candidates = projectSuppliers || [];
  const productById = new Map((products || []).map((product) => [Number(product.id), product]));
  const columns = candidates.map((ps) => {
    const product = ps.productId ? productById.get(Number(ps.productId)) : null;
    return {
      id: ps.id,
      supplierId: ps.supplierId,
      nombre: ps.supplierNombre || t('project.compare.supplierFallback', { id: ps.supplierId }),
      pais: ps.supplierPais || '',
      rol: ps.rol,
      estado: ps.estado,
      product: product || null,
      quote: ps.lastQuote || null,
    };
  });

  const rows = [];
  const push = (row) => rows.push(row);

  push({ key: 'producto', label: t('project.compare.product'), group: 'general', values: columns.map((col) => col.product?.nombre || '') });

  // Especificaciones: campos de la familia en su orden y luego claves libres presentes en algún producto.
  const fieldList = [...(fields || [])].sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0));
  const known = new Set(fieldList.map((field) => field.key));
  for (const field of fieldList) {
    const values = columns.map((col) => (col.product?.specs ? col.product.specs[field.key] : undefined));
    if (!values.some(hasValue)) continue;
    push({ key: `spec.${field.key}`, label: fieldLabel(familyCode || field.familyCode, field), unit: field.unit || '', type: field.type, group: 'specs', values });
  }
  const extraKeys = [];
  for (const col of columns) {
    for (const key of Object.keys(col.product?.specs || {})) {
      if (!known.has(key) && !extraKeys.includes(key)) extraKeys.push(key);
    }
  }
  for (const key of extraKeys) {
    const values = columns.map((col) => col.product?.specs?.[key]);
    if (!values.some(hasValue)) continue;
    push({ key: `spec.${key}`, label: key, unit: '', group: 'specs', values });
  }
  const pesos = columns.map((col) => col.product?.pesoKg);
  if (pesos.some(hasValue)) push({ key: 'pesoKg', label: t('project.compare.weight'), unit: 'kg', type: 'number', group: 'specs', values: pesos });
  const ucam = columns.map((col) => col.product?.udsPorCamion);
  if (ucam.some(hasValue)) push({ key: 'udsPorCamion', label: t('project.compare.unitsPerTruck'), type: 'number', group: 'specs', values: ucam });

  // Última oferta.
  const quoteRow = (key, label, pickValue, extra = {}) =>
    push({ key, label, group: 'oferta', values: columns.map((col) => (col.quote ? pickValue(col.quote) : null)), ...extra });
  quoteRow('importe', t('project.compare.lastQuoteAmount'), (quote) => quote.importe, { type: 'money' });
  quoteRow('moneda', t('project.compare.currency'), (quote) => quote.moneda);
  quoteRow('incoterm', t('project.compare.incoterm'), (quote) => quote.incoterm);
  quoteRow('plazo', t('project.compare.leadTime'), (quote) => quote.plazoTexto);
  quoteRow('fecha', t('project.compare.quoteDate'), (quote) => quote.fecha, { type: 'date' });
  quoteRow('validez', t('project.compare.validity'), (quote) => quote.validez, { type: 'date' });
  quoteRow('referencia', t('project.compare.reference'), (quote) => quote.referencia);

  const importeRow = rows.find((row) => row.key === 'importe');
  importeRow.best = cheapestIndex(columns);
  importeRow.currencies = columns.map((col) => col.quote?.moneda || '');

  return { columns, rows };
}

// Índice de la oferta más barata dentro de la moneda con más ofertas (no se convierten divisas). null si < 2 comparables.
export function cheapestIndex(columns) {
  const byCurrency = {};
  columns.forEach((col, index) => {
    const importe = col.quote ? Number(col.quote.importe) : NaN;
    if (!col.quote || col.quote.importe === null || !Number.isFinite(importe)) return;
    const moneda = col.quote.moneda || 'EUR';
    (byCurrency[moneda] ||= []).push({ index, importe });
  });
  const groups = Object.values(byCurrency).sort((a, b) => b.length - a.length);
  if (!groups.length || groups[0].length < 2) return null;
  return groups[0].reduce((best, item) => (item.importe < best.importe ? item : best)).index;
}
