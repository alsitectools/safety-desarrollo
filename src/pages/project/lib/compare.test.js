import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildComparison, cheapestIndex, defaultCandidates } from './compare.js';

const fields = [
  { key: 'carga_max_kg', label: 'Carga máxima', unit: 'kg', type: 'number', orden: 1 },
  { key: 'peso_propio_kg', label: 'Peso propio', unit: 'kg', type: 'number', orden: 2 },
  { key: 'tipo', label: 'Tipo', type: 'select', orden: 3 },
];
const products = [
  { id: 1, nombre: 'Retráctil TSS', specs: { carga_max_kg: 2000, peso_propio_kg: 800, color: 'amarillo' }, pesoKg: 800 },
  { id: 2, nombre: 'Retráctil GETO', specs: { carga_max_kg: 2500, peso_propio_kg: null } },
];
const quote = (importe, moneda, extra = {}) => ({ id: importe, importe, moneda, incoterm: 'FOB', fecha: '2026-10-01', ...extra });
const ps = [
  { id: 10, supplierId: 1, supplierNombre: 'TSS/KHK', supplierPais: 'EAU', productId: 1, rol: 'candidato_oem', estado: 'oferta', lastQuote: quote(9000, 'USD') },
  { id: 11, supplierId: 2, supplierNombre: 'GETO', productId: 2, rol: 'candidato_oem', estado: 'contactado', lastQuote: quote(7000, 'USD') },
  { id: 12, supplierId: 3, supplierNombre: 'Otro', productId: null, rol: 'fabricante', estado: 'oferta', lastQuote: quote(5000, 'EUR') },
  { id: 13, supplierId: 4, supplierNombre: 'DEKRA', productId: null, rol: 'laboratorio', estado: 'oferta', lastQuote: null },
  { id: 14, supplierId: 5, supplierNombre: 'Descartado', productId: null, rol: 'candidato_oem', estado: 'descartado', lastQuote: null },
];

test('defaultCandidates excluye laboratorios, referencias y descartados', () => {
  assert.deepEqual(defaultCandidates(ps).map((item) => item.id), [10, 11, 12]);
  assert.deepEqual(defaultCandidates(ps, { includeDiscarded: true }).map((item) => item.id), [10, 11, 12, 14]);
});

test('buildComparison: columnas, specs de familia, claves libres y última oferta', () => {
  const { columns, rows } = buildComparison({ projectSuppliers: defaultCandidates(ps), products, fields });
  assert.deepEqual(columns.map((col) => col.nombre), ['TSS/KHK', 'GETO', 'Otro']);
  const keys = rows.map((row) => row.key);
  assert.ok(keys.includes('spec.carga_max_kg'));
  assert.ok(keys.includes('spec.peso_propio_kg'));
  assert.ok(!keys.includes('spec.tipo'), 'sin valores no se muestra');
  assert.ok(keys.includes('spec.color'), 'claves libres');
  assert.ok(keys.indexOf('spec.carga_max_kg') < keys.indexOf('spec.color'));
  const carga = rows.find((row) => row.key === 'spec.carga_max_kg');
  assert.deepEqual(carga.values, [2000, 2500, undefined]);
  const importe = rows.find((row) => row.key === 'importe');
  assert.deepEqual(importe.values, [9000, 7000, 5000]);
  assert.equal(importe.best, 1, 'GETO es la más barata en USD; la de EUR no se compara');
  assert.deepEqual(rows.find((row) => row.key === 'producto').values, ['Retráctil TSS', 'Retráctil GETO', '']);
});

test('cheapestIndex necesita al menos dos ofertas en la misma moneda', () => {
  assert.equal(cheapestIndex([{ quote: quote(1, 'EUR') }, { quote: quote(2, 'USD') }]), null);
  assert.equal(cheapestIndex([{ quote: null }, { quote: quote(3, 'EUR') }, { quote: quote(2, 'EUR') }]), 2);
  assert.equal(cheapestIndex([]), null);
});
