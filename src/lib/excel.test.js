import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSheetRows, excelDate, exportFileName, SHEETS, toCell, toWorkbookSheets } from './excel.js';

const sample = {
  generatedAt: '2026-10-29T10:00:00.000Z',
  proyectos: [{
    id: 1, codigo: '', nombre: 'Borde ECO solo venta', familia: 'Protección de borde (TEPS/SPPB)', camino: 'Fabricante OEM',
    fase: 'Aprovisionamiento', estado: 'Activo', prioridad: 'Alta', gama: '', modalidad: 'Venta', diseno: 'Javier Martín',
    busqueda: 'Miquel Piñeira', homologacion: '', centroDiseno: '', mercados: '', fechaObjetivo: '2027-01-31', semaforo: 'ambar',
    accionesAbiertas: 2, accionesVencidas: 0, entregablesHechos: 3, entregablesTotal: 22,
    presupuesto: 'EUR previsto 27.500,00 / real 0,00', sharepointUrl: '',
  }],
  acciones: [{ id: 80, proyecto: 'X', fase: '', texto: 'Pedir desglose', responsable: 'Francisca Ugarte', fechaLimite: '2026-11-15', estado: 'Pendiente', vencida: false, origen: 'MoM 27/10/2026' }],
  presupuesto: [{ id: 20, proyecto: 'X', tipo: 'Compra inicial', concepto: '32 × Modulo 18', fabricante: 'Strumin', unidades: 32, precioUnitario: 1538, porte: 3500, moneda: 'EUR', previsto: 52716, real: null, desviacion: null, estado: 'Previsto' }],
  fabricantes: [],
  certificaciones: [{ id: 3, proyecto: 'X', producto: '', norma: 'UNE-EN 13374', clase: 'C', laboratorio: 'DEKRA', estado: 'En ensayo', fechaInforme: '' }],
};

test('cinco hojas en el orden pedido', () => {
  assert.deepEqual(SHEETS.map((s) => s.name), ['Proyectos', 'Acciones', 'Presupuesto', 'Fabricantes', 'Certificaciones']);
  const sheets = toWorkbookSheets(sample);
  assert.deepEqual(sheets.map((s) => s.sheet), ['Proyectos', 'Acciones', 'Presupuesto', 'Fabricantes', 'Certificaciones']);
  sheets.forEach((sheet, i) => {
    assert.equal(sheet.columns.length, SHEETS[i].columns.length);
    assert.equal(sheet.stickyRowsCount, 1);
    assert.equal(sheet.data[0].length, SHEETS[i].columns.length);
    sheet.data.forEach((row) => assert.equal(row.length, SHEETS[i].columns.length));
  });
});

test('cabecera en negrita y filas por registro; hoja vacía solo cabecera', () => {
  const sheets = toWorkbookSheets(sample);
  assert.equal(sheets[0].data[0][2].value, 'Proyecto');
  assert.equal(sheets[0].data[0][2].fontWeight, 'bold');
  assert.equal(sheets[0].data.length, 2);
  assert.equal(sheets[3].data.length, 1);
  const empty = toWorkbookSheets(null);
  assert.ok(empty.every((s) => s.data.length === 1));
});

test('tipos de celda: números, importes, fechas, vacíos, booleanos y semáforo', () => {
  const [proyectos, acciones, presupuesto, , certs] = toWorkbookSheets(sample);
  const p = proyectos.data[1];
  assert.deepEqual(p[0], { value: 1, type: Number, format: '0' });
  assert.equal(p[1], null); // código vacío
  const fecha = p[15];
  assert.equal(fecha.type, Date);
  assert.equal(fecha.format, 'dd/mm/yyyy');
  assert.equal(fecha.value.toISOString(), '2027-01-31T00:00:00.000Z');
  assert.equal(p[16].value, 'Atención');
  const b = presupuesto.data[1];
  assert.deepEqual(b[9], { value: 52716, type: Number, format: '#,##0.00' });
  assert.equal(b[10], null); // real null
  assert.equal(acciones.data[1][7].value, 'No');
  assert.equal(certs.data[1][7], null); // fechaInforme ''
});

test('toCell y excelDate', () => {
  assert.equal(toCell('abc', 'int'), null);
  assert.equal(toCell('12,5', 'dec'), null);
  assert.deepEqual(toCell('12.5', 'dec'), { value: 12.5, type: Number, format: '#,##0.##' });
  assert.deepEqual(toCell(true, 'bool'), { value: 'Sí', type: String });
  assert.deepEqual(toCell(42, 'text'), { value: '42', type: String });
  assert.equal(excelDate('2026-02-30x'), null);
  assert.equal(excelDate(''), null);
});

test('buildSheetRows con columnas propias', () => {
  const rows = buildSheetRows({ columns: [['A', 'a', 'text', 5]] }, [{ a: 'x' }, { a: '' }]);
  assert.equal(rows.length, 3);
  assert.equal(rows[2][0], null);
});

test('exportFileName', () => {
  assert.equal(exportFileName('2026-10-29'), 'Safety-Desarrollo_2026-10-29.xlsx');
  assert.equal(exportFileName('2026-10-29T10:00:00.000Z'), 'Safety-Desarrollo_2026-10-29.xlsx');
  assert.equal(exportFileName(), 'Safety-Desarrollo_export.xlsx');
});
