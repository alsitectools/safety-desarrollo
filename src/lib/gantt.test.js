import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGanttRows, fromDay, ganttRange, monthsInRange, phaseSegments, toDay } from './gantt.js';

const today = toDay('2026-10-29');
const ph = (fase, estado, fechas = {}) => ({ fase, estado, fechaInicio: null, fechaFin: null, fechaObjetivo: null, ...fechas });

test('toDay / fromDay ida y vuelta', () => {
  assert.equal(fromDay(toDay('2027-01-31')), '2027-01-31');
  assert.equal(toDay(null), null);
  assert.equal(toDay('2026-10-30') - toDay('2026-10-29'), 1);
});

test('fase en curso sin inicio va de hoy al objetivo', () => {
  const [seg] = phaseSegments([ph('mvp', 'en_curso', { fechaObjetivo: '2027-01-31' })], today);
  assert.equal(seg.kind, 'current');
  assert.equal(fromDay(seg.start), '2026-10-29');
  assert.equal(fromDay(seg.end), '2027-01-31');
  assert.equal(seg.estimatedStart, true);
  assert.equal(seg.late, undefined);
});

test('fase en curso con objetivo pasado marca retraso hasta hoy', () => {
  const [seg] = phaseSegments([ph('mvp', 'en_curso', { fechaInicio: '2026-08-01', fechaObjetivo: '2026-10-01' })], today);
  assert.equal(seg.late, true);
  assert.equal(seg.overdueTo, today);
});

test('hechas sin fechas y saltadas no pintan; pendiente encadena tras la anterior', () => {
  const segs = phaseSegments([
    ph('busqueda', 'hecha'),
    ph('x', 'saltada', { fechaObjetivo: '2026-11-01' }),
    ph('aprovisionamiento', 'en_curso', { fechaInicio: '2026-09-01', fechaObjetivo: '2026-12-15' }),
    ph('escalado', 'pendiente', { fechaObjetivo: '2027-03-01' }),
    ph('otra', 'pendiente'),
  ], today);
  assert.deepEqual(segs.map((s) => s.fase), ['aprovisionamiento', 'escalado']);
  assert.equal(fromDay(segs[1].start), '2026-12-15');
  assert.equal(segs[1].kind, 'planned');
});

test('hecha con solo fecha fin es un hito', () => {
  const [seg] = phaseSegments([ph('ideacion', 'hecha', { fechaFin: '2026-06-30' })], today);
  assert.equal(seg.milestone, true);
  assert.equal(seg.start, seg.end);
});

test('hecha con solo inicio es un hito; en curso sin objetivo queda abierta hasta hoy', () => {
  const segs = phaseSegments([
    ph('busqueda', 'hecha', { fechaInicio: '2026-10-05' }),
    ph('aprovisionamiento', 'en_curso', { fechaInicio: '2026-10-29' }),
  ], today);
  assert.equal(segs[0].milestone, true);
  assert.equal(fromDay(segs[0].end), '2026-10-05');
  assert.equal(segs[1].noTarget, true);
  assert.equal(segs[1].end, today);
});

test('filas, rango a meses completos y meses', () => {
  const rows = buildGanttRows([
    { id: 1, fechaObjetivo: '2027-01-31', phases: [ph('mvp', 'en_curso', { fechaObjetivo: '2027-01-31' })] },
    { id: 2, fechaObjetivo: null, phases: [ph('busqueda', 'en_curso')] },
  ], today);
  assert.equal(rows[0].hasDates, true);
  assert.equal(rows[1].hasDates, false);
  const range = ganttRange(rows, today);
  assert.equal(fromDay(range.start), '2026-09-01');
  assert.equal(fromDay(range.end), '2027-05-01');
  const months = monthsInRange(range);
  assert.equal(months.length, 8);
  assert.equal(months.reduce((sum, m) => sum + m.days, 0), range.days);
});
