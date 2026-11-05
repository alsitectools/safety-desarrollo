import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeHistory } from './history.js';

const fns = { phase: (fase) => ({ mvp: 'MVP', aprovisionamiento: 'Aprovisionamiento' })[fase] || fase, person: (id) => `P${id}` };

test('update con cambios traduce personas y valores de enum', () => {
  const out = describeHistory(
    {
      entidad: 'action',
      accion: 'update',
      detalle: { cambios: { estado: { antes: 'pendiente', despues: 'hecho' }, ownerId: { antes: null, despues: 5 } } },
    },
    fns,
  );
  assert.equal(out.title, 'Acción · cambio');
  assert.deepEqual(out.lines, ['estado: Pendiente → Hecho', 'responsable: — → P5']);
});

test('avance de fase con comentario y pendientes (detalle como texto JSON)', () => {
  const out = describeHistory(
    { entidad: 'project', accion: 'advance', detalle: JSON.stringify({ de: 'mvp', a: 'aprovisionamiento', comentario: 'OK', pendientes: 1 }) },
    fns,
  );
  assert.equal(out.title, 'Proyecto · avance de fase');
  assert.deepEqual(out.lines, ['MVP → Aprovisionamiento', '1 entregable obligatorio pendiente']);
  assert.equal(out.comment, 'OK');
});

test('create y entradas desconocidas', () => {
  assert.deepEqual(describeHistory({ entidad: 'document', accion: 'upload', detalle: { titulo: 'Manual' } }).lines, ['Manual']);
  const raro = describeHistory({ entidad: 'otra', accion: 'x', detalle: 'no-json' });
  assert.equal(raro.title, 'otra · x');
  assert.deepEqual(raro.lines, []);
});
