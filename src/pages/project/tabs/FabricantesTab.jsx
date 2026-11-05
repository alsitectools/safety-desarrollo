import { useMemo, useState } from 'react';
import {
  addProjectSupplier,
  createQuote,
  deleteProjectSupplier,
  deleteQuote,
  updateProjectSupplier,
  updateQuote,
} from '../../../api/project.js';
import { Badge, DeleteButton, Empty, FormModal, SectionHead } from '../ui.jsx';
import { formatDate, formatMoney, formatNumber } from '../lib/format.js';
import { labelOf } from '../../../lib/format.js';
import { fieldLabel } from '../../../i18n/labels.js';
import { useI18n } from '../../../i18n/I18nProvider.jsx';
import { buildComparison, defaultCandidates } from '../lib/compare.js';
import { productOptions, supplierOptions } from '../lib/options.js';
import { buildHash } from '../../../lib/router.js';

const STATE_TONES = {
  identificado: 'neutral',
  contactado: 'neutral',
  oferta: 'phase',
  muestras: 'phase',
  ensayos: 'warn',
  homologado: 'ok',
  pedido: 'ok',
  aparcado: 'muted',
  descartado: 'muted',
};

// Opciones de un enum del catálogo con la etiqueta en el idioma activo.
function enumOptions(catalog, enumName) {
  return (catalog?.enums?.[enumName] || []).map((value) => ({ value, label: labelOf(catalog, enumName, value) }));
}

function relationFields(ctx, t, { isNew }) {
  const { catalog, suppliers, data } = ctx;
  const fields = [];
  if (isNew) {
    fields.push({ name: 'supplierId', label: t('tabs.suppliers.supplier'), type: 'select', required: true, options: supplierOptions(suppliers), full: true,
      help: t('tabs.suppliers.supplierHelp') });
  }
  fields.push(
    { name: 'productId', label: t('tabs.suppliers.projectProduct'), type: 'id', options: productOptions(data.products) },
    { name: 'rol', label: t('tabs.suppliers.role'), type: 'select', required: true, options: enumOptions(catalog, 'psRol') },
    { name: 'estado', label: t('common.status'), type: 'select', required: true, options: enumOptions(catalog, 'psEstado') },
    { name: 'notas', label: t('common.notes'), type: 'textarea' },
  );
  return fields;
}

function quoteFields(t) {
  return [
    { name: 'referencia', label: t('tabs.suppliers.reference'), emptyAs: '' },
    { name: 'fecha', label: t('common.date'), type: 'date' },
    { name: 'importe', label: t('tabs.suppliers.amount'), type: 'number' },
    { name: 'moneda', label: t('tabs.suppliers.currency'), type: 'currency', default: 'EUR' },
    { name: 'incoterm', label: t('tabs.suppliers.incoterm'), emptyAs: '', placeholder: 'FOB, FCA, EXW…' },
    { name: 'plazoTexto', label: t('tabs.suppliers.leadTime'), emptyAs: '', placeholder: t('tabs.suppliers.leadTimePlaceholder') },
    { name: 'validez', label: t('tabs.suppliers.validUntil'), type: 'date' },
    { name: 'notas', label: t('common.notes'), type: 'textarea' },
  ];
}

