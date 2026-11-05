import { useI18n } from '../../../i18n/I18nProvider.jsx';
import { SectionHead, Empty } from '../ui.jsx';
import { formatDateTime, personName, phaseLabel } from '../lib/format.js';
import { describeHistory } from '../lib/history.js';

export default function HistorialTab({ ctx }) {
  const { t } = useI18n();
  const { data, catalog, people } = ctx;
  const history = data.history || [];
  const fns = { phase: (fase) => phaseLabel(catalog, fase), person: (id) => personName(people, id) };

  return (
    <div className="pd-stack">
      <SectionHead title={t('project.history.title')} />
      {history.length ? (
        <>
          <ol className="pd-history">
            {history.map((entry) => {
              const info = describeHistory(entry, fns);
              return (
                <li key={entry.id}>
                  <div className="pd-history__head">
                    <strong>{info.title}</strong>
                    <span className="pd-muted pd-small">
                      {formatDateTime(entry.createdAt)} · {entry.userName || t('project.history.unknownUser')}
                    </span>
                  </div>
                  {info.lines.map((line, index) => (
                    <div key={index} className="pd-small">
                      {line}
                    </div>
                  ))}
                  {info.comment ? <div className="pd-small pd-muted">«{info.comment}»</div> : null}
                </li>
              );
            })}
          </ol>
          {history.length >= 50 ? <p className="pd-muted pd-small">{t('project.history.lastN', { count: 50 })}</p> : null}
        </>
      ) : (
        <Empty>{t('project.history.empty')}</Empty>
      )}
    </div>
  );
}
