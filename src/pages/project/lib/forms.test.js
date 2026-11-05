import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  filterActions,
  specsToForm,
  extraSpecsToList,
  formToSpecs,
  formToPiezas,
  numericFields,
  idOrNull,
  emptyToNull,
} from './forms.js';
import { formatDate, formatMoney, enumLabel, especialistaLink, initials, parseNumberInput, isSafeHttpUrl } from './format.js';

const fields = [
  { key: 'carga_max_kg', label: 'Carga máxima', type: 'number' },
  { key: 'cabe_contenedor', label: 'Cabe en contenedor', type: 'bool' },
  { key: 'norma', label: 'Norma', type: 'text' },
  { key: 'ratio_carga_peso', label: 'Ratio', type: 'number', calculado: true },
];

test('filterActions', () => {
  const actions = [
    { id: 1, estado: 'pendiente', ownerId: 5, fase: 'mvp' },
    { id: 2, estado: 'hecho', ownerId: 5, fase: null },
    { id: 3, estado: 'enviado', ownerId: 7, fase: null },
  ];
  assert.deepEqual(filterActions(actions, { soloAbiertas: true }).map((a) => a.id), [1, 3]);
  assert.deepEqual(filterActions(actions, { ownerId: '5' }).map((a) => a.id), [1, 2]);
  assert.deepEqual(filterActions(actions, { fase: '__none__' }).map((a) => a.id), [2, 3]);
  assert.deepEqual(filterActions(actions, { fase: 'mvp' }).map((a) => a.id), [1]);
});

test('specs ida y vuelta con tipos y calculados', () => {
  const specs = { carga_max_kg: 2000, cabe_contenedor: true, norma: null, ratio_carga_peso: 2.5, color: 'rojo' };
  const form = specsToForm(fields, specs);
  assert.deepEqual(form, { carga_max_kg: '2000', cabe_contenedor: true, norma: '', ratio_carga_peso: '2.5' });
  assert.deepEqual(extraSpecsToList(fields, specs), [{ key: 'color', value: 'rojo' }]);
  const back = formToSpecs(fields, { ...form, carga_max_kg: '2000,5' }, [{ key: 'color', value: 'rojo' }, { key: '', value: 'x' }]);
  assert.deepEqual(back.errors, {});
  assert.deepEqual(back.specs, { carga_max_kg: 2000.5, cabe_contenedor: true, norma: null, color: 'rojo' });
  const bad = formToSpecs(fields, { carga_max_kg: 'mucho' });
  assert.equal(bad.errors['specs.carga_max_kg'], 'Carga máxima debe ser un número.');
});

test('formToPiezas ignora filas vacías y valida', () => {
  const { piezas, errors } = formToPiezas([
    { nombre: 'Base', pesoKg: '142,6', dims: '4900×900×300' },
    { nombre: '', pesoKg: '', dims: '' },
    { nombre: '', pesoKg: 'x', dims: '' },
  ]);
  assert.deepEqual(piezas[0], { nombre: 'Base', pesoKg: 142.6, dims: '4900×900×300' });
  assert.equal(piezas.length, 2);
  assert.ok(errors['piezasTransporte.2']);
});

test('numericFields, idOrNull y emptyToNull', () => {
  const { values, errors } = numericFields({ unidades: '32', porte: '', precio: 'abc' }, ['unidades', 'porte', 'precio'], { precio: 'Precio' });
  assert.deepEqual(values, { unidades: 32, porte: null });
  assert.equal(errors.precio, 'Precio debe ser un número.');
  assert.equal(idOrNull('7'), 7);
  assert.equal(idOrNull(''), null);
  assert.equal(idOrNull('0'), null);
  assert.equal(emptyToNull('  '), null);
  assert.equal(emptyToNull('a'), 'a');
});

test('formato', () => {
  assert.equal(formatDate('2026-10-29'), '29/10/2026');
  assert.equal(formatDate(null), '—');
  assert.equal(formatMoney(52716, 'EUR'), '52.716,00 EUR');
  assert.equal(formatMoney(1538.5, 'USD'), '1.538,50 USD');
  assert.equal(formatMoney(null), '—');
  assert.equal(enumLabel({ enumLabels: { prioridad: { alta: 'Alta' } } }, 'prioridad', 'alta'), 'Alta');
  assert.equal(enumLabel({}, 'prioridad', 'urgente'), 'urgente');
  assert.equal(especialistaLink('https://x.test/especialista/#old', '#pva'), 'https://x.test/especialista/#pva');
  assert.equal(especialistaLink('https://x.test/e', 'eps'), 'https://x.test/e#eps');
  assert.equal(especialistaLink('', '#eps'), '');
  assert.equal(initials('Juan Francisco Comes'), 'JF');
  assert.equal(parseNumberInput(''), null);
  assert.ok(Number.isNaN(parseNumberInput('abc')));
  assert.equal(isSafeHttpUrl('https://alsina.sharepoint.com/x'), true);
  assert.equal(isSafeHttpUrl('javascript:alert(1)'), false);
});
