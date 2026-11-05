// Cálculo de la vista Gantt (puro, sin React): barras por fase a partir de las fechas de cada fase del proyecto.
// Fechas en días UTC desde 1970 para no depender de la zona horaria.

const DAY_MS = 86400000;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})/;

/** 'YYYY-MM-DD' → nº de día (UTC) o null */
export function toDay(value) {
  const match = DATE_RE.exec(String(value || ''));
  if (!match) return null;
  return Math.round(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / DAY_MS);
}

/** nº de día → 'YYYY-MM-DD' */
export function fromDay(day) {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

/**
 * Barras de un proyecto. phases en orden; cada barra:
 * { fase, estado, start, end, kind: 'done'|'current'|'planned', milestone, late, overdueTo, estimatedStart }
 * - hecha: necesita fin (fechaFin u objetivo); sin inicio se pinta como hito.
 * - en curso: de inicio (o fin de la fase anterior, o hoy) a fin/objetivo; si el objetivo ya pasó, se marca el retraso hasta hoy.
 * - pendiente: solo si tiene fecha objetivo; empieza donde acaba la anterior (o hoy).
 */
export function phaseSegments(phases, today) {
  const segments = [];
  let cursor = null;
  for (const phase of phases || []) {
    if (phase.estado === 'saltada') continue;
    const inicio = toDay(phase.fechaInicio);
    const fin = toDay(phase.fechaFin);
    const objetivo = toDay(phase.fechaObjetivo);
    let segment = null;

    if (phase.estado === 'hecha') {
      const end = fin ?? objetivo;
      if (end !== null) {
        const start = inicio ?? end;
        segment = { start: Math.min(start, end), end, kind: 'done', milestone: inicio === null, estimatedStart: false };
      } else if (inicio !== null) {
        segment = { start: inicio, end: inicio, kind: 'done', milestone: true, estimatedStart: false };
      }
    } else if (phase.estado === 'en_curso') {
      const end = fin ?? objetivo;
      let start = inicio ?? cursor;
      const estimatedStart = inicio === null;
      if (end === null) {
        // Sin objetivo: barra abierta desde el inicio hasta hoy (la vista la alarga y la difumina).
        if (start !== null && start <= today) segment = { start, end: today, kind: 'current', noTarget: true, estimatedStart };
      } else {
        if (start === null) start = Math.min(today, end);
        segment = { start: Math.min(start, end), end, kind: 'current', estimatedStart };
        if (fin === null && end < today) {
          segment.late = true;
          segment.overdueTo = today;
        }
      }
    } else if (objetivo !== null) {
      let start = inicio ?? cursor ?? today;
      if (inicio === null && start < today && cursor !== null && cursor < today) start = today;
      segment = { start: Math.min(start, objetivo), end: objetivo, kind: 'planned', estimatedStart: inicio === null };
      if (objetivo < today) segment.late = true;
    }

    if (segment) {
      segments.push({ fase: phase.fase, estado: phase.estado, ...segment });
      cursor = Math.max(cursor ?? segment.end, segment.overdueTo ?? segment.end);
    }
  }
  return segments;
}

/** Filas del Gantt: [{ project, segments, target, hasDates }] */
export function buildGanttRows(projects, today) {
  return (projects || []).map((project) => {
    const segments = phaseSegments(project.phases, today);
    const target = toDay(project.fechaObjetivo);
    return { project, segments, target, hasDates: segments.length > 0 || target !== null };
  });
}

/** Rango visible: desde el 1 del mes (hoy − 1 mes o la barra más temprana) hasta el fin del mes del último hito (mín. hoy + 6 meses). */
export function ganttRange(rows, today) {
  let min = today - 30;
  let max = today + 182;
  for (const row of rows) {
    for (const seg of row.segments) {
      min = Math.min(min, seg.start);
      max = Math.max(max, seg.end, seg.overdueTo ?? seg.end);
    }
    if (row.target !== null) {
      min = Math.min(min, row.target);
      max = Math.max(max, row.target);
    }
  }
  const first = new Date(min * DAY_MS);
  const last = new Date(max * DAY_MS);
  const start = Math.round(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1) / DAY_MS);
  const end = Math.round(Date.UTC(last.getUTCFullYear(), last.getUTCMonth() + 1, 1) / DAY_MS);
  return { start, end, days: end - start };
}

/** Meses del rango: [{ start, days, year, month }] (month 0-11) */
export function monthsInRange(range) {
  const months = [];
  let day = range.start;
  while (day < range.end) {
    const date = new Date(day * DAY_MS);
    const next = Math.round(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1) / DAY_MS);
    months.push({ start: day, days: Math.min(next, range.end) - day, year: date.getUTCFullYear(), month: date.getUTCMonth() });
    day = next;
  }
  return months;
}
