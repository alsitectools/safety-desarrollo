import { useEffect, useMemo, useRef, useState } from 'react';
import { createSupplier, deleteSupplier, getSupplier, listSuppliers, updateSupplier } from '../api/index.js';
import { useAsync } from '../hooks/useAsync.js';
import { PageHead } from '../components/Layout.jsx';
import { EmptyState, ErrorBox, Loading } from '../components/States.jsx';
import { Badge } from '../components/Badge.jsx';
import PhasePill from '../components/PhasePill.jsx';
import Modal, { ConfirmModal } from '../components/Modal.jsx';
import Field, { Select } from '../components/Field.jsx';
import { formatDate, formatMoney, labelOf, phaseLabelOf } from '../lib/format.js';
import { buildHash } from '../lib/router.js';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { getIntlLocale } from '../i18n/core.js';

const TIPO_TONES = { competidor: 'red', proveedor: 'green', ambos: 'amber', laboratorio: 'blue' };
const PS_ESTADO_TONES = {
  identificado: 'grey',
  contactado: 'grey',
  oferta: 'blue',
  muestras: 'blue',
  ensayos: 'amber',
  homologado: 'green',
  pedido: 'solid',
  aparcado: 'grey',
  descartado: 'red',
};

const SUPPLIER_FIELDS = ['nombre', 'pais', 'region', 'tipo', 'web', 'contacto', 'email', 'telefono', 'notas', 'homologadoSistema'];

/** Etiquetas de los campos del fabricante en el idioma actual (para ErrorBox). */
function supplierFieldLabels(t) {
  return Object.fromEntries(SUPPLIER_FIELDS.map((key) => [key, t(`suppliers.fields.${key}`)]));
}

/** Opciones del tipo de fabricante con la etiqueta traducida. */
function supplierTipoOptions(catalog) {
  return (catalog.enums.supplierTipo || []).map((value) => ({ value, label: labelOf(catalog, 'supplierTipo', value) }));
}

function uniqueSorted(values) {
  const locale = getIntlLocale();
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, locale));
}

