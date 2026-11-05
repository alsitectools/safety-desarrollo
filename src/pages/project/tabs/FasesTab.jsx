import { Fragment, useMemo, useState } from 'react';
import {
  advancePhase,
  changeCamino,
  createDeliverable,
  deleteDeliverable,
  updateDeliverable,
  updatePhaseDates,
} from '../../../api/project.js';
import { Badge, DeleteButton, ErrorMessage, FieldRow, FormModal, Modal, SectionHead, useRunner } from '../ui.jsx';
import { formatDate, formatDateTime } from '../lib/format.js';
import { labelOf, phaseLabelOf } from '../../../lib/format.js';
import { caminoLabel, deliverableText } from '../../../i18n/labels.js';
import { useI18n } from '../../../i18n/I18nProvider.jsx';
import { advanceWarning, groupByPhase, isDone, progress } from '../lib/deliverables.js';

const PHASE_TONES = { hecha: 'ok', en_curso: 'phase', pendiente: 'neutral', saltada: 'muted' };

// Sustituye los {nombre} de un texto traducido por nodos de React (para poner partes en negrita).
function rich(template, nodes) {
  return template.split(/(\{\w+\})/).map((part, index) => {
    const match = /^\{(\w+)\}$/.exec(part);
    return match && nodes[match[1]] !== undefined ? <Fragment key={index}>{nodes[match[1]]}</Fragment> : part;
  });
}

