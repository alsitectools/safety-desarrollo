import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pendingMandatory, groupByPhase, progress, advanceWarning } from './deliverables.js';

const PHASES = ['ideacion', 'prototipaje', 'mvp', 'aprovisionamiento', 'escalado'];
const items = [
  { id: 1, fase: 'ideacion', texto: 'Brief', obligatorio: true, hecho: true, orden: 1 },
  { id: 2, fase: 'ideacion', texto: 'Benchmark', obligatorio: true, hecho: false, orden: 2 },
  { id: 3, fase: 'ideacion', texto: 'Opcional', obligatorio: false, hecho: false, orden: 3 },
  { id: 4, fase: 'prototipaje', texto: 'Prototipo', obligatorio: true, hecho: false, orden: 1 },
  { id: 5, fase: 'mvp', texto: 'Ensayo', obligatorio: true, hecho: 1, orden: 1 },
];

test('pendingMandatory solo cuenta obligatorios sin hacer de la fase', () => {
  assert.deepEqual(pendingMandatory(items, 'ideacion').map((item) => item.id), [2]);
  assert.deepEqual(pendingMandatory(items, 'mvp'), []);
  assert.deepEqual(pendingMandatory(null, 'mvp'), []);
});

test('groupByPhase respeta el orden de fases y ordena dentro de cada una', () => {
  const groups = groupByPhase([...items].reverse(), PHASES);
  assert.deepEqual(Object.keys(groups), PHASES);
  assert.deepEqual(groups.ideacion.map((item) => item.id), [1, 2, 3]);
  assert.deepEqual(groups.escalado, []);
});

test('progress', () => {
  assert.deepEqual(progress(items), { hechos: 2, total: 5, obligatoriosPendientes: 2, pct: 40 });
  assert.deepEqual(progress([]), { hechos: 0, total: 0, obligatoriosPendientes: 0, pct: 0 });
});

test('advanceWarning: comentario obligatorio solo si avanza con pendientes de la fase actual', () => {
  const avance = advanceWarning({ phases: PHASES, from: 'ideacion', to: 'mvp', deliverables: items });
  assert.equal(avance.direction, 'avance');
  assert.equal(avance.requiresComment, true);
  assert.deepEqual(avance.pendientes.map((item) => item.id), [2]);
  assert.deepEqual(avance.pendientesSaltadas.map((item) => item.id), [4]);

  const limpio = advanceWarning({ phases: PHASES, from: 'mvp', to: 'aprovisionamiento', deliverables: items });
  assert.equal(limpio.requiresComment, false);

  const atras = advanceWarning({ phases: PHASES, from: 'mvp', to: 'ideacion', deliverables: items });
  assert.equal(atras.direction, 'retroceso');
  assert.equal(atras.requiresComment, false);

  assert.equal(advanceWarning({ phases: PHASES, from: 'mvp', to: 'mvp', deliverables: items }).direction, 'igual');
  assert.equal(advanceWarning({ phases: PHASES, from: 'mvp', to: 'busqueda', deliverables: items }).direction, 'invalida');
});
