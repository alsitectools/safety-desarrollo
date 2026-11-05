import { useEffect, useMemo, useRef, useState } from 'react';
import { listProjects } from '../api/index.js';
import { getProject } from '../api/project.js';
import { useAsync } from '../hooks/useAsync.js';
import { PageHead } from '../components/Layout.jsx';
import { EmptyState, ErrorBox, Loading } from '../components/States.jsx';
import PhasePill from '../components/PhasePill.jsx';
import ProjectFilters from './ProjectFilters.jsx';
import { formatDate, phaseLabelOf } from '../lib/format.js';
import { sortProjects } from '../lib/projects.js';
import { buildGanttRows, fromDay, ganttRange, monthsInRange, toDay } from '../lib/gantt.js';
import { buildHash } from '../lib/router.js';
import { useI18n } from '../i18n/I18nProvider.jsx';
import '../styles/gantt.css';

const FILTER_KEYS = ['familia', 'camino', 'estado', 'responsable'];
// Píxeles por día de cada escala.
const ZOOMS = { compact: 1.5, normal: 3.5, wide: 8 };
const CONCURRENCY = 6;

/** Carga la ficha de cada proyecto (para sus fases) con pocas peticiones a la vez. */
async function loadPhases(projects, onProgress) {
  const result = new Array(projects.length);
  let next = 0;
  let done = 0;
  async function worker() {
    while (next < projects.length) {
      const index = next++;
      const detail = await getProject(projects[index].id);
      result[index] = { ...projects[index], phases: detail.phases || [] };
      onProgress(++done);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, projects.length) }, worker));
  return result;
}

