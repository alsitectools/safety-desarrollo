import { useState } from 'react';
import { getSummary } from '../api/index.js';
import { useAsync } from '../hooks/useAsync.js';
import { PageHead } from '../components/Layout.jsx';
import { EmptyState, ErrorBox, Loading } from '../components/States.jsx';
import { Badge, Semaforo } from '../components/Badge.jsx';
import PhasePill from '../components/PhasePill.jsx';
import ProjectFilters from './ProjectFilters.jsx';
import { formatDate, formatMoney, formatNumber, labelOf, phaseLabelOf, relativeDays } from '../lib/format.js';
import { budgetRows, familyBars, groupUpcoming, phaseBars, signalRows } from '../lib/panel.js';
import { buildHash } from '../lib/router.js';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { caminoLabel, familyName } from '../i18n/labels.js';

/** Mes abreviado en el idioma activo (sin punto final: «ene», «janv», «Jan»). */
function shortMonth(month, locale) {
  if (!month || month < 1 || month > 12) return '';
  const text = new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2000, month - 1, 1)));
  return text.replace(/\.$/, '');
}

function DateChip({ date, late }) {
  const { locale } = useI18n();
  const [, m, d] = String(date || '').split('-');
  return (
    <span className={`date-chip${late ? ' date-chip--late' : ''}`} aria-hidden="true">
      <span className="date-chip__day">{d || '—'}</span>
      <span className="date-chip__mon">{shortMonth(Number(m), locale)}</span>
    </span>
  );
}

const UPCOMING_TONES = { proyecto: 'solid', fase: 'green', accion: 'blue' };

export default function Panel({ boot, navigate }) {
  const { t } = useI18n();
  const { catalog } = boot;
  const [filters, setFilters] = useState({ familia: '', responsable: '', estado: 'activo' });
  const summary = useAsync(() => getSummary(filters), [filters.familia, filters.responsable, filters.estado]);
  const data = summary.data;

  const goProject = (projectId) => navigate(buildHash('proyecto', projectId));
  const listWith = (query) => navigate(buildHash('lista', null, { ...query, familia: filters.familia, estado: filters.estado, responsable: filters.responsable }));

  return (
    <>
      <PageHead
        title={t('panel.title')}
        subtitle={data ? t('panel.subtitleAsOf', { date: formatDate(data.today) }) : t('panel.subtitle')}
      />
      <ProjectFilters boot={boot} value={filters} onChange={setFilters} show={['familia', 'responsable', 'estado']} />

      {summary.error && <ErrorBox error={summary.error} onRetry={summary.reload} />}
      {!data && summary.loading && <Loading />}

      {data && (
        <div style={{ opacity: summary.loading ? 0.6 : 1 }}>
          {data.totals.proyectos === 0 ? (
            <div className="card">
              <EmptyState icon="🗂️" title={t('panel.empty.title')}>
                {boot.isAppAdmin ? t('panel.empty.adminHint') : t('panel.empty.userHint')}
              </EmptyState>
            </div>
          ) : (
            <PanelBody data={data} catalog={catalog} goProject={goProject} listWith={listWith} />
          )}
        </div>
      )}
    </>
  );
}

