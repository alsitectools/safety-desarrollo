import { useMemo, useState } from 'react';
import {
  createFamily,
  createFamilyField,
  createPerson,
  createTemplate,
  deleteFamily,
  deleteFamilyField,
  deletePerson,
  deleteTemplate,
  runSeed,
  updateFamily,
  updateFamilyField,
  updatePerson,
  updateTemplate,
} from '../api/index.js';
import { PageHead } from '../components/Layout.jsx';
import { EmptyState, ErrorBox } from '../components/States.jsx';
import { Badge } from '../components/Badge.jsx';
import { ConfirmModal } from '../components/Modal.jsx';
import FormModal from './FormModal.jsx';
import { labelOf, phaseLabelOf } from '../lib/format.js';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { caminoLabel, deliverableText, familyName, fieldLabel } from '../i18n/labels.js';

// Pestañas: la etiqueta se traduce al pintar (config.tabs.<key>).
const TABS = ['personas', 'familias', 'plantillas', 'seed'];

export default function Config({ boot, refreshBoot, query }) {
  const { t } = useI18n();
  const [tab, setTab] = useState(TABS.includes(query.tab) ? query.tab : 'personas');

  if (!boot.isAppAdmin) {
    return (
      <>
        <PageHead title={t('config.title')} />
        <div className="card">
          <EmptyState icon="🔒" title={t('config.adminOnlyTitle')}>
            {t('config.adminOnlyText')}
          </EmptyState>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHead title={t('config.title')} subtitle={t('config.subtitle')} />
      <div className="tabs" role="tablist">
        {TABS.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            className="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
          >
            {t(`config.tabs.${key}`)}
          </button>
        ))}
      </div>
      {tab === 'personas' && <PeopleTab boot={boot} refreshBoot={refreshBoot} />}
      {tab === 'familias' && <FamiliesTab boot={boot} refreshBoot={refreshBoot} />}
      {tab === 'plantillas' && <TemplatesTab boot={boot} refreshBoot={refreshBoot} />}
      {tab === 'seed' && <SeedTab refreshBoot={refreshBoot} />}
    </>
  );
}

/** Estado común: edición en modal + confirmación de borrado con mensaje de error. */
function useCrud(refreshBoot) {
  const [editing, setEditing] = useState(null); // { item|null, ...ctx }
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function save(fn) {
    await fn();
    setEditing(null);
    await refreshBoot();
  }

  async function confirmDelete(fn, inUseMessage) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setDeleting(null);
      await refreshBoot();
    } catch (err) {
      if (err.code === 'conflict' && inUseMessage) err.message = inUseMessage;
      setError(err);
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  }

  return { editing, setEditing, deleting, setDeleting, busy, error, setError, save, confirmDelete };
}

// ---------------------------------------------------------------------------
// Personas
// ---------------------------------------------------------------------------

