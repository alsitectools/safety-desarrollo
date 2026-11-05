import { useEffect, useMemo, useState } from 'react';
import { createProject, getExport, listProjects } from '../api/index.js';
import { useAsync } from '../hooks/useAsync.js';
import { PageHead } from '../components/Layout.jsx';
import { EmptyState, ErrorBox, Loading } from '../components/States.jsx';
import { EstadoBadge, Initials, PriorityBadge, Semaforo } from '../components/Badge.jsx';
import PhasePill from '../components/PhasePill.jsx';
import Modal from '../components/Modal.jsx';
import Field, { Select } from '../components/Field.jsx';
import ProjectFilters from './ProjectFilters.jsx';
import { formatDate, formatTotalsShort, labelOf, phaseLabelOf } from '../lib/format.js';
import { activeFamilies, activePeople, familyNameMap, peopleById, projectResponsables, sortProjects } from '../lib/projects.js';
import { exportFileName, toWorkbookSheets } from '../lib/excel.js';
import { buildHash } from '../lib/router.js';
import { caminoLabel, familyName as familyLabel } from '../i18n/labels.js';
import { useI18n } from '../i18n/I18nProvider.jsx';

const FILTER_KEYS = ['q', 'familia', 'camino', 'fase', 'estado', 'responsable'];

const COLUMNS = [
  { key: 'codigo' },
  { key: 'nombre' },
  { key: 'familia' },
  { key: 'fase' },
  { key: 'estado' },
  { key: 'prioridad' },
  { key: 'responsables', sortable: false },
  { key: 'fechaObjetivo' },
  { key: 'semaforo' },
  { key: 'acciones', num: true },
  { key: 'entregables', num: true },
  { key: 'previsto', num: true },
];