function QuoteList({ ctx, ps, onEdit }) {
  const { t } = useI18n();
  const { perms, project } = ctx;
  const quotes = ps.quotes || [];
  if (!quotes.length) return <p className="pd-muted pd-small">{t('tabs.suppliers.noQuotes')}</p>;
  return (
    <div className="pd-table-wrap">
      <table className="pd-table pd-table--compact">
        <thead>
          <tr>
            <th>{t('tabs.suppliers.reference')}</th>
            <th>{t('common.date')}</th>
            <th className="pd-num">{t('tabs.suppliers.amount')}</th>
            <th>{t('tabs.suppliers.incoterm')}</th>
            <th>{t('tabs.suppliers.leadTime')}</th>
            <th>{t('tabs.suppliers.validity')}</th>
            {perms.quotes ? <th aria-label={t('common.actions')} /> : null}
          </tr>
        </thead>
        <tbody>
          {quotes.map((quote) => (
            <tr key={quote.id}>
              <td>
                {quote.referencia || '—'}
                {quote.notas ? <div className="pd-muted pd-small">{quote.notas}</div> : null}
              </td>
              <td>{formatDate(quote.fecha)}</td>
              <td className="pd-num">{formatMoney(quote.importe, quote.moneda)}</td>
              <td>{quote.incoterm || '—'}</td>
              <td>{quote.plazoTexto || '—'}</td>
              <td>{formatDate(quote.validez)}</td>
              {perms.quotes ? (
                <td className="pd-cell-actions"><div className="pd-row-actions">
                  <button type="button" className="pd-btn pd-btn--sm" onClick={() => onEdit(quote)}>
                    {t('common.edit')}
                  </button>
                  <DeleteButton confirmText={t('tabs.suppliers.confirmDeleteQuote')} onDelete={async () => {
                    await deleteQuote(project.id, ps.id, quote.id);
                    await ctx.reload();
                  }} />
                </div></td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Comparison({ ctx }) {
  const { t } = useI18n();
  const { data, familyFields, catalog, project } = ctx;
  const [includeDiscarded, setIncludeDiscarded] = useState(false);
  const candidates = defaultCandidates(data.suppliers, { includeDiscarded });
  const { columns, rows } = useMemo(
    () => buildComparison({ projectSuppliers: candidates, products: data.products, fields: familyFields }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.suppliers, data.products, familyFields, includeDiscarded],
  );
  // Las filas de campos técnicos de la familia se rotulan en el idioma activo.
  const specFields = useMemo(() => new Map((familyFields || []).map((field) => [`spec.${field.key}`, field])), [familyFields]);
  const rowLabel = (row) => (specFields.has(row.key) ? fieldLabel(project?.familyCode, specFields.get(row.key)) : row.label);

  const renderValue = (row, value, index) => {
    if (value === null || value === undefined || value === '') return <span className="pd-muted">—</span>;
    if (row.type === 'money') return formatMoney(value, row.currencies?.[index]);
    if (row.type === 'date') return formatDate(value);
    if (typeof value === 'boolean') return value ? t('common.yes') : t('common.no');
    if (row.type === 'number' || typeof value === 'number') return `${formatNumber(value)}${row.unit ? ` ${row.unit}` : ''}`;
    return `${value}${row.unit ? ` ${row.unit}` : ''}`;
  };

  return (
    <div className="pd-stack">
      <label className="pd-check">
        <input type="checkbox" checked={includeDiscarded} onChange={(event) => setIncludeDiscarded(event.target.checked)} />
        {t('tabs.suppliers.includeDiscarded')}
      </label>
      {columns.length < 1 ? (
        <Empty>{t('tabs.suppliers.noCandidates')}</Empty>
      ) : (
        <>
          <div className="pd-table-wrap">
            <table className="pd-table pd-compare">
              <thead>
                <tr>
                  <th scope="col">{t('tabs.suppliers.feature')}</th>
                  {columns.map((col) => (
                    <th key={col.id} scope="col">
                      <div>{col.nombre}</div>
                      <div className="pd-small pd-muted">
                        {[col.pais, labelOf(catalog, 'psRol', col.rol)].filter(Boolean).join(' · ')}
                      </div>
                      <Badge tone={STATE_TONES[col.estado] || 'neutral'}>{labelOf(catalog, 'psEstado', col.estado)}</Badge>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => {
                  const groupStart = rowIndex === 0 || rows[rowIndex - 1].group !== row.group;
                  return (
                    <tr key={row.key} className={groupStart ? 'pd-compare__group-start' : undefined}>
                      <th scope="row">{rowLabel(row)}</th>
                      {row.values.map((value, index) => (
                        <td key={columns[index].id} className={row.best === index ? 'pd-compare__best' : undefined}>
                          {renderValue(row, value, index)}
                          {row.best === index ? <span className="pd-small"> {t('tabs.suppliers.lowest')}</span> : null}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="pd-muted pd-small">{t('tabs.suppliers.compareNote')}</p>
        </>
      )}
    </div>
  );
}

export default function FabricantesTab({ ctx }) {
  const { t } = useI18n();
  const { data, perms, catalog, project, navigate } = ctx;
  const [view, setView] = useState('lista');
  const [modal, setModal] = useState(null); // { kind: 'relation', ps? } | { kind: 'quote', ps, quote? }
  const list = data.suppliers || [];
  const productName = (productId) => (data.products || []).find((product) => Number(product.id) === Number(productId))?.nombre;

  const add = perms.projectSuppliers ? (
    <button type="button" className="pd-btn pd-btn--primary" onClick={() => setModal({ kind: 'relation' })}>
      {t('tabs.suppliers.add')}
    </button>
  ) : null;

  return (
    <div className="pd-stack">
      <SectionHead title={t('tabs.suppliers.title')}>
        <div className="pd-segmented" role="group" aria-label={t('tabs.suppliers.view')}>
          <button type="button" aria-pressed={view === 'lista'} className={view === 'lista' ? 'is-active' : ''} onClick={() => setView('lista')}>
            {t('tabs.suppliers.list')}
          </button>
          <button type="button" aria-pressed={view === 'comparativa'} className={view === 'comparativa' ? 'is-active' : ''} onClick={() => setView('comparativa')}>
            {t('tabs.suppliers.comparison')}
          </button>
        </div>
        {list.length ? add : null}
      </SectionHead>

      {view === 'comparativa' ? (
        <Comparison ctx={ctx} />
      ) : list.length ? (
        <div className="pd-cards">
          {list.map((ps) => (
            <article className="pd-card" key={ps.id}>
              <header className="pd-card__head">
                <div>
                  <h4>
                    {navigate ? (
                      <button type="button" className="pd-link-btn" onClick={() => navigate(buildHash('fabricantes', ps.supplierId))}>
                        {ps.supplierNombre}
                      </button>
                    ) : (
                      ps.supplierNombre
                    )}
                  </h4>
                  <span className="pd-muted pd-small">
                    {[ps.supplierPais, labelOf(catalog, 'psRol', ps.rol), productName(ps.productId)].filter(Boolean).join(' · ')}
                  </span>
                </div>
                <Badge tone={STATE_TONES[ps.estado] || 'neutral'}>{labelOf(catalog, 'psEstado', ps.estado)}</Badge>
              </header>
              {ps.notas ? <p className="pd-small">{ps.notas}</p> : null}
              {ps.lastQuote ? (
                <p className="pd-small">
                  <strong>{t('tabs.suppliers.lastQuote')}</strong> {formatMoney(ps.lastQuote.importe, ps.lastQuote.moneda)}
                  {ps.lastQuote.incoterm ? ` ${ps.lastQuote.incoterm}` : ''} · {formatDate(ps.lastQuote.fecha)}
                  {ps.lastQuote.validez ? ` · ${t('tabs.suppliers.validUntilDate', { date: formatDate(ps.lastQuote.validez) })}` : ''}
                </p>
              ) : null}
              <details>
                <summary>{t('tabs.suppliers.quotesCount', { count: (ps.quotes || []).length })}</summary>
                <QuoteList ctx={ctx} ps={ps} onEdit={(quote) => setModal({ kind: 'quote', ps, quote })} />
              </details>
              {perms.projectSuppliers || perms.quotes ? (
                <div className="pd-row-actions">
                  {perms.quotes ? (
                    <button type="button" className="pd-btn pd-btn--sm" onClick={() => setModal({ kind: 'quote', ps })}>
                      {t('tabs.suppliers.addQuote')}
                    </button>
                  ) : null}
                  {perms.projectSuppliers ? (
                    <>
                      <button type="button" className="pd-btn pd-btn--sm" onClick={() => setModal({ kind: 'relation', ps })}>
                        {t('common.edit')}
                      </button>
                      <DeleteButton
                        label={t('tabs.suppliers.remove')}
                        confirmText={t('tabs.suppliers.confirmRemove', { name: ps.supplierNombre })}
                        onDelete={async () => {
                          await deleteProjectSupplier(project.id, ps.id);
                          await ctx.reload();
                        }}
                      />
                    </>
                  ) : null}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <Empty action={add}>{t('tabs.suppliers.empty')}</Empty>
      )}

      {modal?.kind === 'relation' ? (
        <FormModal
          title={modal.ps ? t('tabs.suppliers.editTitle', { name: modal.ps.supplierNombre }) : t('tabs.suppliers.addTitle')}
          fields={relationFields(ctx, t, { isNew: !modal.ps })}
          initial={modal.ps || { rol: project.camino === 'oem' ? 'candidato_oem' : 'fabricante', estado: 'identificado', supplierId: '' }}
          onClose={() => setModal(null)}
          onSubmit={async (payload) => {
            if (modal.ps) await updateProjectSupplier(project.id, modal.ps.id, payload);
            else await addProjectSupplier(project.id, { ...payload, supplierId: Number(payload.supplierId) });
            await ctx.reload();
          }}
        />
      ) : null}
      {modal?.kind === 'quote' ? (
        <FormModal
          title={modal.quote ? t('tabs.suppliers.editQuote') : t('tabs.suppliers.newQuote', { name: modal.ps.supplierNombre })}
          fields={quoteFields(t)}
          initial={modal.quote || { moneda: 'EUR', fecha: ctx.today || '' }}
          onClose={() => setModal(null)}
          onSubmit={async (payload) => {
            if (modal.quote) await updateQuote(project.id, modal.ps.id, modal.quote.id, payload);
            else await createQuote(project.id, modal.ps.id, payload);
            await ctx.reload();
          }}
        />
      ) : null}
    </div>
  );
}
