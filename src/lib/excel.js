// Construcción de las hojas del Excel a partir de GET /export (puro: no importa write-excel-file).
// toWorkbookSheets() devuelve el formato multihoja de write-excel-file v4:
//   [{ sheet, data: [[cell, ...], ...], columns: [{ width }], stickyRowsCount }]
// Hojas y cabeceras salen en el idioma activo (área `excel`). El backend manda las etiquetas ya resueltas en español:
// las columnas con `catalog` se traducen buscando ese texto en el catálogo español; si no coincide, se deja tal cual.
import { t } from '../i18n/core.js';
import esCatalog from '../i18n/es/catalog.js';

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const MONEY = '#,##0.00';
const INT = '0';
const DEC = '#,##0.##';

/** Hoja con nombre traducido al leer `name`. */
function sheet(id, source, columns) {
  return {
    id,
    source,
    get name() {
      return t(`excel.sheets.${id}`);
    },
    columns,
  };
}

/**
 * Definición de columnas por hoja: [headerKey, key, kind, width, catalog?].
 * headerKey = clave dentro de excel.columns · kind: text | int | dec | money | date | bool | signal
 * catalog = ruta en el catálogo (p. ej. 'phase', 'enum.prioridad') para traducir el texto español del backend.
 */
export const SHEETS = [
  sheet('projects', 'proyectos', [
    ['id', 'id', 'int', 6],
    ['code', 'codigo', 'text', 10],
    ['project', 'nombre', 'text', 42],
    ['family', 'familia', 'text', 28, 'family'],
    ['camino', 'camino', 'text', 18, 'camino'],
    ['phase', 'fase', 'text', 26, 'phase'],
    ['status', 'estado', 'text', 12, 'enum.projectEstado'],
    ['priority', 'prioridad', 'text', 10, 'enum.prioridad'],
    ['range', 'gama', 'text', 12, 'enum.gama'],
    ['modality', 'modalidad', 'text', 16, 'enum.modalidad'],
    ['design', 'diseno', 'text', 20],
    ['sourcing', 'busqueda', 'text', 20],
    ['homologation', 'homologacion', 'text', 20],
    ['designCenter', 'centroDiseno', 'text', 16],
    ['markets', 'mercados', 'text', 22],
    ['targetDate', 'fechaObjetivo', 'date', 13],
    ['signal', 'semaforo', 'signal', 14],
    ['openActions', 'accionesAbiertas', 'int', 10],
    ['overdueActions', 'accionesVencidas', 'int', 10],
    ['deliverablesDone', 'entregablesHechos', 'int', 10],
    ['deliverablesTotal', 'entregablesTotal', 'int', 10],
    ['budget', 'presupuesto', 'text', 40],
    ['sharepoint', 'sharepointUrl', 'text', 40],
  ]),
  sheet('actions', 'acciones', [
    ['id', 'id', 'int', 6],
    ['project', 'proyecto', 'text', 36],
    ['phase', 'fase', 'text', 20, 'phase'],
    ['action', 'texto', 'text', 60],
    ['owner', 'responsable', 'text', 22],
    ['dueDate', 'fechaLimite', 'date', 13],
    ['status', 'estado', 'text', 12, 'enum.actionEstado'],
    ['overdue', 'vencida', 'bool', 9],
    ['origin', 'origen', 'text', 20],
  ]),
  sheet('budget', 'presupuesto', [
    ['id', 'id', 'int', 6],
    ['project', 'proyecto', 'text', 36],
    ['type', 'tipo', 'text', 16, 'enum.budgetTipo'],
    ['concept', 'concepto', 'text', 40],
    ['supplier', 'fabricante', 'text', 22],
    ['units', 'unidades', 'dec', 10],
    ['unitPrice', 'precioUnitario', 'money', 14],
    ['freight', 'porte', 'money', 12],
    ['currency', 'moneda', 'text', 8],
    ['planned', 'previsto', 'money', 14],
    ['actual', 'real', 'money', 14],
    ['deviation', 'desviacion', 'money', 14],
    ['status', 'estado', 'text', 14, 'enum.budgetEstado'],
  ]),
  sheet('suppliers', 'fabricantes', [
    ['id', 'id', 'int', 6],
    ['project', 'proyecto', 'text', 36],
    ['supplier', 'fabricante', 'text', 26],
    ['country', 'pais', 'text', 14],
    ['region', 'region', 'text', 14],
    ['type', 'tipoFabricante', 'text', 18, 'enum.supplierTipo'],
    ['role', 'rol', 'text', 20, 'enum.psRol'],
    ['status', 'estado', 'text', 14, 'enum.psEstado'],
    ['lastQuoteRef', 'ultimaOfertaRef', 'text', 24],
    ['quoteDate', 'ultimaOfertaFecha', 'date', 13],
    ['quoteAmount', 'ultimaOfertaImporte', 'money', 14],
    ['currency', 'ultimaOfertaMoneda', 'text', 8],
    ['incoterm', 'ultimaOfertaIncoterm', 'text', 10],
    ['validity', 'ultimaOfertaValidez', 'date', 13],
  ]),
  sheet('certifications', 'certificaciones', [
    ['id', 'id', 'int', 6],
    ['project', 'proyecto', 'text', 36],
    ['product', 'producto', 'text', 26],
    ['standard', 'norma', 'text', 18],
    ['class', 'clase', 'text', 8],
    ['laboratory', 'laboratorio', 'text', 22],
    ['status', 'estado', 'text', 14, 'enum.certEstado'],
    ['reportDate', 'fechaInforme', 'date', 13],
  ]),
];

