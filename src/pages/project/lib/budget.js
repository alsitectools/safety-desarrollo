// Cálculos de presupuesto de la ficha (previsto/real/desviación). Misma regla que safetyDev.domain.js:
// previsto = unidades × precioUnitario + porte si hay unidades y precio; si no, el previsto manual. Sin conversión de divisa.

const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

function numOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function plannedAmount(line) {
  const unidades = numOrNull(line?.unidades);
  const precio = numOrNull(line?.precioUnitario);
  if (unidades !== null && precio !== null) {
    return round2(unidades * precio + (numOrNull(line?.porte) || 0));
  }
  const manual = numOrNull(line?.previsto);
  return manual === null ? null : round2(manual);
}

// true si el previsto lo calcula el servidor (el usuario no lo introduce).
export function isPlannedComputed(line) {
  return numOrNull(line?.unidades) !== null && numOrNull(line?.precioUnitario) !== null;
}

// Desviación de una partida: real − previsto si hay real; si no, null.
export function lineDeviation(line) {
  const real = numOrNull(line?.real);
  if (real === null) return null;
  return round2(real - (plannedAmount(line) || 0));
}

// Desviación relativa (%) respecto al previsto; null si no hay real o el previsto es 0.
export function deviationPct(previsto, real) {
  const p = numOrNull(previsto);
  const r = numOrNull(real);
  if (p === null || r === null || p === 0) return null;
  return round2(((r - p) / p) * 100);
}

// 'sobre' (gasta más de lo previsto), 'bajo' o 'neutro'.
export function deviationTone(deviation) {
  const value = numOrNull(deviation);
  if (value === null || value === 0) return 'neutro';
  return value > 0 ? 'sobre' : 'bajo';
}

function emptyTotals() {
  return { previsto: 0, real: 0, desviacion: 0, lineas: 0 };
}

function addLine(bucket, line) {
  bucket.previsto = round2(bucket.previsto + (plannedAmount(line) || 0));
  bucket.real = round2(bucket.real + (numOrNull(line?.real) || 0));
  bucket.desviacion = round2(bucket.real - bucket.previsto);
  bucket.lineas += 1;
}

function currencyOf(line) {
  return String(line?.moneda || 'EUR').trim().toUpperCase() || 'EUR';
}

// { EUR: { previsto, real, desviacion, lineas } } — respaldo local si la respuesta no trae totales.
export function totalsByCurrency(lines) {
  const totals = {};
  for (const line of lines || []) {
    const moneda = currencyOf(line);
    if (!totals[moneda]) totals[moneda] = emptyTotals();
    addLine(totals[moneda], line);
  }
  return totals;
}

// { tipo: { EUR: {...} } }
export function totalsByType(lines) {
  const totals = {};
  for (const line of lines || []) {
    const tipo = line?.tipo || 'otros';
    const moneda = currencyOf(line);
    if (!totals[tipo]) totals[tipo] = {};
    if (!totals[tipo][moneda]) totals[tipo][moneda] = emptyTotals();
    addLine(totals[tipo][moneda], line);
  }
  return totals;
}

// Filas para la tabla de totales por tipo: [{ tipo, moneda, previsto, real, desviacion, lineas }], en el orden de tipos dado.
export function typeTotalsRows(totalsByTypeMap, tipoOrder = []) {
  const map = totalsByTypeMap || {};
  const tipos = [...tipoOrder.filter((tipo) => map[tipo]), ...Object.keys(map).filter((tipo) => !tipoOrder.includes(tipo))];
  const rows = [];
  for (const tipo of tipos) {
    for (const moneda of Object.keys(map[tipo]).sort()) {
      rows.push({ tipo, moneda, ...map[tipo][moneda] });
    }
  }
  return rows;
}
