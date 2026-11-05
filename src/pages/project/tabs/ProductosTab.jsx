import { useState } from 'react';
import { createProduct, deleteProduct, updateProduct } from '../../../api/project.js';
import { DeleteButton, Empty, ErrorMessage, FieldInput, FieldRow, Modal, SectionHead } from '../ui.jsx';
import { formatNumber } from '../lib/format.js';
import { labelOf } from '../../../lib/format.js';
import { familyName, fieldLabel } from '../../../i18n/labels.js';
import { useI18n } from '../../../i18n/I18nProvider.jsx';
import { emptyToNull, extraSpecsToList, formToPiezas, formToSpecs, numericFields, specsToForm } from '../lib/forms.js';

function specValue(t, field, value) {
  if (value === null || value === undefined || value === '') return '—';
  if (field?.type === 'bool') return value === true ? t('common.yes') : t('common.no');
  if (field?.type === 'number') return `${formatNumber(value)}${field.unit ? ` ${field.unit}` : ''}`;
  return `${value}${field?.unit ? ` ${field.unit}` : ''}`;
}

// Opciones de un enum del catálogo con la etiqueta en el idioma activo.
function enumOptions(catalog, enumName) {
  return (catalog?.enums?.[enumName] || []).map((value) => ({ value, label: labelOf(catalog, enumName, value) }));
}

function fieldOptions(field) {
  const raw = Array.isArray(field.options) ? field.options : [];
  return raw.map((option) => ({ value: option, label: option }));
}

