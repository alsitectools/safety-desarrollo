import { test } from 'node:test';
import assert from 'node:assert/strict';
import { peopleOptions, supplierOptions, productOptions, phaseOptions } from './options.js';

test('peopleOptions oculta inactivas salvo las asignadas', () => {
  const people = [
    { id: 1, nombre: 'Ana', empresa: 'Alsina HQ', activo: true },
    { id: 2, nombre: 'Raj', empresa: 'MEC India', activo: true },
    { id: 3, nombre: 'Luis', empresa: 'Alsina HQ', activo: false },
  ];
  assert.deepEqual(peopleOptions(people).map((o) => o.label), ['Ana', 'Raj (MEC India)']);
  assert.deepEqual(peopleOptions(people, [3, null]).map((o) => o.value), [1, 2, 3]);
  assert.match(peopleOptions(people, ['3'])[2].label, /inactiva/);
});

test('supplierOptions pone primero el tipo preferido sin perder el resto', () => {
  const suppliers = [
    { id: 1, nombre: 'APAC', pais: 'China', tipo: 'proveedor' },
    { id: 2, nombre: 'DEKRA', pais: '', tipo: 'laboratorio' },
  ];
  assert.deepEqual(supplierOptions(suppliers, { preferTipo: 'laboratorio' }).map((o) => o.label), ['DEKRA', 'APAC · China']);
  assert.deepEqual(supplierOptions(suppliers).map((o) => o.value), [1, 2]);
});

test('productOptions y phaseOptions', () => {
  assert.deepEqual(productOptions([{ id: 4, nombre: 'Guía' }]), [{ value: 4, label: 'Guía' }]);
  assert.deepEqual(phaseOptions({ phaseLabels: { mvp: 'MVP' } }, ['mvp', 'x']), [
    { value: 'mvp', label: 'MVP' },
    { value: 'x', label: 'x' },
  ]);
});
