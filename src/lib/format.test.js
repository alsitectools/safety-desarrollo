import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  currencyRows,
  daysBetween,
  formatBytes,
  formatDate,
  formatMoney,
  formatMoneyShort,
  formatNumber,
  formatTotalsShort,
  initials,
  isNum,
  labelOf,
  phaseLabelOf,
  relativeDays,
  todayIso,
} from './format.js';

// Intl usa espacio duro (U+00A0) antes del símbolo; normalizamos para comparar.
const norm = (text) => text.replace(/ | /g, ' ');

test('isNum', () => {
  assert.equal(isNum(0), true);
  assert.equal(isNum('12.5'), true);
  assert.equal(isNum(''), false);
  assert.equal(isNum(null), false);
  assert.equal(isNum('abc'), false);
});

test('formatNumber agrupa con punto y decimales con coma', () => {
  assert.equal(formatNumber(27500), '27.500');
  assert.equal(formatNumber(1538.5, 2), '1.538,50');
  assert.equal(formatNumber(null), '—');
  assert.equal(formatNumber(undefined, 0, ''), '');
});

test('formatMoney en es-ES', () => {
  assert.equal(norm(formatMoney(27500, 'EUR')), '27.500 €');
  assert.equal(norm(formatMoney(1538, 'EUR', { decimals: 2 })), '1.538,00 €');
  assert.match(norm(formatMoney(11000, 'USD')), /^11\.000 US\$$/);
  assert.equal(formatMoney(null), '—');
  assert.equal(formatMoney('', 'EUR', { empty: '' }), '');
  // Moneda no ISO: número + código
  assert.equal(formatMoney(10, 'XX1'), '10 XX1');
});

test('formatMoneyShort', () => {
  assert.equal(formatMoneyShort(1250000, 'EUR'), '1,25 M€');
  assert.equal(formatMoneyShort(27500, 'EUR'), '27,5 k€');
  assert.equal(formatMoneyShort(904, 'USD'), '904 $');
  assert.equal(formatMoneyShort(null), '—');
});

test('formatDate sin desfase horario', () => {
  assert.equal(formatDate('2026-10-29'), '29/10/2026');
  assert.equal(formatDate('2027-01-01T00:00:00.000Z'), '01/01/2027');
  assert.equal(formatDate(null), '—');
  assert.equal(formatDate('basura'), '—');
});

test('daysBetween y relativeDays', () => {
  assert.equal(daysBetween('2026-10-29', '2026-11-05'), 7);
  assert.equal(daysBetween('2026-10-29', '2026-10-20'), -9);
  assert.equal(daysBetween('2028-02-28', '2028-03-01'), 2); // bisiesto
  assert.equal(daysBetween('2026-03-28', '2026-03-30'), 2); // cambio de hora
  assert.equal(daysBetween(null, '2026-10-29'), null);
  assert.equal(relativeDays(0), 'hoy');
  assert.equal(relativeDays(1), 'mañana');
  assert.equal(relativeDays(-1), 'ayer');
  assert.equal(relativeDays(12), 'en 12 días');
  assert.equal(relativeDays(-3), 'hace 3 días');
  assert.equal(relativeDays(null), '');
});

test('todayIso', () => {
  assert.equal(todayIso(new Date(2026, 9, 29, 23, 59)), '2026-10-29');
});

test('initials', () => {
  assert.equal(initials('Juan Francisco Comes'), 'JC');
  assert.equal(initials('Jesús Gómez'), 'JG');
  assert.equal(initials('Dacame'), 'DA');
  assert.equal(initials('  '), '?');
});

test('labelOf y phaseLabelOf con el catálogo de /bootstrap', () => {
  const catalog = {
    enumLabels: { prioridad: { alta: 'Alta' } },
    phaseLabels: { personalizacion_certificacion: 'Personalización y certificación' },
  };
  assert.equal(labelOf(catalog, 'prioridad', 'alta'), 'Alta');
  assert.equal(labelOf(catalog, 'prioridad', 'rara'), 'rara');
  assert.equal(labelOf(catalog, 'prioridad', null), '—');
  // Sin catálogo del backend se usa el diccionario de la app
  assert.equal(labelOf(null, 'gama', 'premium'), 'Premium');
  assert.equal(labelOf(null, 'gama', 'desconocida'), 'desconocida');
  assert.equal(phaseLabelOf(catalog, 'personalizacion_certificacion'), 'Personalización y certificación');
  assert.equal(phaseLabelOf(catalog, ''), '—');
});

test('currencyRows: EUR primero y desviación calculada si falta', () => {
  const rows = currencyRows({
    USD: { previsto: 12000, real: 0, lineas: 1 },
    EUR: { previsto: 52716, real: 10000, desviacion: -42716, lineas: 2 },
  });
  assert.deepEqual(rows.map((r) => r.currency), ['EUR', 'USD']);
  assert.equal(rows[0].desviacion, -42716);
  assert.equal(rows[1].desviacion, -12000);
  assert.deepEqual(currencyRows(null), []);
});

test('formatTotalsShort', () => {
  assert.equal(norm(formatTotalsShort({ EUR: { previsto: 27500 }, USD: { previsto: 12000 } })), '27.500 € · 12.000 US$');
  assert.equal(formatTotalsShort({ EUR: { previsto: 0 } }), '—');
  assert.equal(formatTotalsShort({}), '—');
});

test('formatBytes', () => {
  assert.equal(formatBytes(500), '500 B');
  assert.equal(formatBytes(120334), '117,5 KB');
  assert.equal(formatBytes(5 * 1024 * 1024), '5,0 MB');
  assert.equal(formatBytes(null), '—');
});
