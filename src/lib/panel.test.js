import { test } from 'node:test';
import assert from 'node:assert/strict';
import { budgetRows, familyBars, groupUpcoming, phaseBars, signalRows } from './panel.js';

const catalog = {
  caminos: ['propio', 'oem'],
  caminoLabels: { propio: 'Desarrollo propio', oem: 'Fabricante OEM' },
  phaseLabels: { ideacion: 'Ideación', busqueda: 'Búsqueda' },
};

test('phaseBars agrupa por camino con % sobre el máximo global', () => {
  const porFase = [
    { camino: 'propio', fase: 'ideacion', label: 'Ideación', count: 2 },
    { camino: 'propio', fase: 'mvp', label: 'MVP', count: 4 },
    { camino: 'oem', fase: 'busqueda', count: 1 },
    { camino: 'oem', fase: 'escalado', label: 'Escalado', count: 0 },
  ];
  const groups = phaseBars(porFase, catalog);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].label, 'Desarrollo propio');
  assert.equal(groups[0].total, 6);
  assert.deepEqual(groups[0].bars.map((b) => b.pct), [50, 100]);
  assert.equal(groups[1].bars[0].label, 'Búsqueda');
  assert.equal(groups[1].bars[1].pct, 0);
});

test('phaseBars sin datos', () => {
  const groups = phaseBars([], catalog);
  assert.deepEqual(groups.map((g) => g.total), [0, 0]);
  assert.deepEqual(phaseBars(null, null), []);
});

test('familyBars', () => {
  const bars = familyBars([
    { familyCode: 'borde', nombre: 'Protección de borde', count: 4 },
    { familyCode: 'redes', nombre: '', count: 1 },
  ]);
  assert.deepEqual(bars.map((b) => b.pct), [100, 25]);
  assert.equal(bars[1].nombre, 'Redes y catch fan'); // sin nombre del backend → catálogo por código
  assert.deepEqual(familyBars(undefined), []);
});

test('budgetRows calcula % ejecutado', () => {
  const rows = budgetRows({ USD: { previsto: 0, real: 100 }, EUR: { previsto: 200, real: 50, desviacion: -150, lineas: 2 } });
  assert.equal(rows[0].currency, 'EUR');
  assert.equal(rows[0].pctReal, 25);
  assert.equal(rows[1].pctReal, null);
});

test('signalRows en orden fijo', () => {
  const rows = signalRows({ rojo: 2, verde: 8 });
  assert.deepEqual(rows.map((r) => [r.key, r.count]), [['verde', 8], ['ambar', 0], ['rojo', 2], ['gris', 0]]);
  assert.equal(signalRows(null)[0].count, 0);
});

test('groupUpcoming por horizonte', () => {
  const groups = groupUpcoming([
    { dias: 0 }, { dias: 7 }, { dias: 8 }, { dias: 30 }, { dias: 45 },
  ]);
  assert.deepEqual(groups.map((g) => [g.key, g.items.length]), [['semana', 2], ['mes', 2], ['despues', 1]]);
  assert.deepEqual(groupUpcoming([]), []);
});
