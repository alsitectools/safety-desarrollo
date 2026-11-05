// Agregados del panel a partir de GET /summary (puros, sin React). Las etiquetas salen en el idioma activo al llamar.
import { currencyRows, phaseLabelOf } from './format.js';
import { t } from '../i18n/core.js';
import { familyName } from '../i18n/labels.js';

/**
 * Barras por fase agrupadas por camino:
 * [{ camino, label, total, bars: [{ fase, label, count, pct }] }] con pct relativo al máximo global (0..100).
 */
export function phaseBars(porFase, catalog) {
  const rows = Array.isArray(porFase) ? porFase : [];
  const max = rows.reduce((m, row) => Math.max(m, Number(row.count) || 0), 0);
  const caminos = (catalog && catalog.caminos) || [...new Set(rows.map((row) => row.camino))];
  return caminos.map((camino) => {
    const bars = rows
      .filter((row) => row.camino === camino)
      .map((row) => {
        const count = Number(row.count) || 0;
        return {
          fase: row.fase,
          label: t(`catalog.phase.${row.fase}`, { defaultValue: row.label || phaseLabelOf(catalog, row.fase) }),
          count,
          pct: max ? Math.round((count / max) * 1000) / 10 : 0,
        };
      });
    return {
      camino,
      label: t(`catalog.camino.${camino}`, { defaultValue: (catalog && catalog.caminoLabels && catalog.caminoLabels[camino]) || camino }),
      total: bars.reduce((sum, bar) => sum + bar.count, 0),
      bars,
    };
  });
}

/** Barras por familia: [{ familyCode, nombre, count, pct }] con pct relativo al máximo. */
export function familyBars(porFamilia) {
  const rows = Array.isArray(porFamilia) ? porFamilia : [];
  const max = rows.reduce((m, row) => Math.max(m, Number(row.count) || 0), 0);
  return rows.map((row) => ({
    familyCode: row.familyCode,
    nombre: familyName({ code: row.familyCode, nombre: row.nombre }),
    count: Number(row.count) || 0,
    pct: max ? Math.round(((Number(row.count) || 0) / max) * 1000) / 10 : 0,
  }));
}

/**
 * Previsto vs real por moneda con % ejecutado:
 * [{ currency, previsto, real, desviacion, lineas, pctReal }] (pctReal = real/previsto*100, null si previsto 0).
 */
export function budgetRows(presupuesto) {
  return currencyRows(presupuesto).map((row) => ({
    ...row,
    pctReal: row.previsto ? Math.round((row.real / row.previsto) * 1000) / 10 : null,
  }));
}

/** Semáforos en orden fijo con etiqueta: [{ key, label, count }]. */
export function signalRows(semaforos) {
  return ['verde', 'ambar', 'rojo', 'gris'].map((key) => ({
    key,
    label: t(`app.signal.${key}`),
    count: Number(semaforos && semaforos[key]) || 0,
  }));
}

/** Agrupa las próximas fechas por horizonte: esta semana (≤7), este mes (≤30), más adelante. */
export function groupUpcoming(proximasFechas) {
  const groups = [
    { key: 'semana', label: t('app.upcoming.week'), items: [] },
    { key: 'mes', label: t('app.upcoming.month'), items: [] },
    { key: 'despues', label: t('app.upcoming.later'), items: [] },
  ];
  (proximasFechas || []).forEach((item) => {
    const dias = Number(item.dias);
    if (dias <= 7) groups[0].items.push(item);
    else if (dias <= 30) groups[1].items.push(item);
    else groups[2].items.push(item);
  });
  return groups.filter((group) => group.items.length);
}
