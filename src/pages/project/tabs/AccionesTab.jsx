import { useState } from 'react';
import { createAction, deleteAction, updateAction } from '../../../api/project.js';
import { useI18n } from '../../../i18n/I18nProvider.jsx';
import { Badge, DeleteButton, Empty, ErrorMessage, FormModal, SectionHead } from '../ui.jsx';
import { enumLabel, enumOptions, formatDate, personName, phaseLabel } from '../lib/format.js';
import { filterActions, isActionOpen } from '../lib/forms.js';
import { peopleOptions, phaseOptions } from '../lib/options.js';

const STATE_TONES = { pendiente: 'warn', enviado: 'phase', hecho: 'ok', cancelado: 'muted' };

function actionFields(ctx, action, t) {
  const { catalog, people, phasesOfCamino } = ctx;
  return [
    { name: 'texto', label: t('project.actions.fields.text'), type: 'textarea', required: true },
    { name: 'ownerId', label: t('project.actions.fields.owner'), type: 'id', options: peopleOptions(people, [action?.ownerId]) },
    { name: 'fechaLimite', label: t('project.actions.fields.deadline'), type: 'date' },
    { name: 'estado', label: t('common.status'), type: 'select', required: true, options: enumOptions(catalog, 'actionEstado') },
    { name: 'fase', label: t('project.actions.fields.phase'), type: 'select', options: phaseOptions(catalog, phasesOfCamino), emptyLabel: t('project.actions.noPhase') },
    { name: 'origen', label: t('project.actions.fields.origin'), emptyAs: '', placeholder: t('project.actions.fields.originPlaceholder') },
  ];
}

export default function AccionesTab({ ctx }) {
  const { t } = useI18n();
  const { data, perms, catalog, project, people, phasesOfCamino } = ctx;
  const [filters, setFilters] = useState({ soloAbiertas: true, ownerId: '', fase: '' });
  const [editing, setEditing] = useState(null);
  const [quickError, setQuickError] = useState(null);
  const all = data.actions || [];
  const actions = filterActions(all, filters);
  const owners = [...new Set(all.map((action) => action.ownerId).filter(Boolean))];

  const markDone = async (action) => {
    setQuickError(null);
    try {
      await updateAction(project.id, action.id, { estado: 'hecho' });
      await ctx.reload();
    } catch (error) {
      setQuickError(error);
    }
  };

  const add = perms.actions ? (
    <button type="button" className="pd-btn pd-btn--primary" onClick={() => setEditing('new')}>
      {t('project.actions.add')}
    </button>
  ) : null;

  return (
    <div className="pd-stack">
      <SectionHead title={t('project.actions.title')}>{add}</SectionHead>
      <div className="pd-filters">
        <label className="pd-check">
          <input
            type="checkbox"
            checked={filters.soloAbiertas}
            onChange={(event) => setFilters((prev) => ({ ...prev, soloAbiertas: event.target.checked }))}
          />
          {t('project.actions.onlyOpen')}
        </label>
        <label className="pd-inline-field">
          <span>{t('project.actions.fields.owner')}</span>
          <select value={filters.ownerId} onChange={(event) => setFilters((prev) => ({ ...prev, ownerId: event.target.value }))}>
            <option value="">{t('common.all')}</option>
            {owners.map((ownerId) => (
              <option key={ownerId} value={ownerId}>
                {personName(people, ownerId)}
              </option>
            ))}
          </select>
        </label>
        <label className="pd-inline-field">
          <span>{t('project.actions.fields.phase')}</span>
          <select value={filters.fase} onChange={(event) => setFilters((prev) => ({ ...prev, fase: event.target.value }))}>
            <option value="">{t('project.actions.allPhases')}</option>
            <option value="__none__">{t('project.actions.noPhase')}</option>
            {phasesOfCamino.map((fase) => (
              <option key={fase} value={fase}>
                {phaseLabel(catalog, fase)}
              </option>
            ))}
          </select>
        </label>
        <span className="pd-muted pd-small">
          {t('project.actions.countOf', { shown: actions.length, total: all.length })}
        </span>
      </div>
      <ErrorMessage error={quickError} />

      {actions.length ? (
        <ul className="pd-actions">
          {actions.map((action) => (
            <li key={action.id} className={`pd-action${action.vencida ? ' pd-action--overdue' : ''}${!isActionOpen(action) ? ' pd-action--closed' : ''}`}>
              <div className="pd-action__main">
                <p className="pd-action__text">{action.texto}</p>
                <div className="pd-action__meta">
                  <Badge tone={STATE_TONES[action.estado] || 'neutral'}>{enumLabel(catalog, 'actionEstado', action.estado)}</Badge>
                  {action.vencida ? <Badge tone="danger">{t('project.actions.overdue')}</Badge> : null}
                  <span>{personName(people, action.ownerId)}</span>
                  <span>{t('project.actions.deadlineShort', { date: formatDate(action.fechaLimite) })}</span>
                  {action.fase ? <span>{phaseLabel(catalog, action.fase)}</span> : null}
                  {action.origen ? <span className="pd-muted">{action.origen}</span> : null}
                </div>
              </div>
              {perms.actions ? (
                <div className="pd-row-actions">
                  {isActionOpen(action) ? (
                    <button type="button" className="pd-btn pd-btn--sm" onClick={() => markDone(action)}>
                      {t('project.actions.markDone')}
                    </button>
                  ) : null}
                  <button type="button" className="pd-btn pd-btn--sm" onClick={() => setEditing(action)}>
                    {t('common.edit')}
                  </button>
                  <DeleteButton confirmText={t('project.actions.confirmDelete')} onDelete={async () => {
                    await deleteAction(project.id, action.id);
                    await ctx.reload();
                  }} />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <Empty>{all.length ? t('project.actions.emptyFiltered') : t('project.actions.empty')}</Empty>
      )}

      {editing ? (
        <FormModal
          title={editing === 'new' ? t('project.actions.newTitle') : t('project.actions.editTitle')}
          fields={actionFields(ctx, editing === 'new' ? null : editing, t)}
          initial={editing === 'new' ? { estado: 'pendiente', fase: project.faseActual } : editing}
          onClose={() => setEditing(null)}
          onSubmit={async (payload) => {
            if (editing === 'new') await createAction(project.id, payload);
            else await updateAction(project.id, editing.id, payload);
            await ctx.reload();
          }}
        />
      ) : null}
    </div>
  );
}
