import { useMemo, useState } from 'react';
import { listProjects } from '../api/index.js';
import { useAsync } from '../hooks/useAsync.js';
import { PageHead } from '../components/Layout.jsx';
import { EmptyState, ErrorBox, Loading } from '../components/States.jsx';
import { Badge, Initials, PriorityBadge, Semaforo } from '../components/Badge.jsx';
import ProjectFilters from './ProjectFilters.jsx';
import { formatDate, labelOf, phaseLabelOf } from '../lib/format.js';
import { familyNameMap, groupKanban, peopleById, projectResponsables } from '../lib/projects.js';
import { buildHash } from '../lib/router.js';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { caminoLabel, familyName } from '../i18n/labels.js';

export default function Kanban({ boot, navigate, query }) {
  const { t, lang } = useI18n();
  const { catalog } = boot;
  const [filters, setFilters] = useState({
    familia: query.familia || '',
    responsable: query.responsable || '',
    estado: query.estado ?? 'activo',
  });
  const result = useAsync(() => listProjects(filters), [filters.familia, filters.responsable, filters.estado]);
  const projects = result.data?.projects;

  const lanes = useMemo(() => (projects ? groupKanban(projects, catalog) : []), [projects, catalog, lang]);
  const people = useMemo(() => peopleById(boot.people), [boot.people]);
  const families = useMemo(() => familyNameMap(boot.families), [boot.families, lang]);

  return (
    <>
      <PageHead title={t('kanban.title')} subtitle={t('kanban.subtitle')} />
      <ProjectFilters boot={boot} value={filters} onChange={setFilters} show={['familia', 'responsable', 'estado']} />

      {result.error && <ErrorBox error={result.error} onRetry={result.reload} />}
      {!projects && result.loading && <Loading />}

      {projects && projects.length === 0 && (
        <div className="card">
          <EmptyState icon="🗂️" title={t('kanban.empty')} />
        </div>
      )}

      {projects && projects.length > 0 && (
        <div style={{ opacity: result.loading ? 0.6 : 1 }}>
          {lanes.map((lane) => (
            <section className="lane" key={lane.camino} aria-labelledby={`lane-${lane.camino}`}>
              <div className="lane__head">
                <h2 id={`lane-${lane.camino}`}>{caminoLabel(lane.camino, lane.label)}</h2>
                <Badge tone={lane.camino === 'oem' ? 'oem' : 'green'}>{lane.total}</Badge>
              </div>
              <div className={`kanban-cols kanban-cols--${lane.columns.length}`}>
                {lane.columns.map((column) => (
                  <div className={`kanban-col${lane.camino === 'oem' ? ' kanban-col--oem' : ''}`} key={column.fase}>
                    <div className="kanban-col__head">
                      <span>{phaseLabelOf(catalog, column.fase)}</span>
                      <span className="muted">{column.projects.length}</span>
                    </div>
                    {column.projects.length === 0 && <div className="kanban-col__empty">{t('kanban.columnEmpty')}</div>}
                    {column.projects.map((project) => (
                      <KanbanCard
                        key={project.id}
                        project={project}
                        familyLabel={familyName({ code: project.familyCode, nombre: families[project.familyCode] })}
                        slots={projectResponsables(project, people)}
                        catalog={catalog}
                        onOpen={() => navigate(buildHash('proyecto', project.id))}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

function KanbanCard({ project, familyLabel, slots, catalog, onOpen }) {
  const { t } = useI18n();
  const kpis = project.kpis || {};
  const signal = kpis.semaforo || 'gris';
  const fecha = project.faseFechaObjetivo && (!project.fechaObjetivo || project.faseFechaObjetivo < project.fechaObjetivo)
    ? project.faseFechaObjetivo
    : project.fechaObjetivo;
  return (
    <button type="button" className={`kcard kcard--${signal}`} onClick={onOpen}>
      <div className="kcard__top">
        <span className="kcard__name">{project.nombre}</span>
        <Semaforo value={signal} />
      </div>
      <div className="kcard__family">
        {project.codigo && <span className="kcard__code">{project.codigo} · </span>}
        {familyLabel || project.familyCode}
      </div>
      <div className="kcard__foot">
        <Initials slots={slots} />
        <span className="row" style={{ gap: 4 }}>
          {project.estado !== 'activo' && <Badge tone="grey">{labelOf(catalog, 'projectEstado', project.estado)}</Badge>}
          <PriorityBadge value={project.prioridad} label={labelOf(catalog, 'prioridad', project.prioridad)} />
        </span>
      </div>
      <div className="kcard__meta">
        {fecha && <span title={t('kanban.card.nextTargetDate')}>🎯 {formatDate(fecha)}</span>}
        {kpis.accionesAbiertas > 0 && (
          <span style={kpis.accionesVencidas ? { color: 'var(--red)', fontWeight: 600 } : undefined}>
            ✔ {t('kanban.card.openActions', { count: kpis.accionesAbiertas })}
            {kpis.accionesVencidas ? ` · ${t('kanban.card.overdueActions', { count: kpis.accionesVencidas })}` : ''}
          </span>
        )}
        {kpis.entregablesFaseTotal > 0 && (
          <span title={t('kanban.card.phaseDeliverables')}>📋 {kpis.entregablesFaseHechos}/{kpis.entregablesFaseTotal}</span>
        )}
      </div>
    </button>
  );
}