const reverseMaps = new Map();

/** Texto español del backend → texto en el idioma activo, buscando en catalog.<path>. Sin coincidencia → igual. */
export function translateCatalogText(path, text) {
  if (!path || text === null || text === undefined || text === '') return text;
  if (!reverseMaps.has(path)) {
    const node = path.split('.').reduce((obj, part) => (obj && typeof obj === 'object' ? obj[part] : undefined), esCatalog) || {};
    reverseMaps.set(path, new Map(Object.entries(node).map(([code, label]) => [String(label).trim().toLowerCase(), code])));
  }
  const code = reverseMaps.get(path).get(String(text).trim().toLowerCase());
  return code ? t(`catalog.${path}.${code}`, { defaultValue: String(text) }) : text;
}

/** 'YYYY-MM-DD' → Date en UTC (lo que espera write-excel-file) o null. */
export function excelDate(value) {
  if (!value) return null;
  const match = String(value).match(DATE_RE);
  if (!match) return null;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Celda de write-excel-file para un valor según el tipo de columna. null → celda vacía. */
export function toCell(value, kind) {
  switch (kind) {
    case 'int':
    case 'dec':
    case 'money': {
      const n = numberOrNull(value);
      if (n === null) return null;
      return { value: n, type: Number, format: kind === 'money' ? MONEY : kind === 'int' ? INT : DEC };
    }
    case 'date': {
      const date = excelDate(value);
      return date ? { value: date, type: Date, format: 'dd/mm/yyyy' } : null;
    }
    case 'bool':
      if (value === null || value === undefined || value === '') return null;
      return { value: value ? t('common.yes') : t('common.no'), type: String };
    case 'signal':
      if (!value) return null;
      return { value: t(`app.signal.${value}`, { defaultValue: String(value) }), type: String };
    default:
      if (value === null || value === undefined || value === '') return null;
      return { value: String(value), type: String };
  }
}

/** Filas de una hoja: cabecera en negrita + una fila por registro. */
export function buildSheetRows(sheetDef, records) {
  const header = sheetDef.columns.map(([headerKey]) => ({
    value: t(`excel.columns.${headerKey}`),
    type: String,
    fontWeight: 'bold',
    backgroundColor: '#E8F5E9',
  }));
  const rows = (records || []).map((record) => sheetDef.columns.map(([, key, kind, , catalogPath]) => (
    toCell(catalogPath ? translateCatalogText(catalogPath, record[key]) : record[key], kind)
  )));
  return [header, ...rows];
}

/** Hojas listas para writeExcelFile(sheets).toFile(nombre). Hoja vacía → solo cabecera. */
export function toWorkbookSheets(exportData) {
  const data = exportData || {};
  return SHEETS.map((sheetDef) => ({
    sheet: sheetDef.name,
    data: buildSheetRows(sheetDef, data[sheetDef.source]),
    columns: sheetDef.columns.map(([, , , width]) => ({ width })),
    stickyRowsCount: 1,
  }));
}

/** 'Safety-Desarrollo_2026-10-29.xlsx' */
export function exportFileName(today) {
  const day = String(today || '').slice(0, 10) || 'export';
  return `Safety-Desarrollo_${day}.xlsx`;
}
