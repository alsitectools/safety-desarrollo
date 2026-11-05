// Utilidades puras sobre la lista de proyectos (GET /projects): orden, kanban y responsables.
// Las etiquetas (roles, fases, caminos, familias) salen en el idioma activo en el momento de llamar.
import { getIntlLocale, t } from '../i18n/core.js';
import { familyName } from '../i18n/labels.js';
import { phaseLabelOf } from './format.js';

const PRIORITY_RANK = { alta: 0, media: 1, baja: 2 };
const SIGNAL_RANK = { rojo: 0, ambar: 1, verde: 2, gris: 3 };

export function peopleById(people) {
  const map = new Map();
  (people || []).forEach((person) => map.set(person.id, person));
  return map;
}

/** Responsables de un proyecto: [{ rol: 'Diseño', short: 'D', person }] (solo los asignados). */
export function projectResponsables(project, peopleMap) {
  const slots = [
    ['designerId', 'design'],
    ['sourcingId', 'sourcing'],
    ['homologationId', 'homologation'],
  ];
  return slots
    .filter(([key]) => project && project[key])
    .map(([key, role]) => ({
      key,
      rol: t(`app.roles.${role}`),
      short: t(`app.rolesShort.${role}`),
      person: peopleMap.get(project[key]) || null,
    }))
    .filter((slot) => slot.person);
}

function firstCurrencyAmount(project, key) {
  const totals = project && project.kpis && project.kpis.presupuesto;
  if (!totals) return 0;
  if (totals.EUR) return Number(totals.EUR[key]) || 0;
  const first = Object.values(totals)[0];
  return first ? Number(first[key]) || 0 : 0;
}

/** Valor de ordenación de un proyecto por clave de columna. */
export function sortValue(project, key, ctx = {}) {
  const phases = (ctx.phasesByCamino && ctx.phasesByCamino[project.camino]) || [];
  switch (key) {
    case 'prioridad':
      return PRIORITY_RANK[project.prioridad] ?? 9;
    case 'semaforo':
      return SIGNAL_RANK[project.kpis && project.kpis.semaforo] ?? 9;
    case 'fase':
      // Orden por camino y posición de la fase dentro del camino.
      return `${project.camino === 'propio' ? 0 : 1}-${String(Math.max(phases.indexOf(project.faseActual), 0)).padStart(2, '0')}`;
    case 'familia':
      return (ctx.familyNames && ctx.familyNames[project.familyCode]) || project.familyCode || '';
    case 'fechaObjetivo':
      return project.fechaObjetivo || '9999-12-31';
    case 'acciones':
      return (project.kpis?.accionesVencidas || 0) * 1000 + (project.kpis?.accionesAbiertas || 0);
    case 'entregables': {
      const total = (project.kpis && project.kpis.entregablesTotal) || 0;
      return total ? project.kpis.entregablesHechos / total : -1;
    }
    case 'previsto':
      return firstCurrencyAmount(project, 'previsto');
    case 'real':
      return firstCurrencyAmount(project, 'real');
    default: {
      const value = project[key];
      return value === null || value === undefined ? '' : value;
    }
  }
}

/** Ordena sin mutar. dir 'asc' | 'desc'. Desempata por nombre. */
export function sortProjects(projects, key = 'prioridad', dir = 'asc', ctx = {}) {
  const sign = dir === 'desc' ? -1 : 1;
  const locale = getIntlLocale();
  return [...(projects || [])].sort((a, b) => {
    const va = sortValue(a, key, ctx);
    const vb = sortValue(b, key, ctx);
    let cmp;
    if (typeof va === 'number' && typeof vb === 'number') cmp = va - vb;
    else cmp = String(va).localeCompare(String(vb), locale, { numeric: true, sensitivity: 'base' });
    if (cmp !== 0) return cmp * sign;
    return String(a.nombre || '').localeCompare(String(b.nombre || ''), locale, { sensitivity: 'base' });
  });
}

/**
 * Agrupa para el kanban: [{ camino, label, columns: [{ fase, label, projects }] }].
 * Los proyectos con una fase que no pertenece a su camino van a la primera columna.
 */
export function groupKanban(projects, catalog) {
  const caminos = (catalog && catalog.caminos) || ['propio', 'oem'];
  return caminos.map((camino) => {
    const phases = (catalog && catalog.phasesByCamino && catalog.phasesByCamino[camino]) || [];
    const columns = phases.map((fase) => ({
      fase,
      label: phaseLabelOf(catalog, fase),
      projects: [],
    }));
    (projects || [])
      .filter((project) => project.camino === camino)
      .forEach((project) => {
        const column = columns.find((col) => col.fase === project.faseActual) || columns[0];
        if (column) column.projects.push(project);
      });
    columns.forEach((col) => {
      col.projects = sortProjects(col.projects, 'prioridad');
    });
    return {
      camino,
      label: t(`catalog.camino.${camino}`, { defaultValue: (catalog.caminoLabels && catalog.caminoLabels[camino]) || camino }),
      total: columns.reduce((sum, col) => sum + col.projects.length, 0),
      columns,
    };
  });
}

/** Personas activas ordenadas por nombre (para selects). Incluye `keepId` aunque esté inactiva. */
export function activePeople(people, keepId = null) {
  return (people || [])
    .filter((person) => person.activo || person.id === keepId)
    .sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), getIntlLocale()));
}

/** Familias activas en orden (para selects). Incluye `keepCode` aunque esté inactiva. */
export function activeFamilies(families, keepCode = null) {
  return (families || [])
    .filter((family) => family.activo || family.code === keepCode)
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
}

export function familyNameMap(families) {
  const map = {};
  (families || []).forEach((family) => {
    map[family.code] = familyName(family);
  });
  return map;
}
