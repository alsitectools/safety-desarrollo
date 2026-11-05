import { useState } from 'react';
import { createCertification, deleteCertification, updateCertification } from '../../../api/project.js';
import { useI18n } from '../../../i18n/I18nProvider.jsx';
import { Badge, DeleteButton, Empty, FormModal, SectionHead } from '../ui.jsx';
import { enumLabel, enumOptions, formatDate, supplierName } from '../lib/format.js';
import { productOptions, supplierOptions } from '../lib/options.js';

const STATE_TONES = { pendiente: 'neutral', en_ensayo: 'warn', superado: 'ok', fallido: 'danger', certificado: 'ok' };

function certFields(ctx, t) {
  const { catalog, data, suppliers } = ctx;
  return [
    { name: 'norma', label: t('project.certs.fields.standard'), required: true, placeholder: t('project.certs.fields.standardPlaceholder') },
    { name: 'clase', label: t('project.certs.fields.class'), emptyAs: '' },
    { name: 'productId', label: t('project.certs.fields.product'), type: 'id', options: productOptions(data.products), emptyLabel: t('project.certs.wholeProject') },
    { name: 'estado', label: t('common.status'), type: 'select', required: true, options: enumOptions(catalog, 'certEstado') },
    { name: 'laboratorioId', label: t('project.certs.fields.labDirectory'), type: 'id', options: supplierOptions(suppliers, { preferTipo: 'laboratorio' }) },
    { name: 'laboratorio', label: t('project.certs.fields.labText'), emptyAs: '', help: t('project.certs.fields.labHelp') },
    { name: 'fechaInforme', label: t('project.certs.fields.reportDate'), type: 'date' },
    { name: 'notas', label: t('common.notes'), type: 'textarea' },
  ];
}

export default function CertificacionesTab({ ctx }) {
  const { t } = useI18n();
  const { data, perms, catalog, project, suppliers } = ctx;
  const [editing, setEditing] = useState(null);
  const certs = data.certifications || [];
  const productName = (id) => (data.products || []).find((product) => Number(product.id) === Number(id))?.nombre || '—';

  const add = perms.certifications ? (
    <button type="button" className="pd-btn pd-btn--primary" onClick={() => setEditing('new')}>
      {t('project.certs.add')}
    </button>
  ) : null;

  return (
    <div className="pd-stack">
      <SectionHead title={t('project.certs.title')}>{certs.length ? add : null}</SectionHead>
      {certs.length ? (
        <div className="pd-table-wrap">
          <table className="pd-table pd-table--responsive">
            <thead>
              <tr>
                <th>{t('project.certs.fields.standard')}</th>
                <th>{t('project.certs.fields.class')}</th>
                <th>{t('project.certs.fields.product')}</th>
                <th>{t('project.certs.fields.lab')}</th>
                <th>{t('common.status')}</th>
                <th>{t('project.certs.fields.report')}</th>
                <th>{t('common.notes')}</th>
                {perms.certifications ? <th aria-label={t('common.actions')} /> : null}
              </tr>
            </thead>
            <tbody>
              {certs.map((cert) => (
                <tr key={cert.id}>
                  <td data-label={t('project.certs.fields.standard')}>{cert.norma}</td>
                  <td data-label={t('project.certs.fields.class')}>{cert.clase || '—'}</td>
                  <td data-label={t('project.certs.fields.product')}>{cert.productId ? productName(cert.productId) : t('project.certs.wholeProject')}</td>
                  <td data-label={t('project.certs.fields.lab')}>
                    {cert.laboratorioId ? supplierName(suppliers, cert.laboratorioId) : cert.laboratorio || '—'}
                  </td>
                  <td data-label={t('common.status')}>
                    <Badge tone={STATE_TONES[cert.estado] || 'neutral'}>{enumLabel(catalog, 'certEstado', cert.estado)}</Badge>
                  </td>
                  <td data-label={t('project.certs.fields.report')}>{formatDate(cert.fechaInforme)}</td>
                  <td data-label={t('common.notes')}>{cert.notas || '—'}</td>
                  {perms.certifications ? (
                    <td className="pd-cell-actions"><div className="pd-row-actions">
                      <button type="button" className="pd-btn pd-btn--sm" onClick={() => setEditing(cert)}>
                        {t('common.edit')}
                      </button>
                      <DeleteButton confirmText={t('project.certs.confirmDelete', { standard: cert.norma })} onDelete={async () => {
                        await deleteCertification(project.id, cert.id);
                        await ctx.reload();
                      }} />
                    </div></td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty action={add}>{t('project.certs.empty')}</Empty>
      )}

      {editing ? (
        <FormModal
          title={editing === 'new' ? t('project.certs.newTitle') : t('project.certs.editTitle', { standard: editing.norma })}
          wide
          fields={certFields(ctx, t)}
          initial={editing === 'new' ? { estado: 'pendiente' } : editing}
          onClose={() => setEditing(null)}
          onSubmit={async (payload) => {
            if (editing === 'new') await createCertification(project.id, payload);
            else await updateCertification(project.id, editing.id, payload);
            await ctx.reload();
          }}
        />
      ) : null}
    </div>
  );
}
