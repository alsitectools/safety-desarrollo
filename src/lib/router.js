// Router por hash: #/panel, #/kanban, #/gantt, #/lista?fase=mvp, #/proyecto/12, #/fabricantes/7, #/config

export const ROUTES = ['panel', 'kanban', 'gantt', 'lista', 'proyecto', 'fabricantes', 'config'];

/** '#/proyecto/12?tab=fases' → { name: 'proyecto', id: '12', query: { tab: 'fases' } }. Desconocido → panel. */
export function parseHash(hash) {
  const raw = String(hash || '').replace(/^#\/?/, '');
  const [pathPart, queryPart = ''] = raw.split('?');
  const segments = pathPart.split('/').filter(Boolean).map((s) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  });
  const query = {};
  new URLSearchParams(queryPart).forEach((value, key) => {
    query[key] = value;
  });
  const name = ROUTES.includes(segments[0]) ? segments[0] : 'panel';
  const id = name === segments[0] && segments[1] ? segments[1] : null;
  if (name === 'proyecto' && !id) return { name: 'lista', id: null, query: {} };
  return { name, id, query };
}

/** buildHash('lista', null, { fase: 'mvp', q: '' }) → '#/lista?fase=mvp' */
export function buildHash(name, id = null, query = {}) {
  const search = new URLSearchParams();
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  });
  const qs = search.toString();
  return `#/${name}${id !== null && id !== undefined ? `/${encodeURIComponent(id)}` : ''}${qs ? `?${qs}` : ''}`;
}
