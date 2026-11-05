// Texto legible de las entradas de historial (contrato §9). Puro; los textos siguen el idioma activo.
import { t } from '../../../i18n/core.js';
import { caminoLabel, familyName } from '../../../i18n/labels.js';
import { labelOf } from '../../../lib/format.js';

// Enums cuyo valor se traduce en las líneas de cambio. «estado», «tipo», «rol» y «origen» dependen de la entidad.
const ENUM_BY_FIELD = { prioridad: 'prioridad', gama: 'gama', modalidad: 'modalidad' };
const ENUM_BY_ENTITY_FIELD = {
  estado: {
    project: 'projectEstado',
    phase: 'phaseEstado',
    action: 'actionEstado',
    projectSupplier: 'psEstado',
    budgetLine: 'budgetEstado',
    certification: 'certEstado',
  },
  tipo: { budgetLine: 'budgetTipo', document: 'docTipo', supplier: 'supplierTipo', familyField: 'fieldType' },
  rol: { projectSupplier: 'psRol' },
  origen: { product: 'productOrigen' },
};

function enumOf(entity, field) {
  return ENUM_BY_FIELD[field] || ENUM_BY_ENTITY_FIELD[field]?.[entity] || null;
}

const entityLabel = (entity) => (entity ? t(`project.history.entity.${entity}`, { defaultValue: entity }) : '');
const actionLabel = (action) => (action ? t(`project.history.action.${action}`, { defaultValue: action }) : '');
const fieldName = (field) => t(`project.history.field.${field}`, { defaultValue: field });

function valueText(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (value === true) return t('project.history.yes');
  if (value === false) return t('project.history.no');
  if (typeof value === 'object') return t('project.history.modified');
  const text = String(value);
  return text.length > 60 ? `${text.slice(0, 57)}…` : text;
}

function parseDetail(detalle) {
  if (!detalle) return {};
  if (typeof detalle === 'string') {
    try {
      return JSON.parse(detalle) || {};
    } catch {
      return {};
    }
  }
  return detalle;
}

// { title: 'Acción · cambio', lines: ['estado: Pendiente → Hecho'], comment } (en el idioma activo)
// labelFns opcionales: { phase(fase), person(id) } para traducir valores.
export function describeHistory(entry, labelFns = {}) {
  const detail = parseDetail(entry?.detalle);
  const entity = entityLabel(entry?.entidad);
  const action = actionLabel(entry?.accion);
  const lines = [];
  const phase = labelFns.phase || ((value) => value);
  const person = labelFns.person || ((value) => value);
  const translate = (field, value) => {
    if (value === null || value === undefined || value === '') return '—';
    if (['ownerId', 'designerId', 'sourcingId', 'homologationId'].includes(field)) return person(value);
    if (field === 'fase' || field === 'faseActual') return phase(value);
    if (field === 'camino') return caminoLabel(value);
    if (field === 'familyCode') return familyName(value);
    const enumName = typeof value === 'string' ? enumOf(entry?.entidad, field) : null;
    if (enumName) return labelOf(null, enumName, value);
    return valueText(value);
  };

  if (detail.cambios && typeof detail.cambios === 'object') {
    for (const [field, change] of Object.entries(detail.cambios)) {
      const label = fieldName(field);
      lines.push(`${label}: ${translate(field, change?.antes)} → ${translate(field, change?.despues)}`);
    }
  }
  if (detail.de !== undefined || detail.a !== undefined) {
    const isCamino = entry?.accion === 'cambio_camino';
    const side = (value) => (isCamino ? caminoLabel(value) : phase(value));
    lines.push(`${side(detail.de)} → ${side(detail.a)}`);
    if (detail.pendientes) lines.push(t('project.history.pendingMandatory', { count: Number(detail.pendientes) }));
  }
  const name = detail.nombre || detail.texto || detail.titulo;
  if (name && !lines.length) lines.push(valueText(name));

  return { title: [entity, action].filter(Boolean).join(' · '), lines, comment: detail.comentario || '' };
}