export default function Gantt({ boot, navigate, query }) {
  const { t, lang } = useI18n();
  const { catalog } = boot;
  const [filters, setFilters] = useState(() => Object.fromEntries(FILTER_KEYS.map((key) => [key, query[key] || ''])));
  const [zoom, setZoom] = useState(ZOOMS[query.escala] ? query.escala : 'normal');
  const [showUndated, setShowUndated] = useState(query.sinFechas !== '0');
  const [progress, setProgress] = useState(null);
  const filterKey = JSON.stringify(filters);

  const result = useAsync(async () => {
    const { projects } = await listProjects(filters);
    setProgress({ done: 0, total: projects.length });
    return loadPhases(projects, (done) => setProgress({ done, total: projects.length }));
  }, [filterKey]);

  useEffect(() => {
    const hash = buildHash('gantt', null, { ...filters, escala: zoom === 'normal' ? '' : zoom, sinFechas: showUndated ? '' : '0' });
    if (window.location.hash !== hash) window.history.replaceState(null, '', hash);
  }, [filterKey, zoom, showUndated]); // eslint-disable-line react-hooks/exhaustive-deps

  const today = toDay(boot.today) ?? toDay(new Date().toISOString());
  const rows = useMemo(() => {
    const sorted = sortProjects(result.data || [], 'prioridad', 'asc', { phasesByCamino: catalog.phasesByCamino });
    return buildGanttRows(sorted, today);
  }, [result.data, catalog.phasesByCamino, today]);
  const dated = rows.filter((row) => row.hasDates);
  const undated = rows.filter((row) => !row.hasDates);
  const range = useMemo(() => ganttRange(dated, today), [dated, today]);
  const months = useMemo(() => monthsInRange(range), [range]);
  const pxDay = ZOOMS[zoom];
  const width = Math.round(range.days * pxDay);
  const x = (day) => Math.round((day - range.start) * pxDay);

  const monthFormat = useMemo(() => {
    const locale = { es: 'es-ES', ca: 'ca-ES', en: 'en-GB', fr: 'fr-FR', de: 'de-DE', it: 'it-IT', pt: 'pt-PT', pl: 'pl-PL', ro: 'ro-RO' }[lang] || 'es-ES';
    return {
      short: new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }),
      long: new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }),
    };
  }, [lang]);

  // Al cargar, el scroll horizontal se coloca un poco antes de hoy.
  const scroller = useRef(null);
  useEffect(() => {
    if (scroller.current && dated.length) scroller.current.scrollLeft = Math.max(0, x(today) - 160);
  }, [dated.length, zoom]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasFilters = FILTER_KEYS.some((key) => filters[key]);
  const open = (project, tab) => navigate(buildHash('proyecto', project.id, tab ? { tab } : {}));
  const phaseName = (fase) => phaseLabelOf(catalog, fase);

  function segmentTitle(seg) {
    const parts = [
      t('gantt.bar', { phase: phaseName(seg.fase), start: formatDate(fromDay(seg.start)), end: formatDate(fromDay(seg.end)) }),
      t(`gantt.legend.${seg.kind}`),
    ];
    if (seg.estimatedStart && !seg.milestone) parts.push(t('gantt.legend.estimated'));
    if (seg.noTarget) parts.push(t('gantt.noTarget'));
    if (seg.late) parts.push(t('gantt.lateSince', { date: formatDate(fromDay(seg.end)) }));
    return parts.join(' · ');
  }

  return (
    <>
      <PageHead
        title={t('gantt.title')}
        subtitle={result.data ? t('gantt.count', { count: rows.length, dated: dated.length }) : t('gantt.subtitle')}
        actions={(
          <div className="gantt-zoom" role="group" aria-label={t('gantt.zoom')}>
            {Object.keys(ZOOMS).map((key) => (
              <button
                key={key}
                type="button"
                className={`btn btn--sm${zoom === key ? ' btn--primary' : ''}`}
                aria-pressed={zoom === key}
                onClick={() => setZoom(key)}
              >
                {t(`gantt.zoomLevels.${key}`)}
              </button>
            ))}
          </div>
        )}
      />

      <ProjectFilters
        boot={boot}
        value={filters}
        onChange={setFilters}
        show={FILTER_KEYS}
        extra={(
          <div className="field gantt-filters-extra">
            <label className="gantt-check">
              <input type="checkbox" checked={showUndated} onChange={(event) => setShowUndated(event.target.checked)} />
              {t('gantt.showUndated')}
            </label>
            {hasFilters && (
              <button type="button" className="btn btn--ghost" onClick={() => setFilters(Object.fromEntries(FILTER_KEYS.map((key) => [key, ''])))}>
                {t('common.clearFilters')}
              </button>
            )}
          </div>
        )}
      />

      {result.error && <ErrorBox error={result.error} onRetry={result.reload} />}
      {!result.data && result.loading && (
        <Loading label={progress && progress.total ? t('gantt.loading', { done: progress.done, total: progress.total }) : undefined} />
      )}
      {result.data && rows.length === 0 && <EmptyState title={t('gantt.empty')} />}

      {result.data && dated.length > 0 && (
        <>
          <ul className="gantt-legend" aria-label={t('gantt.legendTitle')}>
            {['done', 'current', 'planned', 'late'].map((kind) => (
              <li key={kind}><span className={`gantt-legend__swatch gantt-legend__swatch--${kind}`} aria-hidden="true" />{t(`gantt.legend.${kind}`)}</li>
            ))}
            <li><span className="gantt-legend__diamond" aria-hidden="true">◆</span>{t('gantt.legend.target')}</li>
            <li><span className="gantt-legend__today" aria-hidden="true" />{t('gantt.today')}</li>
          </ul>

          <div className="gantt" ref={scroller} style={{ '--gantt-w': `${width}px` }}>
            <div className="gantt__row gantt__row--head">
              <div className="gantt__label gantt__label--head">{t('gantt.project')}</div>
              <div className="gantt__track gantt__track--head">
                {months.map((month) => (
                  <div
                    key={month.start}
                    className={`gantt__month${month.month === 0 ? ' gantt__month--year' : ''}`}
                    style={{ left: x(month.start), width: Math.round(month.days * pxDay) }}
                    title={monthFormat.long.format(new Date(month.start * 86400000))}
                  >
                    {month.days * pxDay >= 34 ? monthFormat.short.format(new Date(month.start * 86400000)) : ''}
                    {(month.month === 0 || month.start === range.start) && month.days * pxDay >= 34 ? ` ${String(month.year).slice(2)}` : ''}
                  </div>
                ))}
                <span className="gantt__today-flag" style={{ left: x(today) }}>{t('gantt.today')}</span>
              </div>
            </div>

            {dated.map(({ project, segments, target }) => (
              <div key={project.id} className={`gantt__row${project.estado !== 'activo' ? ' gantt__row--muted' : ''}`}>
                <a
                  className="gantt__label"
                  href={buildHash('proyecto', project.id)}
                  onClick={(event) => { event.preventDefault(); open(project); }}
                  title={project.nombre}
                >
                  <span className="gantt__name">{project.nombre}</span>
                  <PhasePill fase={project.faseActual} label={phaseName(project.faseActual)} camino={project.camino} estado="en_curso" />
                </a>
                <div className="gantt__track" onClick={() => open(project, 'fases')} role="presentation">
                  {months.map((month) => (
                    <span key={month.start} className="gantt__grid" style={{ left: x(month.start) }} />
                  ))}
                  <span className="gantt__today" style={{ left: x(today) }} />
                  {segments.map((seg) => (
                    <span key={seg.fase} className="gantt__seg-wrap">
                      {seg.milestone ? (
                        <span className="gantt__milestone" style={{ left: x(seg.end) }} title={segmentTitle(seg)} />
                      ) : (
                        <span
                          className={[
                            'gantt__bar',
                            `gantt__bar--${seg.kind}`,
                            project.camino === 'oem' ? 'gantt__bar--oem' : '',
                            seg.late ? 'gantt__bar--late' : '',
                            seg.estimatedStart ? 'gantt__bar--estimated' : '',
                            seg.noTarget ? 'gantt__bar--open' : '',
                          ].join(' ')}
                          style={{ left: x(seg.start), width: Math.max(seg.noTarget ? 48 : 6, x(seg.end) - x(seg.start)) }}
                          title={segmentTitle(seg)}
                        >
                          {x(seg.end) - x(seg.start) > 70 ? phaseName(seg.fase) : ''}
                        </span>
                      )}
                      {seg.overdueTo && (
                        <span
                          className="gantt__overdue"
                          style={{ left: x(seg.end), width: Math.max(2, x(seg.overdueTo) - x(seg.end)) }}
                          title={t('gantt.lateSince', { date: formatDate(fromDay(seg.end)) })}
                        />
                      )}
                    </span>
                  ))}
                  {target !== null && (
                    <span
                      className="gantt__target"
                      style={{ left: x(target) }}
                      title={`${t('gantt.legend.target')}: ${formatDate(fromDay(target))}`}
                    >
                      ◆
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="gantt-hint">{t('gantt.hint')}</p>
        </>
      )}

      {result.data && showUndated && undated.length > 0 && (
        <section className="card gantt-undated">
          <h2 className="gantt-undated__title">{t('gantt.undatedTitle', { count: undated.length })}</h2>
          <p className="gantt-undated__hint">{t('gantt.undatedHint')}</p>
          <ul className="gantt-undated__list">
            {undated.map(({ project }) => (
              <li key={project.id}>
                <span className="gantt-undated__name">{project.nombre}</span>
                <PhasePill fase={project.faseActual} label={phaseName(project.faseActual)} camino={project.camino} estado="en_curso" />
                <a
                  className="btn btn--sm"
                  href={buildHash('proyecto', project.id, { tab: 'fases' })}
                  onClick={(event) => { event.preventDefault(); open(project, 'fases'); }}
                >
                  {t('gantt.setDates')}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
