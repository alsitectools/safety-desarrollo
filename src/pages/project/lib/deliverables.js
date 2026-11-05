// Entregables por fase y avisos de paso de fase (puro).

const isDone = (item) => item?.hecho === true || Number(item?.hecho) === 1;

// Entregables obligatorios sin marcar de una fase.
export function pendingMandatory(deliverables, fase) {
  return (deliverables || []).filter((item) => item.fase === fase && item.obligatorio && !isDone(item));
}

// Entregables agrupados por fase en el orden de `phases` (lista de códigos de fase); las fases sin entregables salen con lista vacía.
export function groupByPhase(deliverables, phases) {
  const groups = {};
  for (const fase of phases || []) groups[fase] = [];
  for (const item of deliverables || []) {
    if (!groups[item.fase]) groups[item.fase] = [];
    groups[item.fase].push(item);
  }
  for (const fase of Object.keys(groups)) {
    groups[fase].sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0) || (Number(a.id) || 0) - (Number(b.id) || 0));
  }
  return groups;
}

// { hechos, total, obligatoriosPendientes, pct } de una lista de entregables.
export function progress(deliverables) {
  const list = deliverables || [];
  const hechos = list.filter(isDone).length;
  return {
    hechos,
    total: list.length,
    obligatoriosPendientes: list.filter((item) => item.obligatorio && !isDone(item)).length,
    pct: list.length ? Math.round((hechos / list.length) * 100) : 0,
  };
}

// Aviso para «Pasar a…»: solo al avanzar se miran los obligatorios pendientes de la fase actual.
// Igual que domain.canAdvance: el comentario es obligatorio si quedan obligatorios sin marcar en la fase ACTUAL.
// Las fases intermedias que se saltan solo se informan (pendientesSaltadas).
// Devuelve { direction: 'avance'|'retroceso'|'igual'|'invalida', pendientes, pendientesSaltadas, requiresComment }.
export function advanceWarning({ phases, from, to, deliverables }) {
  const order = phases || [];
  const fromIdx = order.indexOf(from);
  const toIdx = order.indexOf(to);
  const none = { pendientes: [], pendientesSaltadas: [], requiresComment: false };
  if (toIdx < 0) return { direction: 'invalida', ...none };
  if (toIdx === fromIdx) return { direction: 'igual', ...none };
  if (toIdx < fromIdx) return { direction: 'retroceso', ...none };
  const pendientes = pendingMandatory(deliverables, from);
  const skipped = order.slice(fromIdx + 1, toIdx);
  const pendientesSaltadas = skipped.flatMap((fase) => pendingMandatory(deliverables, fase));
  return { direction: 'avance', pendientes, pendientesSaltadas, requiresComment: pendientes.length > 0 };
}

export { isDone };
