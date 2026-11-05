import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  activeFamilies,
  activePeople,
  familyNameMap,
  groupKanban,
  peopleById,
  projectResponsables,
  sortProjects,
} from './projects.js';

const catalog = {
  caminos: ['propio', 'oem'],
  caminoLabels: { propio: 'Desarrollo propio', oem: 'Fabricante OEM' },
  phasesByCamino: {
    propio: ['ideacion', 'prototipaje', 'mvp', 'aprovisionamiento', 'escalado'],
    oem: ['busqueda', 'personalizacion_certificacion', 'aprovisionamiento', 'escalado'],
  },
  phaseLabels: { ideacion: 'Ideación', mvp: 'MVP', busqueda: 'Búsqueda', aprovisionamiento: 'Aprovisionamiento' },
};

const kpis = (over = {}) => ({ accionesAbiertas: 0, accionesVencidas: 0, entregablesHechos: 0, entregablesTotal: 0, presupuesto: {}, semaforo: 'verde', ...over });

const projects = [
  { id: 1, nombre: 'Borde ECO', camino: 'oem', faseActual: 'aprovisionamiento', prioridad: 'media', familyCode: 'borde', fechaObjetivo: '2027-01-31', kpis: kpis({ semaforo: 'ambar', presupuesto: { EUR: { previsto: 27500, real: 0 } } }) },
  { id: 2, nombre: 'Borde Premium', camino: 'propio', faseActual: 'ideacion', prioridad: 'baja', familyCode: 'borde', fechaObjetivo: null, kpis: kpis() },
  { id: 3, nombre: 'Catch fan', camino: 'oem', faseActual: 'busqueda', prioridad: 'alta', familyCode: 'redes', fechaObjetivo: '2026-12-01', kpis: kpis({ semaforo: 'rojo', accionesVencidas: 2, accionesAbiertas: 3 }) },
  { id: 4, nombre: 'Malla Celsa', camino: 'propio', faseActual: 'mvp', prioridad: 'alta', familyCode: 'borde', fechaObjetivo: '2027-02-01', kpis: kpis({ entregablesHechos: 3, entregablesTotal: 4 }) },
  { id: 5, nombre: 'Rara', camino: 'propio', faseActual: 'busqueda', prioridad: 'media', familyCode: 'otros', fechaObjetivo: null, kpis: kpis() },
];

test('sortProjects por prioridad desempata por nombre', () => {
  assert.deepEqual(sortProjects(projects, 'prioridad').map((p) => p.id), [3, 4, 1, 5, 2]);
  assert.deepEqual(sortProjects(projects, 'prioridad', 'desc').map((p) => p.id), [2, 1, 5, 3, 4]);
});

test('sortProjects por fecha (sin fecha al final), semáforo y previsto', () => {
  assert.deepEqual(sortProjects(projects, 'fechaObjetivo').map((p) => p.id), [3, 1, 4, 2, 5]);
  assert.deepEqual(sortProjects(projects, 'semaforo').map((p) => p.id).slice(0, 2), [3, 1]);
  assert.equal(sortProjects(projects, 'previsto', 'desc')[0].id, 1);
});

test('sortProjects por fase usa el orden del camino', () => {
  const ids = sortProjects(projects, 'fase', 'asc', { phasesByCamino: catalog.phasesByCamino }).map((p) => p.id);
  assert.deepEqual(ids, [2, 5, 4, 3, 1]);
});

test('sortProjects por familia usa el nombre y no muta la entrada', () => {
  const copy = [...projects];
  const sorted = sortProjects(projects, 'familia', 'asc', { familyNames: { borde: 'Protección de borde', redes: 'Redes', otros: 'Otros' } });
  assert.equal(sorted[0].familyCode, 'otros');
  assert.deepEqual(projects, copy);
});

test('sortProjects por entregables y acciones', () => {
  assert.equal(sortProjects(projects, 'entregables', 'desc')[0].id, 4);
  assert.equal(sortProjects(projects, 'acciones', 'desc')[0].id, 3);
  const noKpis = sortProjects([{ id: 9, nombre: 'x' }, ...projects], 'acciones');
  assert.equal(noKpis.length, 6);
});

test('groupKanban: carriles, columnas en orden y fase ajena a la primera columna', () => {
  const lanes = groupKanban(projects, catalog);
  assert.deepEqual(lanes.map((l) => l.camino), ['propio', 'oem']);
  assert.equal(lanes[0].label, 'Desarrollo propio');
  assert.deepEqual(lanes[0].columns.map((c) => c.fase), catalog.phasesByCamino.propio);
  assert.equal(lanes[0].columns[0].label, 'Ideación');
  assert.equal(lanes[0].columns[1].label, 'Prototipaje'); // falta en phaseLabels → catálogo i18n
  assert.deepEqual(lanes[0].columns[0].projects.map((p) => p.id), [5, 2]);
  assert.deepEqual(lanes[0].columns[2].projects.map((p) => p.id), [4]);
  assert.equal(lanes[0].total, 3);
  assert.equal(lanes[1].total, 2);
  assert.deepEqual(lanes[1].columns[2].projects.map((p) => p.id), [1]);
});

test('projectResponsables y peopleById', () => {
  const people = [
    { id: 3, nombre: 'Javier Martín', activo: true },
    { id: 5, nombre: 'Miquel Piñeira', activo: true },
  ];
  const map = peopleById(people);
  const slots = projectResponsables({ designerId: 3, sourcingId: 5, homologationId: 99 }, map);
  assert.deepEqual(slots.map((s) => s.short), ['D', 'B']);
  assert.equal(slots[0].person.nombre, 'Javier Martín');
  assert.deepEqual(projectResponsables(null, map), []);
});

test('activePeople, activeFamilies y familyNameMap', () => {
  const people = [
    { id: 1, nombre: 'Zoe', activo: true },
    { id: 2, nombre: 'Ana', activo: false },
    { id: 3, nombre: 'Álvaro', activo: true },
  ];
  assert.deepEqual(activePeople(people).map((p) => p.id), [3, 1]);
  assert.deepEqual(activePeople(people, 2).map((p) => p.id), [3, 2, 1]);
  const families = [
    { code: 'b', nombre: 'B', orden: 2, activo: true },
    { code: 'a', nombre: 'A', orden: 1, activo: true },
    { code: 'x', nombre: 'X', orden: 3, activo: false },
  ];
  assert.deepEqual(activeFamilies(families).map((f) => f.code), ['a', 'b']);
  assert.deepEqual(activeFamilies(families, 'x').map((f) => f.code), ['a', 'b', 'x']);
  assert.deepEqual(familyNameMap(families), { b: 'B', a: 'A', x: 'X' });
});