function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function Lista({ boot, navigate, query }) {
  const { t, lang } = useI18n();
  const { catalog } = boot;
  const [filters, setFilters] = useState(() => {
    const initial = {};
    FILTER_KEYS.forEach((key) => {
      initial[key] = query[key] || '';
    });
    return initial;
  });
  const [sort, setSort] = useState({ key: query.orden || 'prioridad', dir: query.dir === 'desc' ? 'desc' : 'asc' });
  const [creating, setCreating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  const q = useDebounced(filters.q);
  const apiFilters = useMemo(() => ({ ...filters, q }), [filters, q]);
  const filterKey = JSON.stringify(apiFilters);
  const result = useAsync(() => listProjects(apiFilters), [filterKey]);

  // Los filtros quedan en el hash para poder compartir el enlace (sin disparar navegación).
  useEffect(() => {
    const hash = buildHash('lista', null, { ...apiFilters, orden: sort.key === 'prioridad' ? '' : sort.key, dir: sort.dir === 'desc' ? 'desc' : '' });
    if (window.location.hash !== hash) window.history.replaceState(null, '', hash);
  }, [filterKey, sort.key, sort.dir]); // eslint-disable-line react-hooks/exhaustive-deps

  const people = useMemo(() => peopleById(boot.people), [boot.people]);
  const familyNames = useMemo(() => familyNameMap(boot.families), [boot.families, lang]);
  const rows = useMemo(
    () => sortProjects(result.data?.projects || [], sort.key, sort.dir, { phasesByCamino: catalog.phasesByCamino, familyNames }),
    [result.data, sort, catalog.phasesByCamino, familyNames],
  );

  const toggleSort = (key) => {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  };

  const hasFilters = FILTER_KEYS.some((key) => filters[key]);

  async function exportExcel() {
    setExporting(true);
    setExportError(null);
    try {
      const [data, { default: writeExcelFile }] = await Promise.all([
        getExport(apiFilters),
        import('write-excel-file/browser'),
      ]);
      await writeExcelFile(toWorkbookSheets(data), { fontFamily: 'Calibri', fontSize: 11 }).toFile(
        exportFileName(boot.today || data.generatedAt),
      );
    } catch (error) {
      setExportError(error);
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <PageHead
        title={t('list.title')}
        subtitle={result.data ? t('list.count', { count: rows.length }) : undefined}
        actions={(
          <>
            <button type="button" className="btn" onClick={exportExcel} disabled={exporting || !result.data}>
              {exporting ? t('list.exporting') : t('list.exportExcel')}
            </button>
            {boot.isAppAdmin && (
              <button type="button" className="btn btn--primary" onClick={() => setCreating(true)}>
                {t('list.newProject')}
              </button>
            )}
          </>
        )}
      />

      <ProjectFilters
        boot={boot}
        value={filters}
        onChange={setFilters}
        show={FILTER_KEYS}
        extra={hasFilters ? (
          <div className="field">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setFilters(Object.fromEntries(FILTER_KEYS.map((key) => [key, ''])))}
            >
              {t('common.clearFilters')}
            </button>
          </div>
        ) : null}
      />

      {exportError && <ErrorBox error={exportError} title={t('list.exportError')} />}
      {result.error && <ErrorBox error={result.error} onRetry={result.reload} />}
      {!result.data && result.loading && <Loading />}

      {result.data && rows.length === 0 && (
        <div className="card">
          <EmptyState icon="🔎" title={hasFilters ? t('list.empty.filtered') : t('list.empty.none')}>
            {!hasFilters && boot.isAppAdmin ? t('list.empty.hint') : null}
          </EmptyState>
        </div>
      )}

      {rows.length > 0 && (
        <div className="table-wrap" style={{ opacity: result.loading ? 0.6 : 1 }}>
          <table className="table table-cards">
            <thead>
              <tr>
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className={col.num ? 'num' : undefined}
                    aria-sort={sort.key === col.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                  >
                    {col.sortable === false ? t(`list.columns.${col.key}`) : (
                      <button type="button" className="th-sort" onClick={() => toggleSort(col.key)}>
                        {t(`list.columns.${col.key}`)}
                        <span className="th-sort__arrow" aria-hidden="true">
                          {sort.key === col.key ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}
                        </span>
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((project) => (
                <ProjectRow
                  key={project.id}
                  project={project}
                  catalog={catalog}
                  familyName={familyLabel({ code: project.familyCode, nombre: familyNames[project.familyCode] })}
                  slots={projectResponsables(project, people)}
                  onOpen={() => navigate(buildHash('proyecto', project.id))}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <NewProjectModal
          boot={boot}
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            navigate(buildHash('proyecto', id));
          }}
        />
      )}
    </>
  );
}

function ProjectRow({ project, catalog, familyName, slots, onOpen }) {
  const { t } = useI18n();
  const kpis = project.kpis || {};
  const phases = catalog.phasesByCamino[project.camino] || [];
  const step = phases.indexOf(project.faseActual) + 1;
  return (
    <tr className="is-clickable" onClick={onOpen}>
      <td data-label={t('list.columns.codigo')} className="nowrap">{project.codigo || <span className="muted">—</span>}</td>
      <td className="td-title">
        <a
          href={buildHash('proyecto', project.id)}
          onClick={(event) => event.stopPropagation()}
          style={{ fontWeight: 700 }}
        >
          {project.nombre}
        </a>
      </td>
      <td data-label={t('list.columns.familia')}>{familyName || project.familyCode}</td>
      <td data-label={t('list.columns.fase')}>
        <div className="small muted">{caminoLabel(project.camino)}</div>
        <PhasePill
          fase={project.faseActual}
          label={phaseLabelOf(catalog, project.faseActual)}
          camino={project.camino}
          step={step || null}
          total={phases.length}
        />
      </td>
      <td data-label={t('list.columns.estado')}><EstadoBadge value={project.estado} label={labelOf(catalog, 'projectEstado', project.estado)} /></td>
      <td data-label={t('list.columns.prioridad')}><PriorityBadge value={project.prioridad} label={labelOf(catalog, 'prioridad', project.prioridad)} /></td>
      <td data-label={t('list.columns.responsables')}><Initials slots={slots} /></td>
      <td data-label={t('list.columns.fechaObjetivo')} className="nowrap">{formatDate(project.fechaObjetivo)}</td>
      <td data-label={t('list.columns.semaforo')}><Semaforo value={kpis.semaforo} withLabel /></td>
      <td data-label={t('list.columns.acciones')} className="num">
        {kpis.accionesAbiertas ?? 0}
        {kpis.accionesVencidas ? <span style={{ color: 'var(--red)', fontWeight: 700 }}> {t('list.overdue', { n: kpis.accionesVencidas })}</span> : null}
      </td>
      <td data-label={t('list.columns.entregables')} className="num">
        {kpis.entregablesTotal ? `${kpis.entregablesHechos}/${kpis.entregablesTotal}` : '—'}
      </td>
      <td data-label={t('list.columns.previsto')} className="num">{formatTotalsShort(kpis.presupuesto)}</td>
    </tr>
  );
}

const PROJECT_FIELDS = [
  'nombre', 'familyCode', 'camino', 'faseActual', 'codigo', 'estado', 'prioridad', 'gama', 'modalidad', 'fechaObjetivo',
  'designerId', 'sourcingId', 'homologationId', 'centroDiseno', 'mercados', 'descripcion', 'sharepointUrl',
];

function projectFieldLabels(t) {
  return Object.fromEntries(PROJECT_FIELDS.map((key) => [key, t(`list.newModal.fields.${key}`)]));
}

/** Opciones de un enum del catálogo con la etiqueta traducida. */
function enumOptions(catalog, enumName) {
  const keys = (catalog.enums && catalog.enums[enumName]) || Object.keys((catalog.enumLabels && catalog.enumLabels[enumName]) || {});
  return keys.map((key) => ({ value: key, label: labelOf(catalog, enumName, key) }));
}

function NewProjectModal({ boot, onClose, onCreated }) {
  const { t } = useI18n();
  const { catalog } = boot;
  const [form, setForm] = useState({
    nombre: '',
    codigo: '',
    familyCode: '',
    camino: 'propio',
    faseActual: '',
    estado: 'activo',
    prioridad: 'media',
    gama: '',
    modalidad: '',
    fechaObjetivo: '',
    designerId: '',
    sourcingId: '',
    homologationId: '',
    centroDiseno: '',
    mercados: '',
    sharepointUrl: '',
    descripcion: '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (key) => (value) => setForm((prev) => ({
    ...prev,
    [key]: value,
    ...(key === 'camino' ? { faseActual: '' } : {}),
  }));
  const onInput = (key) => (event) => set(key)(event.target.value);

  const peopleOptions = activePeople(boot.people).map((p) => ({ value: String(p.id), label: p.nombre }));

  function validate() {
    const next = {};
    if (!form.nombre.trim()) next.nombre = t('list.newModal.errors.nameRequired');
    if (!form.familyCode) next.familyCode = t('list.newModal.errors.familyRequired');
    if (!form.camino) next.camino = t('list.newModal.errors.caminoRequired');
    if (form.sharepointUrl && !/^https?:\/\//i.test(form.sharepointUrl.trim())) next.sharepointUrl = t('list.newModal.errors.urlScheme');
    return next;
  }

  async function submit(event) {
    event.preventDefault();
    const local = validate();
    setErrors(local);
    if (Object.keys(local).length) return;
    setSaving(true);
    setError(null);
    const body = {};
    Object.entries(form).forEach(([key, value]) => {
      const text = typeof value === 'string' ? value.trim() : value;
      if (['designerId', 'sourcingId', 'homologationId'].includes(key)) body[key] = text ? Number(text) : null;
      else if (['gama', 'modalidad', 'fechaObjetivo', 'codigo', 'descripcion', 'faseActual'].includes(key)) {
        if (text) body[key] = text;
      } else body[key] = text;
    });
    try {
      const created = await createProject(body);
      onCreated(created.project.id);
    } catch (err) {
      setError(err);
      if (err.fields) setErrors(err.fields);
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      size="wide"
      title={t('list.newModal.title')}
      onClose={saving ? undefined : onClose}
      footer={(
        <>
          <button type="button" className="btn" onClick={onClose} disabled={saving}>{t('common.cancel')}</button>
          <button type="submit" form="new-project" className="btn btn--primary" disabled={saving}>
            {saving ? t('list.newModal.creating') : t('list.newModal.submit')}
          </button>
        </>
      )}
    >
      <form id="new-project" onSubmit={submit} noValidate className="stack">
        {error && <ErrorBox error={error} fieldLabels={projectFieldLabels(t)} />}
        <div className="form-grid">
          <Field label={t('list.newModal.fields.nombre')} required error={errors.nombre} className="span-all">
            <input className="input" value={form.nombre} onChange={onInput('nombre')} maxLength={200} />
          </Field>
          <Field label={t('list.newModal.fields.codigo')} hint={t('list.newModal.codeHint')} error={errors.codigo}>
            <input className="input" value={form.codigo} onChange={onInput('codigo')} maxLength={40} />
          </Field>
          <Field label={t('list.newModal.fields.familyCode')} required error={errors.familyCode}>
            <Select
              value={form.familyCode}
              onChange={set('familyCode')}
              placeholder={t('list.newModal.choose')}
              options={activeFamilies(boot.families).map((f) => ({ value: f.code, label: familyLabel(f) }))}
            />
          </Field>
          <Field label={t('list.newModal.fields.camino')} required error={errors.camino}>
            <Select value={form.camino} onChange={set('camino')} allowEmpty={false} options={catalog.caminos.map((camino) => ({ value: camino, label: caminoLabel(camino) }))} />
          </Field>
          <Field label={t('list.newModal.fields.faseActual')} hint={t('list.newModal.phaseHint')} error={errors.faseActual}>
            <Select
              value={form.faseActual}
              onChange={set('faseActual')}
              placeholder={t('list.newModal.firstPhase')}
              options={(catalog.phasesByCamino[form.camino] || []).map((fase) => ({ value: fase, label: phaseLabelOf(catalog, fase) }))}
            />
          </Field>
          <Field label={t('list.newModal.fields.estado')} error={errors.estado}>
            <Select value={form.estado} onChange={set('estado')} allowEmpty={false} options={enumOptions(catalog, 'projectEstado')} />
          </Field>
          <Field label={t('list.newModal.fields.prioridad')} error={errors.prioridad}>
            <Select value={form.prioridad} onChange={set('prioridad')} allowEmpty={false} options={enumOptions(catalog, 'prioridad')} />
          </Field>
          <Field label={t('list.newModal.fields.gama')} error={errors.gama}>
            <Select value={form.gama} onChange={set('gama')} placeholder={t('list.newModal.undefined')} options={enumOptions(catalog, 'gama')} />
          </Field>
          <Field label={t('list.newModal.fields.modalidad')} error={errors.modalidad}>
            <Select value={form.modalidad} onChange={set('modalidad')} placeholder={t('list.newModal.undefined')} options={enumOptions(catalog, 'modalidad')} />
          </Field>
          <Field label={t('list.newModal.fields.fechaObjetivo')} error={errors.fechaObjetivo}>
            <input className="input" type="date" value={form.fechaObjetivo} onChange={onInput('fechaObjetivo')} />
          </Field>
          <Field label={t('list.newModal.fields.designerId')} error={errors.designerId}>
            <Select value={form.designerId} onChange={set('designerId')} placeholder={t('list.newModal.unassigned')} options={peopleOptions} />
          </Field>
          <Field label={t('list.newModal.fields.sourcingId')} error={errors.sourcingId}>
            <Select value={form.sourcingId} onChange={set('sourcingId')} placeholder={t('list.newModal.unassigned')} options={peopleOptions} />
          </Field>
          <Field label={t('list.newModal.fields.homologationId')} error={errors.homologationId}>
            <Select value={form.homologationId} onChange={set('homologationId')} placeholder={t('list.newModal.unassigned')} options={peopleOptions} />
          </Field>
          <Field label={t('list.newModal.fields.centroDiseno')} error={errors.centroDiseno}>
            <input className="input" value={form.centroDiseno} onChange={onInput('centroDiseno')} list="empresas-list" />
          </Field>
          <Field label={t('list.newModal.fields.mercados')} error={errors.mercados}>
            <input className="input" value={form.mercados} onChange={onInput('mercados')} placeholder={t('list.newModal.marketsPlaceholder')} />
          </Field>
          <Field label={t('list.newModal.fields.sharepointUrl')} error={errors.sharepointUrl}>
            <input className="input" type="url" value={form.sharepointUrl} onChange={onInput('sharepointUrl')} placeholder="https://…" />
          </Field>
          <Field label={t('list.newModal.fields.descripcion')} error={errors.descripcion} className="span-all">
            <textarea className="textarea" value={form.descripcion} onChange={onInput('descripcion')} />
          </Field>
        </div>
        <datalist id="empresas-list">
          {(catalog.empresas || []).map((empresa) => <option key={empresa} value={empresa} />)}
        </datalist>
        <p className="small muted mt-0">
          {t('list.newModal.footnote')}
        </p>
      </form>
    </Modal>
  );
}