function ProductModal({ ctx, product, onClose }) {
  const { t } = useI18n();
  const { catalog, familyFields, project } = ctx;
  const [form, setForm] = useState(() => ({
    nombre: product?.nombre || '',
    componente: product?.componente || '',
    codigoAlsina: product?.codigoAlsina || '',
    origen: product?.origen || (project.camino === 'oem' ? 'oem' : 'propio'),
    pesoKg: product?.pesoKg ?? '',
    dimsTransporte: product?.dimsTransporte || '',
    udsPorCamion: product?.udsPorCamion ?? '',
    notas: product?.notas || '',
  }));
  const [specs, setSpecs] = useState(() => specsToForm(familyFields, product?.specs));
  const [extras, setExtras] = useState(() => extraSpecsToList(familyFields, product?.specs));
  const [piezas, setPiezas] = useState(() =>
    (product?.piezasTransporte || []).map((pieza) => ({ nombre: pieza.nombre || '', pesoKg: pieza.pesoKg ?? '', dims: pieza.dims || '' })),
  );
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (name) => (event) => setForm((prev) => ({ ...prev, [name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    const localErrors = {};
    if (!form.nombre.trim()) localErrors.nombre = t('tabs.products.nameRequired');
    const nums = numericFields(form, ['pesoKg', 'udsPorCamion'], {
      pesoKg: t('tabs.products.weightSubject'),
      udsPorCamion: t('tabs.products.unitsSubject'),
    });
    Object.assign(localErrors, nums.errors);
    if (nums.values.udsPorCamion !== null && nums.values.udsPorCamion !== undefined && !Number.isInteger(nums.values.udsPorCamion)) {
      localErrors.udsPorCamion = t('tabs.products.unitsInteger');
    }
    const specResult = formToSpecs(familyFields, specs, extras);
    Object.assign(localErrors, specResult.errors);
    const piezasResult = formToPiezas(piezas);
    Object.assign(localErrors, piezasResult.errors);
    setErrors(localErrors);
    if (Object.keys(localErrors).length) {
      setError(t('tabs.reviewFields'));
      return;
    }
    const payload = {
      nombre: form.nombre.trim(),
      componente: form.componente.trim(),
      codigoAlsina: emptyToNull(form.codigoAlsina),
      origen: form.origen,
      specs: specResult.specs,
      pesoKg: nums.values.pesoKg,
      dimsTransporte: form.dimsTransporte.trim(),
      udsPorCamion: nums.values.udsPorCamion,
      piezasTransporte: piezasResult.piezas,
      notas: emptyToNull(form.notas),
    };
    setSaving(true);
    setError(null);
    try {
      if (product) await updateProduct(project.id, product.id, payload);
      else await createProduct(project.id, payload);
      await ctx.reload();
      onClose();
    } catch (err) {
      setErrors(err?.fields || {});
      setError(err);
      setSaving(false);
    }
  };

  const setPieza = (index, key, value) =>
    setPiezas((prev) => prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)));

  return (
    <Modal title={product ? t('tabs.products.editTitle', { name: product.nombre }) : t('tabs.products.newTitle')} onClose={onClose} wide>
      <form className="pd-form" onSubmit={submit} noValidate>
        <div className="pd-form__grid">
          <FieldRow label={t('common.name')} required error={errors.nombre}>
            <input type="text" value={form.nombre} onChange={set('nombre')} />
          </FieldRow>
          <FieldRow label={t('tabs.products.component')} error={errors.componente}>
            <input type="text" value={form.componente} onChange={set('componente')} placeholder={t('tabs.products.componentPlaceholder')} />
          </FieldRow>
          <FieldRow label={t('tabs.products.alsinaCode')} error={errors.codigoAlsina}>
            <input type="text" value={form.codigoAlsina} onChange={set('codigoAlsina')} />
          </FieldRow>
          <FieldRow label={t('tabs.products.origin')} error={errors.origen}>
            <select value={form.origen} onChange={set('origen')}>
              {enumOptions(catalog, 'productOrigen').map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FieldRow>
        </div>

        <h4 className="pd-form__subtitle">{t('tabs.products.techSheetOf', { family: familyName(ctx.family || project.familyCode) })}</h4>
        {familyFields.length ? (
          <div className="pd-form__grid">
            {familyFields.map((field) => {
              const fieldDef = {
                type: field.type === 'bool' ? 'checkbox' : field.type === 'select' ? 'select' : field.type === 'number' ? 'number' : 'text',
                options: fieldOptions(field),
                readOnly: Boolean(field.calculado),
              };
              return (
                <FieldRow
                  key={field.key}
                  label={`${fieldLabel(project.familyCode, field)}${field.unit ? ` (${field.unit})` : ''}`}
                  error={errors[`specs.${field.key}`]}
                  help={field.calculado ? t('tabs.products.computedHelp') : undefined}
                >
                  <FieldInput
                    field={fieldDef}
                    value={specs[field.key]}
                    onChange={(value) => setSpecs((prev) => ({ ...prev, [field.key]: value }))}
                  />
                </FieldRow>
              );
            })}
          </div>
        ) : (
          <p className="pd-muted pd-small">{t('tabs.products.noFamilyFields')}</p>
        )}

        <div className="pd-subhead">
          <span>{t('tabs.products.freeSpecs')}</span>
          <button type="button" className="pd-btn pd-btn--sm" onClick={() => setExtras((prev) => [...prev, { key: '', value: '' }])}>
            {t('common.add')}
          </button>
        </div>
        {extras.map((extra, index) => (
          <div className="pd-pair" key={index}>
            <input
              type="text"
              aria-label={t('tabs.products.specName')}
              placeholder={t('tabs.products.specPlaceholder')}
              value={extra.key}
              onChange={(event) => setExtras((prev) => prev.map((row, i) => (i === index ? { ...row, key: event.target.value } : row)))}
            />
            <input
              type="text"
              aria-label={t('tabs.products.value')}
              placeholder={t('tabs.products.value')}
              value={extra.value}
              onChange={(event) => setExtras((prev) => prev.map((row, i) => (i === index ? { ...row, value: event.target.value } : row)))}
            />
            <button type="button" className="pd-icon-btn" aria-label={t('tabs.products.remove')} onClick={() => setExtras((prev) => prev.filter((_, i) => i !== index))}>
              ×
            </button>
          </div>
        ))}

        <h4 className="pd-form__subtitle">{t('tabs.products.logisticsTitle')}</h4>
        <div className="pd-form__grid">
          <FieldRow label={t('tabs.products.weightKg')} error={errors.pesoKg}>
            <input type="text" inputMode="decimal" value={form.pesoKg} onChange={set('pesoKg')} />
          </FieldRow>
          <FieldRow label={t('tabs.products.transportDims')} error={errors.dimsTransporte}>
            <input type="text" value={form.dimsTransporte} onChange={set('dimsTransporte')} placeholder="4900×900×1300" />
          </FieldRow>
          <FieldRow label={t('tabs.products.unitsPerTruck')} error={errors.udsPorCamion}>
            <input type="text" inputMode="numeric" value={form.udsPorCamion} onChange={set('udsPorCamion')} />
          </FieldRow>
        </div>

        <div className="pd-subhead">
          <span>{t('tabs.products.pieces')}</span>
          <button type="button" className="pd-btn pd-btn--sm" onClick={() => setPiezas((prev) => [...prev, { nombre: '', pesoKg: '', dims: '' }])}>
            {t('tabs.products.addPiece')}
          </button>
        </div>
        {piezas.map((pieza, index) => (
          <div key={index}>
            <div className="pd-pair pd-pair--3">
              <input type="text" aria-label={t('tabs.products.piece')} placeholder={t('tabs.products.piece')} value={pieza.nombre} onChange={(event) => setPieza(index, 'nombre', event.target.value)} />
              <input type="text" aria-label={t('tabs.products.weightKg')} inputMode="decimal" placeholder={t('tabs.products.weightKgShort')} value={pieza.pesoKg} onChange={(event) => setPieza(index, 'pesoKg', event.target.value)} />
              <input type="text" aria-label={t('tabs.products.dimensions')} placeholder={t('tabs.products.dimensions')} value={pieza.dims} onChange={(event) => setPieza(index, 'dims', event.target.value)} />
              <button type="button" className="pd-icon-btn" aria-label={t('tabs.products.removePiece')} onClick={() => setPiezas((prev) => prev.filter((_, i) => i !== index))}>
                ×
              </button>
            </div>
            {errors[`piezasTransporte.${index}`] ? <span className="pd-field__error">{errors[`piezasTransporte.${index}`]}</span> : null}
          </div>
        ))}

        <FieldRow label={t('common.notes')} full error={errors.notas}>
          <textarea rows={3} value={form.notas} onChange={set('notas')} />
        </FieldRow>

        <ErrorMessage error={error} />
        <div className="pd-form__actions">
          <button type="button" className="pd-btn" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="pd-btn pd-btn--primary" disabled={saving}>
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ProductCard({ ctx, product, onEdit }) {
  const { t } = useI18n();
  const { catalog, familyFields, perms, project } = ctx;
  const specs = product.specs || {};
  const known = new Set(familyFields.map((field) => field.key));
  const rows = [
    ...familyFields.filter((field) => specs[field.key] !== undefined && specs[field.key] !== null && specs[field.key] !== '').map((field) => ({
      key: field.key,
      label: fieldLabel(project.familyCode, field),
      value: specValue(t, field, specs[field.key]),
    })),
    ...Object.keys(specs)
      .filter((key) => !known.has(key) && specs[key] !== null && specs[key] !== '')
      .map((key) => ({ key, label: key, value: specValue(t, null, specs[key]) })),
  ];
  const piezas = product.piezasTransporte || [];
  return (
    <article className="pd-card">
      <header className="pd-card__head">
        <div>
          <h4>{product.nombre}</h4>
          <span className="pd-muted pd-small">
            {[
              product.componente,
              labelOf(catalog, 'productOrigen', product.origen),
              product.codigoAlsina ? t('tabs.products.alsinaCodeShort', { code: product.codigoAlsina }) : '',
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </div>
        {perms.products ? (
          <div className="pd-row-actions">
            <button type="button" className="pd-btn pd-btn--sm" onClick={onEdit}>
              {t('common.edit')}
            </button>
            <DeleteButton confirmText={t('tabs.products.confirmDelete', { name: product.nombre })} onDelete={async () => {
              await deleteProduct(project.id, product.id);
              await ctx.reload();
            }} />
          </div>
        ) : null}
      </header>
      <div className="pd-card__cols">
        <div>
          <h5>{t('tabs.products.techSheet')}</h5>
          {rows.length ? (
            <dl className="pd-spec">
              {rows.map((row) => (
                <div key={row.key}>
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="pd-muted pd-small">{t('tabs.products.noSpecs')}</p>
          )}
        </div>
        <div>
          <h5>{t('tabs.products.logistics')}</h5>
          <dl className="pd-spec">
            <div>
              <dt>{t('tabs.products.weight')}</dt>
              <dd>{product.pesoKg !== null && product.pesoKg !== undefined ? `${formatNumber(product.pesoKg)} kg` : '—'}</dd>
            </div>
            <div>
              <dt>{t('tabs.products.transportDimsShort')}</dt>
              <dd>{product.dimsTransporte || '—'}</dd>
            </div>
            <div>
              <dt>{t('tabs.products.unitsPerTruck')}</dt>
              <dd>{product.udsPorCamion ?? '—'}</dd>
            </div>
          </dl>
          {piezas.length ? (
            <table className="pd-table pd-table--compact">
              <thead>
                <tr>
                  <th>{t('tabs.products.piece')}</th>
                  <th className="pd-num">{t('tabs.products.weightKgShort')}</th>
                  <th>{t('tabs.products.dimensions')}</th>
                </tr>
              </thead>
              <tbody>
                {piezas.map((pieza, index) => (
                  <tr key={index}>
                    <td>{pieza.nombre}</td>
                    <td className="pd-num">{formatNumber(pieza.pesoKg)}</td>
                    <td>{pieza.dims || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      </div>
      {product.notas ? <p className="pd-small">{product.notas}</p> : null}
    </article>
  );
}

export default function ProductosTab({ ctx }) {
  const { t } = useI18n();
  const { data, perms } = ctx;
  const [editing, setEditing] = useState(null); // null | 'new' | product
  const products = data.products || [];
  const add = perms.products ? (
    <button type="button" className="pd-btn pd-btn--primary" onClick={() => setEditing('new')}>
      {t('tabs.products.add')}
    </button>
  ) : null;
  return (
    <div className="pd-stack">
      <SectionHead title={t('tabs.products.title')}>{products.length ? add : null}</SectionHead>
      {products.length ? (
        <div className="pd-cards">
          {products.map((product) => (
            <ProductCard key={product.id} ctx={ctx} product={product} onEdit={() => setEditing(product)} />
          ))}
        </div>
      ) : (
        <Empty action={add}>{t('tabs.products.empty')}</Empty>
      )}
      {editing ? <ProductModal ctx={ctx} product={editing === 'new' ? null : editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}
