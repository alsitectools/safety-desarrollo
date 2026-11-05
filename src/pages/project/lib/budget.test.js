import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  plannedAmount,
  isPlannedComputed,
  lineDeviation,
  deviationPct,
  deviationTone,
  totalsByCurrency,
  totalsByType,
  typeTotalsRows,
} from './budget.js';

test('plannedAmount: unidades × precio + porte, o previsto manual', () => {
  assert.equal(plannedAmount({ unidades: 32, precioUnitario: 1538, porte: 3500 }), 52716);
  assert.equal(plannedAmount({ unidades: 2, precioUnitario: 0.1, porte: null }), 0.2);
  assert.equal(plannedAmount({ unidades: null, precioUnitario: 10, previsto: 27500 }), 27500);
  assert.equal(plannedAmount({ previsto: null }), null);
  assert.equal(isPlannedComputed({ unidades: 1, precioUnitario: 1 }), true);
  assert.equal(isPlannedComputed({ unidades: '', precioUnitario: 1 }), false);
});

test('lineDeviation y deviationPct', () => {
  assert.equal(lineDeviation({ previsto: 1000, real: null }), null);
  assert.equal(lineDeviation({ previsto: 1000, real: 1200 }), 200);
  assert.equal(lineDeviation({ unidades: 2, precioUnitario: 100, porte: 0, real: 150 }), -50);
  assert.equal(deviationPct(1000, 1100), 10);
  assert.equal(deviationPct(0, 100), null);
  assert.equal(deviationPct(1000, null), null);
  assert.equal(deviationTone(5), 'sobre');
  assert.equal(deviationTone(-5), 'bajo');
  assert.equal(deviationTone(null), 'neutro');
});

test('totales por moneda sin conversión', () => {
  const lines = [
    { tipo: 'compra_inicial', moneda: 'EUR', unidades: 32, precioUnitario: 1538, porte: 3500, real: null },
    { tipo: 'ensayos', moneda: 'eur', previsto: 2000, real: 2100 },
    { tipo: 'compra_inicial', moneda: 'USD', previsto: 12000, real: 11000 },
  ];
  const totals = totalsByCurrency(lines);
  assert.deepEqual(totals.EUR, { previsto: 54716, real: 2100, desviacion: -52616, lineas: 2 });
  assert.deepEqual(totals.USD, { previsto: 12000, real: 11000, desviacion: -1000, lineas: 1 });
  const byType = totalsByType(lines);
  assert.equal(byType.compra_inicial.EUR.previsto, 52716);
  assert.equal(byType.compra_inicial.USD.real, 11000);
  const rows = typeTotalsRows(byType, ['prototipaje', 'compra_inicial', 'ensayos']);
  assert.deepEqual(
    rows.map((row) => `${row.tipo}/${row.moneda}`),
    ['compra_inicial/EUR', 'compra_inicial/USD', 'ensayos/EUR'],
  );
});
