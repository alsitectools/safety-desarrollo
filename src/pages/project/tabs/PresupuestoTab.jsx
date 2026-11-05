import { useState } from 'react';
import { createBudgetLine, deleteBudgetLine, updateBudgetLine } from '../../../api/project.js';
import { Badge, DeleteButton, Empty, FormModal, SectionHead } from '../ui.jsx';
import { formatMoney, formatNumber, parseNumberInput, supplierName } from '../lib/format.js';
import { labelOf } from '../../../lib/format.js';
import { useI18n } from '../../../i18n/I18nProvider.jsx';
import { deviationPct, deviationTone, isPlannedComputed, lineDeviation, plannedAmount, totalsByCurrency, totalsByType, typeTotalsRows } from '../lib/budget.js';
import { supplierOptions } from '../lib/options.js';

const STATE_TONES = { previsto: 'neutral', comprometido: 'warn', pagado: 'ok' };

// Opciones de un enum del catálogo con la etiqueta en el idioma activo.
function enumOptions(catalog, enumName) {
  return (catalog?.enums?.[enumName] || []).map((value) => ({ value, label: labelOf(catalog, enumName, value) }));
}

function budgetFields(ctx, t) {
  const { catalog, suppliers } = ctx;
  return [
    { name: 'concepto', label: t('tabs.budget.concept'), required: true, full: true },
    { name: 'tipo', label: t('tabs.budget.type'), type: 'select', required: true, options: enumOptions(catalog, 'budgetTipo') },
    { name: 'supplierId', label: t('tabs.budget.supplier'), type: 'id', options: supplierOptions(suppliers) },
    { name: 'unidades', label: t('tabs.budget.units'), type: 'number' },
    { name: 'precioUnitario', label: t('tabs.budget.unitPrice'), type: 'number' },
    { name: 'porte', label: t('tabs.budget.freight'), type: 'number' },
    { name: 'moneda', label: t('tabs.budget.currency'), type: 'currency', default: 'EUR' },
    { name: 'previsto', label: t('tabs.budget.planned'), type: 'number', help: t('tabs.budget.plannedHelp') },
    { name: 'real', label: t('tabs.budget.actual'), type: 'number' },
    { name: 'estado', label: t('common.status'), type: 'select', required: true, options: enumOptions(catalog, 'budgetEstado') },
  ];
}

function Deviation({ value, currency, previsto }) {
  if (value === null || value === undefined) return <span className="pd-muted">—</span>;
  const pct = deviationPct(previsto, Number(previsto) + Number(value));
  return (
    <span className={`pd-dev pd-dev--${deviationTone(value)}`}>
      {value > 0 ? '+' : ''}
      {formatMoney(value, currency)}
      {pct !== null ? ` (${pct > 0 ? '+' : ''}${formatNumber(pct, 1)} %)` : ''}
    </span>
  );
}

// Vista previa del previsto calculado dentro del formulario.
function PlannedPreview({ values }) {
  const { t } = useI18n();
  const line = {
    unidades: parseNumberInput(values.unidades),
    precioUnitario: parseNumberInput(values.precioUnitario),
    porte: parseNumberInput(values.porte),
    previsto: parseNumberInput(values.previsto),
  };
  if (Object.values(line).some((value) => Number.isNaN(value))) return null;
  if (!isPlannedComputed(line)) return null;
  return (
    <p className="pd-info">
      {t('tabs.budget.plannedComputed')} <strong>{formatMoney(plannedAmount(line), (values.moneda || 'EUR').toUpperCase())}</strong>
    </p>
  );
}