function PeopleTab({ boot, refreshBoot }) {
  const { t } = useI18n();
  const crud = useCrud(refreshBoot);
  const [showInactive, setShowInactive] = useState(false);
  const people = (boot.people || []).filter((p) => showInactive || p.activo);
  const empresaOptions = (boot.catalog.empresas || []).map((e) => ({ value: e, label: e }));

  const specs = [
    { key: 'nombre', label: t('config.people.fields.nombre'), required: true, span: true },
    { key: 'papel', label: t('config.people.fields.papel'), placeholder: 'R&D Project Manager' },
    { key: 'empresa', label: t('config.people.fields.empresa'), type: 'select', options: empresaOptions, placeholder: t('config.people.fields.empresaPlaceholder') },
    { key: 'email', label: t('config.people.fields.email'), type: 'email' },
    { key: 'portalUserId', label: t('config.people.fields.portalUserId'), type: 'number', hint: t('config.people.fields.portalUserIdHint') },
    { key: 'activo', label: t('config.people.fields.activo'), type: 'bool', default: true },
  ];

  return (
    <section className="card">
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <label className="row small" style={{ gap: 6 }}>
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          {t('config.people.showInactive')}
        </label>
        <button type="button" className="btn btn--primary" onClick={() => crud.setEditing({ item: null })}>{t('config.people.newPerson')}</button>
      </div>
      {crud.error && <ErrorBox error={crud.error} />}
      {people.length === 0 ? (
        <EmptyState icon="👥" title={t('config.people.empty')} />
      ) : (
        <div className="table-wrap">
          <table className="table table-cards">
            <thead>
              <tr>
                <th>{t('config.people.columns.nombre')}</th>
                <th>{t('config.people.columns.papel')}</th>
                <th>{t('config.people.columns.empresa')}</th>
                <th>{t('config.people.columns.email')}</th>
                <th>{t('config.people.columns.portalUser')}</th>
                <th>{t('config.people.columns.estado')}</th>
                <th><span className="sr-only">{t('common.actions')}</span></th>
              </tr>
            </thead>
            <tbody>
              {people.map((person) => (
                <tr key={person.id}>
                  <td className="td-title"><strong>{person.nombre}</strong></td>
                  <td data-label={t('config.people.columns.papel')}>{person.papel || '—'}</td>
                  <td data-label={t('config.people.columns.empresa')}>{person.empresa || '—'}</td>
                  <td data-label={t('config.people.columns.email')}>{person.email || '—'}</td>
                  <td data-label={t('config.people.columns.portalUser')}>{person.portalUserId ?? '—'}</td>
                  <td data-label={t('config.people.columns.estado')}>{person.activo ? <Badge tone="green">{t('config.people.active')}</Badge> : <Badge tone="grey">{t('config.people.inactive')}</Badge>}</td>
                  <td className="nowrap">
                    <div className="btn-row">
                      <button type="button" className="btn btn--sm" onClick={() => crud.setEditing({ item: person })}>{t('common.edit')}</button>
                      <button type="button" className="btn btn--sm btn--danger" onClick={() => crud.setDeleting(person)}>{t('config.delete')}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {crud.editing && (
        <FormModal
          title={crud.editing.item ? t('config.editTitle', { name: crud.editing.item.nombre }) : t('config.people.newTitle')}
          specs={specs}
          initial={crud.editing.item || {}}
          onClose={() => crud.setEditing(null)}
          onSubmit={(body) => crud.save(() => (crud.editing.item ? updatePerson(crud.editing.item.id, body) : createPerson(body)))}
        />
      )}
      <ConfirmModal
        open={Boolean(crud.deleting)}
        title={t('config.people.confirmDeleteTitle')}
        message={crud.deleting ? t('config.people.confirmDeleteMessage', { name: crud.deleting.nombre }) : ''}
        confirmLabel={t('config.delete')}
        danger
        busy={crud.busy}
        onClose={() => crud.setDeleting(null)}
        onConfirm={() => crud.confirmDelete(() => deletePerson(crud.deleting.id))}
      />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Familias y campos
// ---------------------------------------------------------------------------

function FamiliesTab({ boot, refreshBoot }) {
  const { t } = useI18n();
  const { catalog } = boot;
  const families = useMemo(() => [...(boot.families || [])].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)), [boot.families]);
  const [selected, setSelected] = useState(families[0]?.code || null);
  const famCrud = useCrud(refreshBoot);
  const fieldCrud = useCrud(refreshBoot);
  const family = families.find((f) => f.code === selected) || null;

  const familySpecs = (isNew) => [
    { key: 'code', label: t('config.families.fields.code'), required: true, readOnly: !isNew, hint: isNew ? t('config.families.fields.codeHint') : undefined },
    { key: 'nombre', label: t('config.families.fields.nombre'), required: true },
    { key: 'anclaEspecialista', label: t('config.families.fields.anclaEspecialista'), placeholder: '#eps' },
    { key: 'orden', label: t('config.families.fields.orden'), type: 'number' },
    { key: 'activo', label: t('config.families.fields.activo'), type: 'bool', default: true },
  ];

  const fieldSpecs = [
    { key: 'key', label: t('config.fields.form.key'), required: true, placeholder: 'peso_kg', hint: t('config.fields.form.keyHint') },
    { key: 'label', label: t('config.fields.form.label'), required: true, placeholder: t('config.fields.form.labelPlaceholder') },
    {
      key: 'type',
      label: t('config.fields.form.type'),
      type: 'select',
      required: true,
      default: 'number',
      options: (catalog.enums.fieldType || []).map((value) => ({ value, label: labelOf(catalog, 'fieldType', value) })),
    },
    { key: 'unit', label: t('config.fields.form.unit'), placeholder: 'kg' },
    { key: 'options', label: t('config.fields.form.options'), type: 'list', placeholder: 'A, B, C, A+B', hint: t('config.fields.form.optionsHint') },
    { key: 'orden', label: t('config.fields.form.orden'), type: 'number' },
    { key: 'calculado', label: t('config.fields.form.calculado'), type: 'bool' },
  ];

  return (
    <div className="split">
      <section className="card">
        <div className="card__title">
          <span>{t('config.families.title')}</span>
          <button type="button" className="btn btn--sm btn--primary" onClick={() => famCrud.setEditing({ item: null })}>{t('config.families.newFamily')}</button>
        </div>
        {famCrud.error && <ErrorBox error={famCrud.error} />}
        {families.length === 0 ? (
          <EmptyState icon="🧩" title={t('config.families.empty')} />
        ) : (
          <ul className="list">
            {families.map((f) => (
              <li
                key={f.code}
                className={`list__item${f.code === selected ? ' selected-row' : ''}`}
                style={{ paddingLeft: 6, paddingRight: 6, borderRadius: 6 }}
              >
                <div className="list__main">
                  <button type="button" className="link-btn list__title" onClick={() => setSelected(f.code)}>{familyName(f)}</button>
                  <div className="list__meta">
                    {f.code}
                    {f.anclaEspecialista ? ` · ${f.anclaEspecialista}` : ''}
                    {` · ${t('config.families.fieldCount', { count: (f.fields || []).length })}`}
                  </div>
                </div>
                <span className="btn-row">
                  {!f.activo && <Badge tone="grey">{t('config.families.inactive')}</Badge>}
                  <button type="button" className="btn btn--sm" onClick={() => famCrud.setEditing({ item: f })}>{t('common.edit')}</button>
                  <button type="button" className="btn btn--sm btn--danger" onClick={() => famCrud.setDeleting(f)}>{t('config.delete')}</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <div className="card__title">
          <span>{family ? t('config.fields.titleWithFamily', { family: familyName(family) }) : t('config.fields.title')}</span>
          {family && (
            <button type="button" className="btn btn--sm btn--primary" onClick={() => fieldCrud.setEditing({ item: null })}>{t('config.fields.newField')}</button>
          )}
        </div>
        {fieldCrud.error && <ErrorBox error={fieldCrud.error} />}
        {!family && <EmptyState icon="👈" title={t('config.fields.chooseFamily')} />}
        {family && (family.fields || []).length === 0 && (
          <EmptyState icon="📝" title={t('config.fields.emptyTitle')}>{t('config.fields.emptyText')}</EmptyState>
        )}
        {family && (family.fields || []).length > 0 && (
          <div className="table-wrap">
            <table className="table table-cards">
              <thead>
                <tr>
                  <th>{t('config.fields.columns.orden')}</th>
                  <th>{t('config.fields.columns.label')}</th>
                  <th>{t('config.fields.columns.key')}</th>
                  <th>{t('config.fields.columns.type')}</th>
                  <th>{t('config.fields.columns.unit')}</th>
                  <th><span className="sr-only">{t('common.actions')}</span></th>
                </tr>
              </thead>
              <tbody>
                {[...family.fields].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)).map((field) => (
                  <tr key={field.id}>
                    <td data-label={t('config.fields.columns.orden')}>{field.orden ?? '—'}</td>
                    <td className="td-title">
                      <strong>{fieldLabel(family.code, field)}</strong>
                      {field.calculado && <> <Badge tone="blue">{t('config.fields.calculated')}</Badge></>}
                      {field.options?.length ? <div className="small muted">{field.options.join(' · ')}</div> : null}
                    </td>
                    <td data-label={t('config.fields.columns.key')}><code>{field.key}</code></td>
                    <td data-label={t('config.fields.columns.type')}>{labelOf(catalog, 'fieldType', field.type)}</td>
                    <td data-label={t('config.fields.columns.unit')}>{field.unit || '—'}</td>
                    <td className="nowrap">
                      <div className="btn-row">
                        <button type="button" className="btn btn--sm" onClick={() => fieldCrud.setEditing({ item: field })}>{t('common.edit')}</button>
                        <button type="button" className="btn btn--sm btn--danger" onClick={() => fieldCrud.setDeleting(field)}>{t('config.delete')}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {famCrud.editing && (
        <FormModal
          title={famCrud.editing.item ? t('config.editTitle', { name: familyName(famCrud.editing.item) }) : t('config.families.newTitle')}
          specs={familySpecs(!famCrud.editing.item)}
          initial={famCrud.editing.item || { orden: families.length + 1 }}
          onClose={() => famCrud.setEditing(null)}
          onSubmit={(body) => famCrud.save(async () => {
            if (famCrud.editing.item) {
              await updateFamily(famCrud.editing.item.code, body);
            } else {
              const created = await createFamily(body);
              setSelected(created?.family?.code || body.code);
            }
          })}
        />
      )}
      {fieldCrud.editing && family && (
        <FormModal
          title={fieldCrud.editing.item
            ? t('config.fields.editTitle', { name: fieldLabel(family.code, fieldCrud.editing.item) })
            : t('config.fields.newTitle', { family: familyName(family) })}
          specs={fieldSpecs}
          initial={fieldCrud.editing.item || { orden: (family.fields || []).length + 1 }}
          onClose={() => fieldCrud.setEditing(null)}
          onSubmit={(body) => fieldCrud.save(() => (fieldCrud.editing.item
            ? updateFamilyField(family.code, fieldCrud.editing.item.id, body)
            : createFamilyField(family.code, body)))}
        />
      )}
      <ConfirmModal
        open={Boolean(famCrud.deleting)}
        title={t('config.families.confirmDeleteTitle')}
        message={famCrud.deleting ? t('config.families.confirmDeleteMessage', { name: familyName(famCrud.deleting) }) : ''}
        confirmLabel={t('config.delete')}
        danger
        busy={famCrud.busy}
        onClose={() => famCrud.setDeleting(null)}
        onConfirm={() => famCrud.confirmDelete(
          () => deleteFamily(famCrud.deleting.code),
          t('config.families.deleteInUse'),
        )}
      />
      <ConfirmModal
        open={Boolean(fieldCrud.deleting)}
        title={t('config.fields.confirmDeleteTitle')}
        message={fieldCrud.deleting ? t('config.fields.confirmDeleteMessage', { name: fieldLabel(family?.code, fieldCrud.deleting) }) : ''}
        confirmLabel={t('config.delete')}
        danger
        busy={fieldCrud.busy}
        onClose={() => fieldCrud.setDeleting(null)}
        onConfirm={() => fieldCrud.confirmDelete(() => deleteFamilyField(family.code, fieldCrud.deleting.id))}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Plantillas de entregables
// ---------------------------------------------------------------------------

function TemplatesTab({ boot, refreshBoot }) {
  const { t } = useI18n();
  const { catalog } = boot;
  const [camino, setCamino] = useState(catalog.caminos[0]);
  const crud = useCrud(refreshBoot);
  const phases = catalog.phasesByCamino[camino] || [];
  const templates = (boot.templates || []).filter((tpl) => tpl.camino === camino);

  const specs = (isNew, fase) => [
    {
      key: 'fase',
      label: t('config.templates.fields.fase'),
      type: 'select',
      required: true,
      default: fase || phases[0],
      readOnly: !isNew,
      options: phases.map((value) => ({ value, label: phaseLabelOf(catalog, value) })),
    },
    { key: 'texto', label: t('config.templates.fields.texto'), required: true, span: true },
    { key: 'orden', label: t('config.templates.fields.orden'), type: 'number' },
    { key: 'obligatorio', label: t('config.templates.fields.obligatorio'), type: 'bool', default: true },
  ];

  return (
    <section className="card">
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <div className="tabs" role="tablist" style={{ marginBottom: 0, borderBottom: 'none' }}>
          {catalog.caminos.map((c) => (
            <button key={c} type="button" role="tab" className="tab" aria-selected={camino === c} onClick={() => setCamino(c)}>
              {caminoLabel(c)}
            </button>
          ))}
        </div>
        <span className="small muted">{t('config.templates.note')}</span>
      </div>
      {crud.error && <ErrorBox error={crud.error} />}
      <div className="grid-2">
        {phases.map((fase) => {
          const items = templates.filter((tpl) => tpl.fase === fase).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
          return (
            <div key={fase} className="card" style={{ boxShadow: 'none' }}>
              <div className="card__title">
                <span>{phaseLabelOf(catalog, fase)} <small>{items.length}</small></span>
                <button type="button" className="btn btn--sm" onClick={() => crud.setEditing({ item: null, fase })}>{t('config.templates.add')}</button>
              </div>
              {items.length === 0 ? (
                <p className="small muted mt-0">{t('config.templates.empty')}</p>
              ) : (
                <ul className="list">
                  {items.map((tpl) => (
                    <li key={tpl.id} className="list__item">
                      <div className="list__main">
                        <div className="list__title" style={{ fontWeight: 500 }}>{deliverableText(tpl.texto)}</div>
                        <div className="list__meta">
                          {tpl.obligatorio
                            ? <Badge tone="amber">{t('config.templates.required')}</Badge>
                            : <Badge>{t('config.templates.optional')}</Badge>}
                          {tpl.orden !== null && tpl.orden !== undefined ? ` · ${t('config.templates.order', { order: tpl.orden })}` : ''}
                        </div>
                      </div>
                      <span className="btn-row">
                        <button type="button" className="btn btn--sm" onClick={() => crud.setEditing({ item: tpl, fase })}>{t('common.edit')}</button>
                        <button
                          type="button"
                          className="btn btn--sm btn--danger"
                          onClick={() => crud.setDeleting(tpl)}
                          aria-label={t('config.templates.deleteAria', { name: deliverableText(tpl.texto) })}
                        >
                          ×
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {crud.editing && (
        <FormModal
          title={crud.editing.item ? t('config.templates.editTitle') : t('config.templates.newTitle', { camino: caminoLabel(camino) })}
          specs={specs(!crud.editing.item, crud.editing.fase)}
          initial={crud.editing.item || { fase: crud.editing.fase }}
          onClose={() => crud.setEditing(null)}
          onSubmit={(body) => crud.save(() => (crud.editing.item
            ? updateTemplate(crud.editing.item.id, body)
            : createTemplate({ ...body, camino })))}
        />
      )}
      <ConfirmModal
        open={Boolean(crud.deleting)}
        title={t('config.templates.confirmDeleteTitle')}
        message={crud.deleting ? t('config.templates.confirmDeleteMessage', { name: deliverableText(crud.deleting.texto) }) : ''}
        confirmLabel={t('config.delete')}
        danger
        busy={crud.busy}
        onClose={() => crud.setDeleting(null)}
        onConfirm={() => crud.confirmDelete(() => deleteTemplate(crud.deleting.id))}
      />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Datos iniciales
// ---------------------------------------------------------------------------

function SeedTab({ refreshBoot }) {
  const { t } = useI18n();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const data = await runSeed();
      setResult(data);
      setConfirm(false);
      await refreshBoot();
    } catch (err) {
      setError(err);
      setConfirm(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card stack">
      <div>
        <h2>{t('config.seed.title')}</h2>
        <p className="mt-0">
          {t('config.seed.intro')} {t('config.seed.safeToRepeat')}
        </p>
      </div>
      {error && <ErrorBox error={error} title={t('config.seed.errorTitle')} />}
      {result && (
        <div className="notice">
          <strong>{t('config.seed.done')}</strong>
          <div className="table-wrap" style={{ marginTop: 8 }}>
            <table className="table">
              <thead>
                <tr><th>{t('config.seed.columns.type')}</th><th className="num">{t('config.seed.columns.created')}</th><th className="num">{t('config.seed.columns.skipped')}</th></tr>
              </thead>
              <tbody>
                {Object.keys({ ...(result.created || {}), ...(result.skipped || {}) }).map((key) => (
                  <tr key={key}>
                    <td>{t(`config.seed.labels.${key}`, { defaultValue: key })}</td>
                    <td className="num">{result.created?.[key] ?? 0}</td>
                    <td className="num">{result.skipped?.[key] ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div>
        <button type="button" className="btn btn--primary" onClick={() => setConfirm(true)} disabled={busy}>
          {busy ? t('config.seed.loading') : t('config.seed.run')}
        </button>
      </div>
      <ConfirmModal
        open={confirm}
        title={t('config.seed.confirmTitle')}
        message={t('config.seed.confirmMessage')}
        confirmLabel={t('config.seed.confirmLabel')}
        busy={busy}
        onClose={() => setConfirm(false)}
        onConfirm={run}
      />
    </section>
  );
}
