import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildHash, parseHash } from './router.js';

test('parseHash rutas conocidas', () => {
  assert.deepEqual(parseHash('#/panel'), { name: 'panel', id: null, query: {} });
  assert.deepEqual(parseHash('#/proyecto/12'), { name: 'proyecto', id: '12', query: {} });
  assert.deepEqual(parseHash('#/lista?fase=mvp&camino=propio'), { name: 'lista', id: null, query: { fase: 'mvp', camino: 'propio' } });
  assert.deepEqual(parseHash('#/fabricantes/7'), { name: 'fabricantes', id: '7', query: {} });
});

test('parseHash por defecto y casos raros', () => {
  assert.equal(parseHash('').name, 'panel');
  assert.equal(parseHash('#/').name, 'panel');
  assert.equal(parseHash('#/desconocida/3').name, 'panel');
  assert.equal(parseHash('#/desconocida/3').id, null);
  assert.equal(parseHash('#/proyecto').name, 'lista');
  assert.equal(parseHash('#/proyecto/%E2%82%AC').id, '€');
});

test('buildHash omite vacíos y es inverso de parseHash', () => {
  assert.equal(buildHash('lista', null, { fase: 'mvp', q: '' }), '#/lista?fase=mvp');
  assert.equal(buildHash('proyecto', 12), '#/proyecto/12');
  const hash = buildHash('lista', null, { q: 'borde eco', estado: 'activo' });
  assert.deepEqual(parseHash(hash).query, { q: 'borde eco', estado: 'activo' });
});