function PanelBody({ data, catalog, goProject, listWith }) {
  const { t } = useI18n();
  const { totals } = data;
  const groups = phaseBars(data.porFase, catalog);
  const families = familyBars(data.porFamilia);
  const budget = budgetRows(data.presupuesto);
  const signals = signalRows(data.semaforos);
  const upcoming = groupUpcoming(data.proximasFechas);

  return (
    <>
      <section className="kpis" aria-label={t('panel.kpis.ariaLabel')}>
        <div className="kpi kpi--accent">
          <div className="kpi__label">{t('panel.kpis.activeProjects')}</div>
          <div className="kpi__value">{formatNumber(totals.activos)}</div>
          <div className="kpi__sub">{t('panel.kpis.ofSelection', { total: formatNumber(totals.proyectos) })}</div>
        </div>
        {catalog.caminos.map((camino) => (
          <div className="kpi" key={camino}>
            <div className="kpi__label">{caminoLabel(camino)}</div>
            <div className="kpi__value">{formatNumber(totals.porCamino?.[camino] || 0)}</div>
            <div className="kpi__sub">{t('panel.kpis.projects', { count: totals.porCamino?.[camino] || 0 })}</div>
          </div>
        ))}
        <div className={`kpi${totals.accionesVencidas ? ' kpi--alert' : ''}`}>
          <div className="kpi__label">{t('panel.kpis.overdueActions')}</div>
          <div className="kpi__value">{formatNumber(totals.accionesVencidas)}</div>
          <div className="kpi__sub">{t('panel.kpis.ofOpen', { total: formatNumber(totals.accionesAbiertas) })}</div>
        </div>
        <div className="kpi">
          <div className="kpi__label">{t('panel.kpis.budget')}</div>
          {budget.length === 0 ? (
            <div className="kpi__value kpi__value--sm">—</div>
          ) : (
            budget.map((row) => (
              <div key={row.currency}>
                <div className="kpi__value kpi__value--sm">{formatMoney(row.previsto, row.currency)}</div>
                <div className="kpi__sub">
                  {row.pctReal !== null
                    ? t('panel.kpis.actualPct', { amount: formatMoney(row.real, row.currency), pct: formatNumber(row.pctReal, 0) })
                    : t('panel.kpis.actual', { amount: formatMoney(row.real, row.currency) })}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <div className="grid-2">
        <section className="card" aria-labelledby="chart-fases">
          <h2 className="card__title" id="chart-fases">
            {t('panel.phases.title')} <small>{t('panel.phases.hint')}</small>
          </h2>
          <div className="bars">
            {groups.map((group) => (
              <div className="bars__group" key={group.camino}>
                <div className="bars__group-title">
                  <span>{caminoLabel(group.camino, group.label)}</span>
                  <span className="muted">{group.total}</span>
                </div>
                {group.bars.map((bar) => (
                  <button
                    type="button"
                    key={bar.fase}
                    className="bar bar--button"
                    onClick={() => listWith({ camino: group.camino, fase: bar.fase })}
                    aria-label={t('panel.phases.barAria', { camino: caminoLabel(group.camino, group.label), fase: phaseLabelOf(catalog, bar.fase), count: bar.count })}
                  >
                    <span className="bar__label">{phaseLabelOf(catalog, bar.fase)}</span>
                    <span className="bar__track">
                      <span
                        className={`bar__fill${group.camino === 'oem' ? ' bar__fill--oem' : ''}`}
                        style={{ width: `${bar.pct}%`, opacity: bar.count ? 1 : 0 }}
                      />
                      <span className="bar__value">{bar.count}</span>
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </section>

        <section className="card" aria-labelledby="chart-estado">
          <h2 className="card__title" id="chart-estado">{t('panel.families.title')}</h2>
          <div className="row" style={{ marginBottom: 14 }}>
            {signals.map((s) => (
              <span key={s.key} className="row" style={{ gap: 4 }}>
                <Semaforo value={s.key} withLabel />
                <strong>{s.count}</strong>
              </span>
            ))}
          </div>
          {families.length === 0 ? (
            <p className="muted small">{t('panel.families.empty')}</p>
          ) : (
            <div className="bars">
              {families.map((bar) => (
                <button
                  type="button"
                  key={bar.familyCode}
                  className="bar bar--button"
                  onClick={() => listWith({ familia: bar.familyCode })}
                  aria-label={t('panel.families.barAria', { family: familyName({ code: bar.familyCode, nombre: bar.nombre }), count: bar.count })}
                >
                  <span className="bar__label" title={familyName({ code: bar.familyCode, nombre: bar.nombre })}>
                    {familyName({ code: bar.familyCode, nombre: bar.nombre })}
                  </span>
                  <span className="bar__track">
                    <span className="bar__fill bar__fill--muted" style={{ width: `${bar.pct}%` }} />
                    <span className="bar__value">{bar.count}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="card" aria-labelledby="proximas">
          <h2 className="card__title" id="proximas">
            {t('panel.upcoming.title')} <small>{t('panel.upcoming.horizon')}</small>
          </h2>
          {upcoming.length === 0 ? (
            <EmptyState icon="📅" title={t('panel.upcoming.empty')} />
          ) : (
            upcoming.map((group) => (
              <div key={group.key}>
                <h3 className="small muted" style={{ margin: '8px 0 0' }}>{t(`panel.upcoming.groups.${group.key}`, { defaultValue: group.label })}</h3>
                <ul className="list">
                  {group.items.map((item, index) => (
                    <li className="list__item" key={`${item.tipo}-${item.projectId}-${item.fecha}-${index}`}>
                      <DateChip date={item.fecha} />
                      <div className="list__main">
                        <div className="list__title">{item.texto}</div>
                        <div className="list__meta row" style={{ gap: 6 }}>
                          <Badge tone={UPCOMING_TONES[item.tipo]}>{t(`panel.upcoming.types.${item.tipo}`, { defaultValue: item.tipo })}</Badge>
                          {item.fase && <PhasePill fase={item.fase} label={phaseLabelOf(catalog, item.fase)} />}
                          <button type="button" className="link-btn" onClick={() => goProject(item.projectId)}>
                            {item.projectNombre}
                          </button>
                          <span>· {formatDate(item.fecha)} ({relativeDays(item.dias)})</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </section>

        <section className="card" aria-labelledby="vencidas">
          <h2 className="card__title" id="vencidas">
            {t('panel.overdue.title')} <small>{data.accionesVencidas.length}</small>
          </h2>
          {data.accionesVencidas.length === 0 ? (
            <EmptyState icon="✅" title={t('panel.overdue.empty')} />
          ) : (
            <ul className="list">
              {data.accionesVencidas.map((action) => (
                <li className="list__item" key={action.id}>
                  <DateChip date={action.fechaLimite} late />
                  <div className="list__main">
                    <div className="list__title">{action.texto}</div>
                    <div className="list__meta">
                      <button type="button" className="link-btn" onClick={() => goProject(action.projectId)}>
                        {action.projectNombre}
                      </button>
                      {' · '}
                      {action.ownerNombre || t('panel.overdue.noOwner')}
                      {' · '}
                      <span style={{ color: 'var(--red)' }}>
                        {t('panel.overdue.daysLate', { count: Number(action.diasVencida) || 0 })}
                      </span>
                      {' · '}
                      {labelOf(catalog, 'actionEstado', action.estado)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