export default function Fabricantes({ boot, navigate, refreshBoot, selectedId }) {
  const { t, lang } = useI18n();
  const { catalog } = boot;
  const isAdmin = Boolean(boot.isAppAdmin);
  const [filters, setFilters] = useState({ tipo: '', pais: '', region: '', q: '' });
  const [debouncedQ, setDebouncedQ] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | Supplier
  // Se incrementa al guardar para volver a montar (y recargar) la ficha aunque el id no cambie.
  const [detailVersion, setDetailVersion] = useState(0);
  const detailRef = useRef(null);
  const scrollToDetail = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(filters.q), 300);
    return () => clearTimeout(timer);
  }, [filters.q]);

  const list = useAsync(
    () => listSuppliers({ tipo: filters.tipo, pais: filters.pais, region: filters.region, q: debouncedQ }),
    [filters.tipo, filters.pais, filters.region, debouncedQ],
  );
  const suppliers = list.data?.suppliers;

  // Opciones de país y región a partir del directorio completo del bootstrap.
  const paises = useMemo(() => uniqueSorted((boot.suppliers || []).map((s) => s.pais)), [boot.suppliers, lang]);
  const regiones = useMemo(() => uniqueSorted((boot.suppliers || []).map((s) => s.region)), [boot.suppliers, lang]);

  const select = (id) => {
    scrollToDetail.current = Boolean(id);
    navigate(id ? buildHash('fabricantes', id) : buildHash('fabricantes'));
  };

  // En una sola columna (< 980 px, ver .split) la ficha queda debajo del directorio: tras tocar un fabricante se baja hasta ella.
  useEffect(() => {
    if (!selectedId || !scrollToDetail.current) return;
    scrollToDetail.current = false;
    const narrow = typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 979px)').matches;
    if (narrow) detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [selectedId]);
  const setFilter = (key) => (value) => setFilters((prev) => ({ ...prev, [key]: value }));

  async function afterSave(supplier) {
    setEditing(null);
    await Promise.all([list.reload(), refreshBoot?.()]);
    setDetailVersion((version) => version + 1);
    if (supplier && String(supplier.id) !== String(selectedId)) select(supplier.id);
  }

  return (
    <>
      <PageHead
        title={t('suppliers.title')}
        subtitle={t('suppliers.subtitle')}
        actions={isAdmin ? (
          <button type="button" className="btn btn--primary" onClick={() => setEditing('new')}>
            {t('suppliers.newSupplier')}
          </button>
        ) : null}
      />

      <div className="filters" role="search">
        <Field label={t('common.search')}>
          <input
            className="input"
            type="search"
            placeholder={t('suppliers.filters.searchPlaceholder')}
            value={filters.q}
            onChange={(event) => setFilter('q')(event.target.value)}
          />
        </Field>
        <Field label={t('suppliers.fields.tipo')}>
          <Select value={filters.tipo} onChange={setFilter('tipo')} options={supplierTipoOptions(catalog)} />
        </Field>
        <Field label={t('suppliers.fields.pais')}>
          <Select value={filters.pais} onChange={setFilter('pais')} options={paises.map((p) => ({ value: p, label: p }))} />
        </Field>
        <Field label={t('suppliers.fields.region')}>
          <Select value={filters.region} onChange={setFilter('region')} placeholder={t('suppliers.filters.allRegions')} options={regiones.map((r) => ({ value: r, label: r }))} />
        </Field>
      </div>

      {list.error && <ErrorBox error={list.error} onRetry={list.reload} />}

      <div className="split">
        <section className="card" aria-label={t('suppliers.list.ariaLabel')}>
          {!suppliers && list.loading && <Loading />}
          {suppliers && suppliers.length === 0 && <EmptyState icon="🏭" title={t('suppliers.list.empty')} />}
          {suppliers && suppliers.length > 0 && (
            <ul className="list" style={{ opacity: list.loading ? 0.6 : 1 }}>
              {suppliers.map((supplier) => (
                <li
                  key={supplier.id}
                  className={`list__item${String(supplier.id) === String(selectedId) ? ' selected-row' : ''}`}
                  style={{ paddingLeft: 6, paddingRight: 6, borderRadius: 6 }}
                >
                  <div className="list__main">
                    <button type="button" className="link-btn list__title" onClick={() => select(supplier.id)}>
                      {supplier.nombre}
                    </button>
                    <div className="list__meta">
                      {[supplier.pais, supplier.region].filter(Boolean).join(' · ') || t('suppliers.list.noCountry')}
                      {supplier.proyectos?.length
                        ? ` · ${t('suppliers.list.projects', { count: supplier.proyectos.length })}`
                        : ''}
                    </div>
                  </div>
                  <span className="row" style={{ gap: 4 }}>
                    {supplier.homologadoSistema && <Badge tone="green">{t('suppliers.list.homologated')}</Badge>}
                    <Badge tone={TIPO_TONES[supplier.tipo]}>{labelOf(catalog, 'supplierTipo', supplier.tipo)}</Badge>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label={t('suppliers.detail.ariaLabel')} ref={detailRef} style={{ scrollMarginTop: 'calc(var(--header-h, 56px) + 12px)' }}>
          {selectedId ? (
            <SupplierDetail
              key={`${selectedId}-${detailVersion}`}
              id={selectedId}
              boot={boot}
              isAdmin={isAdmin}
              navigate={navigate}
              onEdit={(supplier) => setEditing(supplier)}
              onDeleted={async () => {
                await Promise.all([list.reload(), refreshBoot?.()]);
                select(null);
              }}
            />
          ) : (
            <div className="card">
              <EmptyState icon="👈" title={t('suppliers.detail.chooseTitle')}>
                {t('suppliers.detail.chooseText')}
              </EmptyState>
            </div>
          )}
        </section>
      </div>

      {editing && (
        <SupplierForm
          catalog={catalog}
          supplier={editing === 'new' ? null : editing}
          paises={paises}
          regiones={regiones}
          onClose={() => setEditing(null)}
          onSaved={afterSave}
        />
      )}
    </>
  );
}

function SupplierDetail({ id, boot, isAdmin, navigate, onEdit, onDeleted }) {
  const { t } = useI18n();
  const { catalog } = boot;
  const detail = useAsync(() => getSupplier(id), [id]);
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  if (detail.loading && !detail.data) return <div className="card"><Loading /></div>;
  if (detail.error) {
    return (
      <div className="card">
        <ErrorBox error={detail.error} onRetry={detail.error.status === 404 ? undefined : detail.reload} />
      </div>
    );
  }
  if (!detail.data) return null;

  const { supplier, proyectos = [] } = detail.data;

  async function remove() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteSupplier(supplier.id);
      setConfirm(false);
      onDeleted();
    } catch (error) {
      setDeleteError(
        error.code === 'conflict'
          ? Object.assign(new Error(t('suppliers.detail.deleteConflict')), { code: 'conflict' })
          : error,
      );
      setConfirm(false);
    } finally {
      setDeleting(false);
    }
  }

  const web = supplier.web && (/^https?:\/\//i.test(supplier.web) ? supplier.web : `https://${supplier.web}`);

  return (
    <div className="card stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ margin: 0 }}>{supplier.nombre}</h2>
          <div className="row" style={{ gap: 4, marginTop: 4 }}>
            <Badge tone={TIPO_TONES[supplier.tipo]}>{labelOf(catalog, 'supplierTipo', supplier.tipo)}</Badge>
            {supplier.homologadoSistema && <Badge tone="green">{t('suppliers.fields.homologadoSistema')}</Badge>}
          </div>
        </div>
        {isAdmin && (
          <div className="btn-row">
            <button type="button" className="btn btn--sm" onClick={() => onEdit(supplier)}>{t('common.edit')}</button>
            <button type="button" className="btn btn--sm btn--danger" onClick={() => setConfirm(true)}>{t('suppliers.detail.delete')}</button>
          </div>
        )}
      </div>

      {deleteError && <ErrorBox error={deleteError} />}

      <dl className="dl">
        <dt>{t('suppliers.fields.pais')}</dt>
        <dd>{supplier.pais || '—'}</dd>
        <dt>{t('suppliers.fields.region')}</dt>
        <dd>{supplier.region || '—'}</dd>
        <dt>{t('suppliers.fields.web')}</dt>
        <dd>{web ? <a href={web} target="_blank" rel="noopener noreferrer">{supplier.web}</a> : '—'}</dd>
        <dt>{t('suppliers.fields.contacto')}</dt>
        <dd>{supplier.contacto || '—'}</dd>
        <dt>{t('suppliers.fields.email')}</dt>
        <dd>{supplier.email ? <a href={`mailto:${supplier.email}`}>{supplier.email}</a> : '—'}</dd>
        <dt>{t('suppliers.fields.telefono')}</dt>
        <dd>{supplier.telefono || '—'}</dd>
        {supplier.notas && (
          <>
            <dt>{t('suppliers.fields.notas')}</dt>
            <dd style={{ whiteSpace: 'pre-wrap' }}>{supplier.notas}</dd>
          </>
        )}
      </dl>

      <div>
        <h3>{t('suppliers.detail.projectsTitle')}</h3>
        {proyectos.length === 0 ? (
          <p className="muted small mt-0">{t('suppliers.detail.noProjects')}</p>
        ) : (
          <ul className="list">
            {proyectos.map((rel) => (
              <li className="list__item" key={rel.projectSupplierId || `${rel.projectId}-${rel.rol}`}>
                <div className="list__main">
                  <button type="button" className="link-btn list__title" onClick={() => navigate(buildHash('proyecto', rel.projectId))}>
                    {rel.projectNombre}
                  </button>
                  <div className="list__meta row" style={{ gap: 6 }}>
                    {rel.faseActual && <PhasePill fase={rel.faseActual} label={phaseLabelOf(catalog, rel.faseActual)} />}
                    <span>{labelOf(catalog, 'psRol', rel.rol)}</span>
                    <Badge tone={PS_ESTADO_TONES[rel.estado]}>{labelOf(catalog, 'psEstado', rel.estado)}</Badge>
                  </div>
                  {rel.lastQuote && (
                    <div className="list__meta">
                      {t('suppliers.detail.lastQuote')} {rel.lastQuote.referencia ? `«${rel.lastQuote.referencia}» ` : ''}
                      {formatDate(rel.lastQuote.fecha)}
                      {rel.lastQuote.importe !== null && rel.lastQuote.importe !== undefined
                        ? ` · ${formatMoney(rel.lastQuote.importe, rel.lastQuote.moneda, { decimals: 2 })}`
                        : ''}
                      {rel.lastQuote.incoterm ? ` · ${rel.lastQuote.incoterm}` : ''}
                      {rel.lastQuote.validez ? ` · ${t('suppliers.detail.validUntil', { date: formatDate(rel.lastQuote.validez) })}` : ''}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmModal
        open={confirm}
        title={t('suppliers.detail.confirmDeleteTitle')}
        message={t('suppliers.detail.confirmDeleteMessage', { name: supplier.nombre })}
        confirmLabel={t('suppliers.detail.delete')}
        danger
        busy={deleting}
        onConfirm={remove}
        onClose={() => setConfirm(false)}
      />
    </div>
  );
}

const EMPTY_SUPPLIER = {
  nombre: '',
  pais: '',
  region: '',
  tipo: 'proveedor',
  web: '',
  contacto: '',
  email: '',
  telefono: '',
  notas: '',
  homologadoSistema: false,
};

function SupplierForm({ catalog, supplier, paises, regiones, onClose, onSaved }) {
  const { t } = useI18n();
  const [form, setForm] = useState(() => {
    if (!supplier) return { ...EMPTY_SUPPLIER };
    const next = {};
    Object.keys(EMPTY_SUPPLIER).forEach((key) => {
      next[key] = supplier[key] ?? EMPTY_SUPPLIER[key];
    });
    return next;
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const onInput = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    const local = {};
    if (!form.nombre.trim()) local.nombre = t('suppliers.form.nameRequired');
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) local.email = t('suppliers.form.emailInvalid');
    setErrors(local);
    if (Object.keys(local).length) return;
    setSaving(true);
    setError(null);
    const body = {};
    Object.entries(form).forEach(([key, value]) => {
      body[key] = typeof value === 'string' ? value.trim() : value;
    });
    if (!body.notas) body.notas = null;
    try {
      const result = supplier ? await updateSupplier(supplier.id, body) : await createSupplier(body);
      onSaved(result.supplier);
    } catch (err) {
      if (err.code === 'conflict') err.message = t('suppliers.form.duplicateName');
      setError(err);
      if (err.fields) setErrors(err.fields);
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      title={supplier ? t('suppliers.form.editTitle', { name: supplier.nombre }) : t('suppliers.form.newTitle')}
      onClose={saving ? undefined : onClose}
      footer={(
        <>
          <button type="button" className="btn" onClick={onClose} disabled={saving}>{t('common.cancel')}</button>
          <button type="submit" form="supplier-form" className="btn btn--primary" disabled={saving}>
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </>
      )}
    >
      <form id="supplier-form" onSubmit={submit} noValidate className="stack">
        {error && <ErrorBox error={error} fieldLabels={supplierFieldLabels(t)} />}
        <div className="form-grid">
          <Field label={t('suppliers.fields.nombre')} required error={errors.nombre} className="span-all">
            <input className="input" value={form.nombre} onChange={onInput('nombre')} maxLength={200} />
          </Field>
          <Field label={t('suppliers.fields.tipo')} error={errors.tipo}>
            <Select
              value={form.tipo}
              onChange={(value) => setForm((prev) => ({ ...prev, tipo: value }))}
              allowEmpty={false}
              options={supplierTipoOptions(catalog)}
            />
          </Field>
          <Field label={t('suppliers.fields.pais')} error={errors.pais}>
            <input className="input" value={form.pais} onChange={onInput('pais')} list="paises-list" />
          </Field>
          <Field label={t('suppliers.fields.region')} error={errors.region}>
            <input className="input" value={form.region} onChange={onInput('region')} list="regiones-list" />
          </Field>
          <Field label={t('suppliers.fields.web')} error={errors.web}>
            <input className="input" value={form.web} onChange={onInput('web')} placeholder="https://…" />
          </Field>
          <Field label={t('suppliers.fields.contacto')} error={errors.contacto}>
            <input className="input" value={form.contacto} onChange={onInput('contacto')} />
          </Field>
          <Field label={t('suppliers.fields.email')} error={errors.email}>
            <input className="input" type="email" value={form.email} onChange={onInput('email')} />
          </Field>
          <Field label={t('suppliers.fields.telefono')} error={errors.telefono}>
            <input className="input" type="tel" value={form.telefono} onChange={onInput('telefono')} />
          </Field>
          <Field label={t('suppliers.fields.homologadoSistema')} check error={errors.homologadoSistema}>
            <input
              type="checkbox"
              checked={Boolean(form.homologadoSistema)}
              onChange={(event) => setForm((prev) => ({ ...prev, homologadoSistema: event.target.checked }))}
            />
          </Field>
          <Field label={t('suppliers.fields.notas')} error={errors.notas} className="span-all">
            <textarea className="textarea" value={form.notas || ''} onChange={onInput('notas')} />
          </Field>
        </div>
        <datalist id="paises-list">{paises.map((p) => <option key={p} value={p} />)}</datalist>
        <datalist id="regiones-list">{regiones.map((r) => <option key={r} value={r} />)}</datalist>
      </form>
    </Modal>
  );
}