export default function PresupuestoTab({ ctx }) {
  const { t } = useI18n();
  const { data, perms, catalog, project, suppliers } = ctx;
  const [editing, setEditing] = useState(null);
  const lines = data.budget?.lines || [];
  const totals = data.budget?.totalsByCurrency || totalsByCurrency(lines);
  const byType = data.budget?.totalsByType || totalsByType(lines);
  const typeRows = typeTotalsRows(byType, catalog.enums?.budgetTipo || []);

  const add = perms.budget ? (
    <button type="button" className="pd-btn pd-btn--primary" onClick={() => setEditing('new')}>
      {t('tabs.budget.add')}
    </button>
  ) : null;

  const col = {
    concept: t('tabs.budget.concept'),
    type: t('tabs.budget.type'),
    supplier: t('tabs.budget.supplier'),
    units: t('tabs.budget.unitsShort'),
    unitPrice: t('tabs.budget.unitPriceShort'),
    freight: t('tabs.budget.freight'),
    planned: t('tabs.budget.planned'),
    actual: t('tabs.budget.actual'),
    deviation: t('tabs.budget.deviation'),
    status: t('common.status'),
  };

  return (
    <div className="pd-stack">
      <SectionHead title={t('tabs.budget.title')}>{lines.length ? add : null}</SectionHead>

      {lines.length ? (
        <>
          <div className="pd-kpis">
            {Object.entries(totals).map(([moneda, total]) => (
              <div className="pd-kpi pd-kpi--wide" key={moneda}>
                <span className="pd-kpi__label">{t('tabs.budget.total', { currency: moneda })}</span>
                <span className="pd-kpi__value">{formatMoney(total.previsto, moneda)}</span>
                <span className="pd-kpi__label">
                  {t('tabs.budget.kpiSummary', { actual: formatMoney(total.real, moneda) })}{' '}
                  <Deviation value={total.desviacion} currency={moneda} previsto={total.previsto} />
                </span>
              </div>
            ))}
          </div>

          <h4 className="pd-form__subtitle">{t('tabs.budget.byTypeTitle')}</h4>
          <div className="pd-table-wrap">
            <table className="pd-table pd-table--compact">
              <thead>
                <tr>
                  <th>{col.type}</th>
                  <th>{t('tabs.budget.currency')}</th>
                  <th className="pd-num">{t('tabs.budget.lines')}</th>
                  <th className="pd-num">{col.planned}</th>
                  <th className="pd-num">{col.actual}</th>
                  <th className="pd-num">{col.deviation}</th>
                </tr>
              </thead>
              <tbody>
                {typeRows.map((row) => (
                  <tr key={`${row.tipo}-${row.moneda}`}>
                    <td>{labelOf(catalog, 'budgetTipo', row.tipo)}</td>
                    <td>{row.moneda}</td>
                    <td className="pd-num">{row.lineas}</td>
                    <td className="pd-num">{formatMoney(row.previsto, row.moneda)}</td>
                    <td className="pd-num">{formatMoney(row.real, row.moneda)}</td>
                    <td className="pd-num">
                      <Deviation value={row.desviacion} currency={row.moneda} previsto={row.previsto} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h4 className="pd-form__subtitle">{t('tabs.budget.lines')}</h4>
          <div className="pd-table-wrap">
            <table className="pd-table pd-table--responsive">
              <thead>
                <tr>
                  <th>{col.concept}</th>
                  <th>{col.type}</th>
                  <th>{col.supplier}</th>
                  <th className="pd-num">{col.units}</th>
                  <th className="pd-num">{col.unitPrice}</th>
                  <th className="pd-num">{col.freight}</th>
                  <th className="pd-num">{col.planned}</th>
                  <th className="pd-num">{col.actual}</th>
                  <th className="pd-num">{col.deviation}</th>
                  <th>{col.status}</th>
                  {perms.budget ? <th aria-label={t('common.actions')} /> : null}
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const previsto = line.previsto ?? plannedAmount(line);
                  return (
                    <tr key={line.id}>
                      <td data-label={col.concept}>{line.concepto}</td>
                      <td data-label={col.type}>{labelOf(catalog, 'budgetTipo', line.tipo)}</td>
                      <td data-label={col.supplier}>{line.supplierId ? supplierName(suppliers, line.supplierId) : '—'}</td>
                      <td data-label={col.units} className="pd-num">{formatNumber(line.unidades)}</td>
                      <td data-label={col.unitPrice} className="pd-num">{formatMoney(line.precioUnitario, line.moneda)}</td>
                      <td data-label={col.freight} className="pd-num">{formatMoney(line.porte, line.moneda)}</td>
                      <td data-label={col.planned} className="pd-num">{formatMoney(previsto, line.moneda)}</td>
                      <td data-label={col.actual} className="pd-num">{formatMoney(line.real, line.moneda)}</td>
                      <td data-label={col.deviation} className="pd-num">
                        <Deviation value={lineDeviation(line)} currency={line.moneda} previsto={previsto} />
                      </td>
                      <td data-label={col.status}>
                        <Badge tone={STATE_TONES[line.estado] || 'neutral'}>{labelOf(catalog, 'budgetEstado', line.estado)}</Badge>
                      </td>
                      {perms.budget ? (
                        <td className="pd-cell-actions"><div className="pd-row-actions">
                          <button type="button" className="pd-btn pd-btn--sm" onClick={() => setEditing(line)}>
                            {t('common.edit')}
                          </button>
                          <DeleteButton confirmText={t('tabs.budget.confirmDelete', { name: line.concepto })} onDelete={async () => {
                            await deleteBudgetLine(project.id, line.id);
                            await ctx.reload();
                          }} />
                        </div></td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="pd-muted pd-small">{t('tabs.budget.currencyNote')}</p>
        </>
      ) : (
        <Empty action={add}>{t('tabs.budget.empty')}</Empty>
      )}

      {editing ? (
        <FormModal
          title={editing === 'new' ? t('tabs.budget.newLine') : t('tabs.budget.editLine')}
          wide
          fields={budgetFields(ctx, t)}
          initial={editing === 'new' ? { tipo: 'prototipaje', estado: 'previsto', moneda: 'EUR' } : editing}
          onClose={() => setEditing(null)}
          onSubmit={async (payload) => {
            if (editing === 'new') await createBudgetLine(project.id, payload);
            else await updateBudgetLine(project.id, editing.id, payload);
            await ctx.reload();
          }}
        >
          {(values) => <PlannedPreview values={values} />}
        </FormModal>
      ) : null}
    </div>
  );
}
