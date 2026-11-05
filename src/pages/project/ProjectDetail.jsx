// Ficha de proyecto con pestañas (spec §7.4). Los permisos vienen de GET /projects/:id (permissions);
// el frontend solo oculta botones, la API comprueba siempre.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getProject } from '../../api/project.js';
import { parseHash, buildHash } from '../../lib/router.js';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { familyName } from '../../i18n/labels.js';
import { Badge, ErrorMessage } from './ui.jsx';
import { caminoLabel, enumLabel, phaseLabel } from './lib/format.js';
import ResumenTab from './tabs/ResumenTab.jsx';
import FasesTab from './tabs/FasesTab.jsx';
import ProductosTab from './tabs/ProductosTab.jsx';
import FabricantesTab from './tabs/FabricantesTab.jsx';
import PresupuestoTab from './tabs/PresupuestoTab.jsx';
import CertificacionesTab from './tabs/CertificacionesTab.jsx';
import AccionesTab from './tabs/AccionesTab.jsx';
import DocumentosTab from './tabs/DocumentosTab.jsx';
import HistorialTab from './tabs/HistorialTab.jsx';
import './project.css';

// La etiqueta de cada pestaña es t('project.detail.tabs.<key>').
const TABS = [
  { key: 'resumen', Component: ResumenTab },
  { key: 'fases', Component: FasesTab },
  { key: 'productos', Component: ProductosTab },
  { key: 'fabricantes', Component: FabricantesTab },
  { key: 'presupuesto', Component: PresupuestoTab },
  { key: 'certificaciones', Component: CertificacionesTab },
  { key: 'acciones', Component: AccionesTab },
  { key: 'documentos', Component: DocumentosTab },
  { key: 'historial', Component: HistorialTab },
];

const SIGNAL_TONES = { verde: 'ok', ambar: 'warn', rojo: 'danger', gris: 'neutral' };
const PRIORITY_TONES = { alta: 'danger', media: 'warn', baja: 'neutral' };

function initialTab() {
  try {
    const tab = parseHash(window.location.hash).query.tab;
    return TABS.some((item) => item.key === tab) ? tab : 'resumen';
  } catch {
    return 'resumen';
  }
}

function tabCount(key, data) {
  if (!data) return null;
  switch (key) {
    case 'productos':
      return data.products?.length || 0;
    case 'fabricantes':
      return data.suppliers?.length || 0;
    case 'certificaciones':
      return data.certifications?.length || 0;
    case 'acciones':
      return data.kpis?.accionesAbiertas ?? null;
    case 'documentos':
      return data.documents?.length || 0;
    default:
      return null;
  }
}

