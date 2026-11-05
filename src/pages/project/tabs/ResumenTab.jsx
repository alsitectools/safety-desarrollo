import { useState } from 'react';
import { updateProject, deleteProject } from '../../../api/project.js';
import { useI18n } from '../../../i18n/I18nProvider.jsx';
import { familyName } from '../../../i18n/labels.js';
import { FormModal, SectionHead, DeleteButton, ExternalLink, Badge } from '../ui.jsx';
import { caminoLabel, enumLabel, enumOptions, especialistaLink, formatDate, formatMoney, personName, phaseLabel } from '../lib/format.js';
import { peopleOptions } from '../lib/options.js';
import { deviationTone } from '../lib/budget.js';

// URL del «Especialista en Safety»; el ancla de la familia (#eps, #pva…) se añade al final.
const ESPECIALISTA_URL = (import.meta.env && import.meta.env.VITE_ESPECIALISTA_URL) || '';

function projectFields(ctx, t) {
  const { catalog, boot, project, perms } = ctx;
  const families = (boot?.families || [])
    .filter((family) => family.activo !== false || family.code === project.familyCode)
    .map((family) => ({ value: family.code, label: familyName(family) }));
  const fields = [
    { name: 'nombre', label: t('common.name'), required: true, full: true },
    { name: 'codigo', label: t('project.summary.fields.code'), placeholder: t('project.summary.fields.codePlaceholder') },
    { name: 'familyCode', label: t('project.summary.fields.family'), type: 'select', required: true, options: families },
    { name: 'estado', label: t('common.status'), type: 'select', required: true, options: enumOptions(catalog, 'projectEstado') },
    { name: 'prioridad', label: t('project.summary.fields.priority'), type: 'select', required: true, options: enumOptions(catalog, 'prioridad') },
    { name: 'gama', label: t('project.summary.fields.range'), type: 'select', options: enumOptions(catalog, 'gama') },
    { name: 'modalidad', label: t('project.summary.fields.modality'), type: 'select', options: enumOptions(catalog, 'modalidad') },
    { name: 'centroDiseno', label: t('project.summary.fields.designCenter'), emptyAs: '' },
    { name: 'mercados', label: t('project.summary.fields.markets'), emptyAs: '' },
    { name: 'fechaObjetivo', label: t('project.summary.fields.targetDate'), type: 'date' },
    { name: 'sharepointUrl', label: t('project.summary.fields.sharepointFolder'), type: 'url', emptyAs: '', full: true, placeholder: 'https://…sharepoint.com/…' },
    { name: 'descripcion', label: t('project.summary.fields.description'), type: 'textarea' },
  ];
  if (perms.projectLocked) {
    const keep = [project.designerId, project.sourcingId, project.homologationId];
    const options = peopleOptions(ctx.people, keep);
    fields.push(
      { name: 'designerId', label: t('project.summary.fields.design'), type: 'id', options },
      { name: 'sourcingId', label: t('project.summary.fields.sourcing'), type: 'id', options },
      { name: 'homologationId', label: t('project.summary.fields.homologation'), type: 'id', options },
    );
  }
  return fields;
}

function Item({ label, children }) {
  return (
    <div className="pd-dl__item">
      <dt>{label}</dt>
      <dd>{children ?? '—'}</dd>
    </div>
  );
}