function AdvanceModal({ ctx, onClose }) {
  const { t } = useI18n();
  const { project, catalog, data, phasesOfCamino } = ctx;
  const targets = phasesOfCamino.filter((fase) => fase !== project.faseActual);
  const nextIdx = phasesOfCamino.indexOf(project.faseActual) + 1;
  const [to, setTo] = useState(phasesOfCamino[nextIdx] || targets[0] || '');
  const [comentario, setComentario] = useState('');
  const [fieldError, setFieldError] = useState('');
  const { busy, error, setError, run } = useRunner();

  const warning = advanceWarning({ phases: phasesOfCamino, from: project.faseActual, to, deliverables: data.deliverables });

  const submit = async (event) => {
    event.preventDefault();
    setFieldError('');
    if (warning.requiresComment && !comentario.trim()) {
      setFieldError(t('tabs.phases.commentRequired'));
      return;
    }
    const result = await run(async () => {
      await advancePhase(project.id, to, comentario.trim());
      await ctx.reload();
      return true;
    });
    if (result) onClose();
  };

  // Si el servidor pide comentario (comment_required) lo mostramos junto al campo.
  const serverComment = error?.code === 'comment_required' ? error.fields?.comentario || error.message : '';

  return (
    <Modal title={t('tabs.phases.advanceTitle')} onClose={onClose}>
      <form className="pd-form" onSubmit={submit} noValidate>
        <p>{rich(t('tabs.phases.currentPhase'), { phase: <strong>{phaseLabelOf(catalog, project.faseActual)}</strong> })}</p>
        <FieldRow label={t('tabs.phases.advanceTarget')} required>
          <select value={to} onChange={(event) => { setTo(event.target.value); setError(null); }}>
            {targets.map((fase) => (
              <option key={fase} value={fase}>
                {phaseLabelOf(catalog, fase)}
                {phasesOfCamino.indexOf(fase) < phasesOfCamino.indexOf(project.faseActual) ? ` ${t('tabs.phases.backward')}` : ''}
              </option>
            ))}
          </select>
        </FieldRow>
        {warning.direction === 'retroceso' ? (
          <div className="pd-warning">{t('tabs.phases.backwardWarning')}</div>
        ) : null}
        {warning.pendientes.length ? (
          <div className="pd-warning">
            <strong>
              {t('tabs.phases.pendingWarning', { count: warning.pendientes.length, phase: phaseLabelOf(catalog, project.faseActual) })}
            </strong>
            <ul>
              {warning.pendientes.map((item) => (
                <li key={item.id}>{deliverableText(item.texto)}</li>
              ))}
            </ul>
            {t('tabs.phases.pendingHint')}
          </div>
        ) : null}
        {warning.pendientesSaltadas.length ? (
          <div className="pd-warning pd-warning--soft">
            {t('tabs.phases.skippedWarning', { count: warning.pendientesSaltadas.length })}
          </div>
        ) : null}
        <FieldRow label={t('common.comment')} required={warning.requiresComment} error={fieldError || serverComment} full>
          <textarea rows={3} value={comentario} onChange={(event) => setComentario(event.target.value)} />
        </FieldRow>
        {error && !serverComment ? <ErrorMessage error={error} /> : null}
        <div className="pd-form__actions">
          <button type="button" className="pd-btn" onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="pd-btn pd-btn--primary" disabled={busy || !to}>
            {busy ? t('common.saving') : t('tabs.phases.advanceSubmit', { phase: phaseLabelOf(catalog, to) })}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function CaminoModal({ ctx, onClose }) {
  const { t } = useI18n();
  const { project, catalog } = ctx;
  const other = (catalog.caminos || ['propio', 'oem']).find((camino) => camino !== project.camino);
  const [confirm, setConfirm] = useState(false);
  const [comentario, setComentario] = useState('');
  const { busy, error, run } = useRunner();

  const submit = async (event) => {
    event.preventDefault();
    if (!confirm) return;
    const ok = await run(async () => {
      await changeCamino(project.id, other, comentario.trim());
      await ctx.reload();
      return true;
    });
    if (ok) onClose();
  };

  return (
    <Modal title={t('tabs.phases.caminoTitle')} onClose={onClose}>
      <form className="pd-form" onSubmit={submit} noValidate>
        <p>
          {rich(t('tabs.phases.caminoFromTo'), {
            from: <strong>{caminoLabel(project.camino)}</strong>,
            to: <strong>{caminoLabel(other)}</strong>,
          })}
        </p>
        <div className="pd-warning">
          {t('tabs.phases.caminoWarning', {
            first: phaseLabelOf(catalog, catalog.phasesByCamino?.[other]?.[0]),
            supply: phaseLabelOf(catalog, 'aprovisionamiento'),
            scale: phaseLabelOf(catalog, 'escalado'),
          })}
        </div>
        <FieldRow label={t('common.comment')} full>
          <textarea rows={3} value={comentario} onChange={(event) => setComentario(event.target.value)} />
        </FieldRow>
        <label className="pd-check">
          <input type="checkbox" checked={confirm} onChange={(event) => setConfirm(event.target.checked)} />
          {t('tabs.phases.caminoConfirm')}
        </label>
        <ErrorMessage error={error} />
        <div className="pd-form__actions">
          <button type="button" className="pd-btn" onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="pd-btn pd-btn--danger" disabled={busy || !confirm}>
            {busy ? t('common.saving') : t('tabs.phases.changeCamino')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function DeliverableItem({ ctx, item, onError }) {
  const { t } = useI18n();
  const { perms, project } = ctx;
  const [busy, setBusy] = useState(false);
  const done = isDone(item);
  const toggle = async () => {
    setBusy(true);
    try {
      await updateDeliverable(project.id, item.id, { hecho: !done });
      await ctx.reload();
    } catch (error) {
      onError(error);
    } finally {
      setBusy(false);
    }
  };
  const canDelete = perms.deliverables && (perms.role === 'admin' || !item.obligatorio);
  const text = deliverableText(item.texto);
  return (
    <li className={`pd-check-item${done ? ' pd-check-item--done' : ''}`}>
      <label className="pd-check">
        <input type="checkbox" checked={done} disabled={!perms.deliverables || busy} onChange={toggle} />
        <span>
          {text}
          {item.obligatorio ? <Badge tone="warn">{t('tabs.phases.mandatory')}</Badge> : null}
          {done && item.hechoEn ? <span className="pd-muted pd-small"> · {formatDateTime(item.hechoEn)}</span> : null}
        </span>
      </label>
      {canDelete ? (
        <DeleteButton confirmText={t('tabs.phases.confirmDeleteDeliverable', { text })} onDelete={async () => {
          await deleteDeliverable(project.id, item.id);
          await ctx.reload();
        }} />
      ) : null}
    </li>
  );
}

export default function FasesTab({ ctx }) {
  const { t } = useI18n();
  const { project, catalog, perms, data, phasesOfCamino } = ctx;
  const [modal, setModal] = useState(null); // 'advance' | 'camino' | { phase } | { addFase }
  const [toggleError, setToggleError] = useState(null);

  const phases = useMemo(
    () => [...(data.phases || [])].sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0)),
    [data.phases],
  );
  const groups = useMemo(() => groupByPhase(data.deliverables, phasesOfCamino), [data.deliverables, phasesOfCamino]);
  const approvals = data.approvals || [];

  return (
    <div className="pd-stack">
      <SectionHead title={t('tabs.phases.title', { camino: caminoLabel(project.camino) })}>
        {perms.phaseAdvance ? (
          <button type="button" className="pd-btn pd-btn--primary" onClick={() => setModal('advance')}>
            {t('tabs.phases.advanceButton')}
          </button>
        ) : null}
        {perms.caminoChange ? (
          <button type="button" className="pd-btn" onClick={() => setModal('camino')}>
            {t('tabs.phases.changeCamino')}
          </button>
        ) : null}
      </SectionHead>

      <ol className="pd-timeline">
        {phases.map((phase) => {
          const stats = progress(groups[phase.fase]);
          const current = phase.fase === project.faseActual;
          return (
            <li key={phase.id || phase.fase} className={`pd-timeline__step pd-timeline__step--${phase.estado}${current ? ' pd-timeline__step--current' : ''}`}>
              <div className="pd-timeline__head">
                <span className="pd-timeline__name">{phaseLabelOf(catalog, phase.fase)}</span>
                <Badge tone={PHASE_TONES[phase.estado] || 'neutral'}>{labelOf(catalog, 'phaseEstado', phase.estado)}</Badge>
              </div>
              <div className="pd-timeline__dates">
                <span>{t('tabs.phases.objective', { date: formatDate(phase.fechaObjetivo) })}</span>
                <span>{t('tabs.phases.start', { date: formatDate(phase.fechaInicio) })}</span>
                <span>{t('tabs.phases.end', { date: formatDate(phase.fechaFin) })}</span>
              </div>
              <div className="pd-progress" title={t('tabs.phases.progressTitle', { done: stats.hechos, total: stats.total })}>
                <div className="pd-progress__bar" style={{ width: `${stats.pct}%` }} />
              </div>
              <div className="pd-timeline__foot">
                <span className="pd-small">
                  {t('tabs.phases.progressCount', { done: stats.hechos, total: stats.total })}
                  {stats.obligatoriosPendientes ? ` · ${t('tabs.phases.mandatoryPending', { count: stats.obligatoriosPendientes })}` : ''}
                </span>
                {perms.phases ? (
                  <button type="button" className="pd-btn pd-btn--sm" onClick={() => setModal({ phase })}>
                    {t('tabs.phases.dates')}
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>

      <SectionHead title={t('tabs.phases.checklistTitle')}>
        {perms.deliverables ? (
          <button type="button" className="pd-btn" onClick={() => setModal({ addFase: project.faseActual })}>
            {t('tabs.phases.addDeliverable')}
          </button>
        ) : null}
      </SectionHead>
      <ErrorMessage error={toggleError} />
      <div className="pd-checklists">
        {Object.entries(groups).map(([fase, items]) => (
          <details key={fase} className="pd-checklist" open={fase === project.faseActual}>
            <summary>
              <span>{phaseLabelOf(catalog, fase)}</span>
              <span className="pd-muted pd-small">
                {progress(items).hechos}/{items.length}
              </span>
            </summary>
            {items.length ? (
              <ul>
                {items.map((item) => (
                  <DeliverableItem key={item.id} ctx={ctx} item={item} onError={setToggleError} />
                ))}
              </ul>
            ) : (
              <p className="pd-muted pd-small">{t('tabs.phases.noDeliverables')}</p>
            )}
          </details>
        ))}
      </div>

      <SectionHead title={t('tabs.phases.approvalsTitle')} />
      {approvals.length ? (
        <ul className="pd-approvals">
          {approvals.map((approval) => (
            <li key={approval.id}>
              <div className="pd-approvals__head">
                <Badge tone={approval.tipo === 'retroceso' ? 'warn' : approval.tipo === 'cambio_camino' ? 'danger' : 'ok'}>
                  {labelOf(catalog, 'approvalTipo', approval.tipo)}
                </Badge>
                <span>
                  {approval.tipo === 'cambio_camino'
                    ? `${caminoLabel(approval.deCamino)} → ${caminoLabel(approval.aCamino)}`
                    : `${phaseLabelOf(catalog, approval.deFase)} → ${phaseLabelOf(catalog, approval.aFase)}`}
                </span>
                <span className="pd-muted pd-small">
                  {formatDateTime(approval.createdAt)} · {approval.aprobadoPorNombre || t('tabs.phases.unknownUser')}
                </span>
              </div>
              {approval.pendientes ? (
                <div className="pd-small pd-warn-text">{t('tabs.phases.approvalPending', { count: Number(approval.pendientes) })}</div>
              ) : null}
              {approval.comentario ? <p className="pd-small">{approval.comentario}</p> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="pd-muted">{t('tabs.phases.noApprovals')}</p>
      )}

      {modal === 'advance' ? <AdvanceModal ctx={ctx} onClose={() => setModal(null)} /> : null}
      {modal === 'camino' ? <CaminoModal ctx={ctx} onClose={() => setModal(null)} /> : null}
      {modal?.phase ? (
        <FormModal
          title={t('tabs.phases.datesTitle', { phase: phaseLabelOf(catalog, modal.phase.fase) })}
          fields={[
            { name: 'fechaObjetivo', label: t('tabs.phases.targetDate'), type: 'date' },
            { name: 'fechaInicio', label: t('tabs.phases.startDate'), type: 'date' },
            { name: 'fechaFin', label: t('tabs.phases.endDate'), type: 'date' },
          ]}
          initial={modal.phase}
          onClose={() => setModal(null)}
          onSubmit={async (payload) => {
            await updatePhaseDates(project.id, modal.phase.fase, payload);
            await ctx.reload();
          }}
        />
      ) : null}
      {modal?.addFase ? (
        <FormModal
          title={t('tabs.phases.addDeliverable')}
          fields={[
            {
              name: 'fase',
              label: t('tabs.phases.phase'),
              type: 'select',
              required: true,
              options: (phasesOfCamino || []).map((fase) => ({ value: fase, label: phaseLabelOf(catalog, fase) })),
            },
            { name: 'texto', label: t('tabs.phases.deliverable'), required: true, full: true },
            ...(perms.role === 'admin' ? [{ name: 'obligatorio', label: t('tabs.phases.mandatoryToAdvance'), type: 'checkbox' }] : []),
          ]}
          initial={{ fase: modal.addFase, obligatorio: false }}
          submitLabel={t('common.add')}
          onClose={() => setModal(null)}
          onSubmit={async (payload) => {
            await createDeliverable(project.id, { ...payload, orden: (groups[payload.fase]?.length || 0) + 1 });
            await ctx.reload();
          }}
        />
      ) : null}
    </div>
  );
}