export default function ProjectDetail({ id, boot, navigate }) {
  const { t } = useI18n();
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [tab, setTab] = useState(initialTab);
  const seq = useRef(0);

  // reload() mantiene la ficha visible mientras recarga (tras cada guardado).
  const reload = useCallback(async () => {
    const current = ++seq.current;
    setState((prev) => ({ ...prev, loading: true, error: prev.data ? null : prev.error }));
    try {
      const data = await getProject(id);
      if (current === seq.current) setState({ data, error: null, loading: false });
      return data;
    } catch (error) {
      if (current === seq.current) setState((prev) => ({ ...prev, error, loading: false }));
      return null;
    }
  }, [id]);

  useEffect(() => {
    setState({ data: null, error: null, loading: true });
    reload();
  }, [reload]);

  const changeTab = (key) => {
    setTab(key);
    try {
      window.history.replaceState(null, '', buildHash('proyecto', id, key === 'resumen' ? {} : { tab: key }));
    } catch {
      // sin history (pruebas)
    }
  };

  const { data, error, loading } = state;
  const catalog = boot?.catalog || {};

  const ctx = useMemo(() => {
    if (!data) return null;
    const project = data.project;
    const family = (boot?.families || []).find((item) => item.code === project.familyCode) || null;
    return {
      id,
      data,
      project,
      boot,
      catalog,
      today: boot?.today,
      perms: data.permissions || { role: data.role },
      role: data.role,
      family,
      familyFields: [...(family?.fields || [])].map((field) => ({ familyCode: family.code, ...field })).sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0)),
      phasesOfCamino: catalog.phasesByCamino?.[project.camino] || (data.phases || []).map((phase) => phase.fase),
      people: boot?.people || [],
      suppliers: boot?.suppliers || [],
      reload,
      navigate,
    };
  }, [data, boot, catalog, id, reload, navigate]);

  if (!data) {
    if (error) {
      const notFound = error.status === 404;
      return (
        <div className="pd">
          <button type="button" className="pd-back" onClick={() => navigate?.('lista')}>
            {t('project.detail.backToProjects')}
          </button>
          <ErrorMessage error={notFound ? t('project.detail.notFound') : error} />
          {!notFound ? (
            <button type="button" className="pd-btn" onClick={reload}>
              {t('common.retry')}
            </button>
          ) : null}
        </div>
      );
    }
    return (
      <div className="pd">
        <div className="pd-loading" role="status">
          {t('project.detail.loading')}
        </div>
      </div>
    );
  }

  const { project, kpis } = data;
  const active = TABS.find((item) => item.key === tab) || TABS[0];
  const ActiveTab = active.Component;
  const signal = kpis?.semaforo;

  return (
    <div className="pd">
      <button type="button" className="pd-back" onClick={() => navigate?.('lista')}>
        {t('project.detail.backToProjects')}
      </button>
      <header className="pd-header">
        <div className="pd-header__title">
          {project.codigo ? <span className="pd-code">{project.codigo}</span> : null}
          <h1>{project.nombre}</h1>
          {loading ? <span className="pd-spinner" aria-label={t('project.detail.updating')} /> : null}
        </div>
        <div className="pd-header__badges">
          <Badge tone="safety">{familyName(ctx.family || project.familyCode)}</Badge>
          <Badge>{caminoLabel(catalog, project.camino)}</Badge>
          <Badge tone="phase">{phaseLabel(catalog, project.faseActual)}</Badge>
          <Badge tone={project.estado === 'activo' ? 'ok' : 'neutral'}>{enumLabel(catalog, 'projectEstado', project.estado)}</Badge>
          <Badge tone={PRIORITY_TONES[project.prioridad] || 'neutral'}>
            {t('project.detail.priority', { priority: enumLabel(catalog, 'prioridad', project.prioridad).toLocaleLowerCase() })}
          </Badge>
          {signal ? (
            <span className={`pd-signal pd-signal--${signal}`} title={t(`project.detail.signal.${signal}`, { defaultValue: signal })}>
              <span className="pd-signal__dot" aria-hidden="true" />
              {t(`project.detail.signal.${signal}`, { defaultValue: signal })}
            </span>
          ) : null}
          {data.role && data.role !== 'lector' ? (
            <Badge tone={SIGNAL_TONES.verde}>{data.role === 'admin' ? t('project.detail.roleAdmin') : t('project.detail.roleOwner')}</Badge>
          ) : (
            <Badge>{t('project.detail.roleReader')}</Badge>
          )}
        </div>
      </header>

      {error ? <ErrorMessage error={error} /> : null}

      <nav className="pd-tabs" role="tablist" aria-label={t('project.detail.sectionsLabel')}>
        {TABS.map((item) => {
          const count = tabCount(item.key, data);
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={item.key === active.key}
              className={`pd-tab${item.key === active.key ? ' pd-tab--active' : ''}`}
              onClick={() => changeTab(item.key)}
            >
              {t(`project.detail.tabs.${item.key}`)}
              {count ? <span className="pd-tab__count">{count}</span> : null}
            </button>
          );
        })}
      </nav>

      <section className="pd-panel" role="tabpanel" aria-label={t(`project.detail.tabs.${active.key}`)}>
        <ActiveTab ctx={ctx} />
      </section>
    </div>
  );
}