export default function ResumenTab({ ctx }) {
  const { project, catalog, perms, data, family, people, navigate } = ctx;
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const kpis = data.kpis || {};
  const presupuesto = kpis.presupuesto || data.budget?.totalsByCurrency || {};
  const especialista = especialistaLink(ESPECIALISTA_URL, family?.anclaEspecialista);

  const responsables = [
    ['design', project.designerId],
    ['sourcing', project.sourcingId],
    ['homologation', project.homologationId],
  ];

  return (
    <div className="pd-stack">
      <SectionHead title={t('project.summary.title')}>
        {perms.project ? (
          <button type="button" className="pd-btn pd-btn--primary" onClick={() => setEditing(true)}>
            {t('project.summary.editData')}
          </button>
        ) : null}
        {perms.projectDelete ? (
          <DeleteButton
            small={false}
            label={t('project.summary.deleteProject')}
            confirmText={t('project.summary.confirmDelete', { name: project.nombre })}
            onDelete={async () => {
              await deleteProject(project.id);
              navigate?.('lista');
            }}
          />
        ) : null}
      </SectionHead>

      <div className="pd-kpis">
        <div className="pd-kpi">
          <span className="pd-kpi__value">{kpis.accionesAbiertas ?? 0}</span>
          <span className="pd-kpi__label">{t('project.summary.kpis.openActions')}</span>
        </div>
        <div className={`pd-kpi${kpis.accionesVencidas ? ' pd-kpi--alert' : ''}`}>
          <span className="pd-kpi__value">{kpis.accionesVencidas ?? 0}</span>
          <span className="pd-kpi__label">{t('project.summary.kpis.overdueActions')}</span>
        </div>
        <div className="pd-kpi">
          <span className="pd-kpi__value">
            {kpis.entregablesFaseHechos ?? 0}/{kpis.entregablesFaseTotal ?? 0}
          </span>
          <span className="pd-kpi__label">{t('project.summary.kpis.phaseDeliverables')}</span>
        </div>
        <div className="pd-kpi">
          <span className="pd-kpi__value">
            {kpis.entregablesHechos ?? 0}/{kpis.entregablesTotal ?? 0}
          </span>
          <span className="pd-kpi__label">{t('project.summary.kpis.totalDeliverables')}</span>
        </div>
        {Object.entries(presupuesto).map(([moneda, totals]) => (
          <div className="pd-kpi pd-kpi--wide" key={moneda}>
            <span className="pd-kpi__value">{formatMoney(totals.previsto, moneda)}</span>
            <span className="pd-kpi__label">
              {t('project.summary.kpis.plannedReal', { real: formatMoney(totals.real, moneda) })} ·{' '}
              <span className={`pd-dev pd-dev--${deviationTone(totals.desviacion)}`}>
                {t('project.summary.kpis.deviation', { amount: formatMoney(totals.desviacion, moneda) })}
              </span>
            </span>
          </div>
        ))}
      </div>

      <dl className="pd-dl">
        <Item label={t('project.summary.fields.family')}>{familyName(family || project.familyCode)}</Item>
        <Item label={t('project.summary.fields.camino')}>{caminoLabel(catalog, project.camino)}</Item>
        <Item label={t('project.summary.fields.currentPhase')}>
          {phaseLabel(catalog, project.faseActual)}
          {project.faseFechaObjetivo ? ` · ${t('project.summary.phaseTarget', { date: formatDate(project.faseFechaObjetivo) })}` : ''}
        </Item>
        <Item label={t('common.status')}>{enumLabel(catalog, 'projectEstado', project.estado)}</Item>
        <Item label={t('project.summary.fields.priority')}>{enumLabel(catalog, 'prioridad', project.prioridad)}</Item>
        <Item label={t('project.summary.fields.range')}>{enumLabel(catalog, 'gama', project.gama)}</Item>
        <Item label={t('project.summary.fields.modality')}>{enumLabel(catalog, 'modalidad', project.modalidad)}</Item>
        <Item label={t('project.summary.fields.designCenter')}>{project.centroDiseno || '—'}</Item>
        <Item label={t('project.summary.fields.markets')}>{project.mercados || '—'}</Item>
        <Item label={t('project.summary.fields.targetDate')}>{formatDate(project.fechaObjetivo)}</Item>
      </dl>

      {project.descripcion ? <p className="pd-description">{project.descripcion}</p> : null}

      <SectionHead title={t('project.summary.owners')} />
      <div className="pd-people">
        {responsables.map(([label, personId]) => (
          <div className="pd-person" key={label}>
            <span className="pd-person__role">{t(`project.summary.fields.${label}`)}</span>
            <span className="pd-person__name">{personName(people, personId)}</span>
          </div>
        ))}
      </div>
      {perms.project && !perms.projectLocked ? (
        <p className="pd-muted">{t('project.summary.ownersAdminOnly')}</p>
      ) : null}

      <SectionHead title={t('project.summary.links')} />
      <ul className="pd-links">
        <li>
          <span className="pd-links__label">SharePoint:</span>{' '}
          {project.sharepointUrl ? (
            <ExternalLink href={project.sharepointUrl}>{t('project.summary.openFolder')}</ExternalLink>
          ) : (
            <span className="pd-muted">{t('project.summary.noFolder')}</span>
          )}
        </li>
        <li>
          <span className="pd-links__label">{t('project.summary.specialist')}</span>{' '}
          {especialista ? (
            <ExternalLink href={especialista}>{t('project.summary.viewSection', { name: family ? familyName(family) : '' })}</ExternalLink>
          ) : family?.anclaEspecialista ? (
            <span className="pd-muted">{t('project.summary.sectionNotConfigured', { anchor: family.anclaEspecialista })}</span>
          ) : (
            <span className="pd-muted">{t('project.summary.noSection')}</span>
          )}
        </li>
      </ul>

      {project.estado !== 'activo' ? (
        <p>
          <Badge>{enumLabel(catalog, 'projectEstado', project.estado)}</Badge> {t('project.summary.signalInactive')}
        </p>
      ) : null}

      {editing ? (
        <FormModal
          title={t('project.summary.editTitle')}
          wide
          fields={projectFields(ctx, t)}
          initial={project}
          onClose={() => setEditing(false)}
          onSubmit={async (payload) => {
            await updateProject(project.id, payload);
            await ctx.reload();
          }}
        />
      ) : null}
    </div>
  );
}
