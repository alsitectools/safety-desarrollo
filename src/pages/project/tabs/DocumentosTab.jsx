import { useState } from 'react';
import { createDocumentLink, deleteDocument, downloadDocument, updateDocument, uploadDocument } from '../../../api/project.js';
import { Badge, DeleteButton, Empty, ErrorMessage, FieldInput, FieldRow, FormModal, Modal, SectionHead, ExternalLink } from '../ui.jsx';
import { formatBytes, formatDateTime, supplierName } from '../lib/format.js';
import { labelOf } from '../../../lib/format.js';
import { useI18n } from '../../../i18n/I18nProvider.jsx';
import { idOrNull } from '../lib/forms.js';
import { productOptions, supplierOptions } from '../lib/options.js';

const MAX_SIZE = 25 * 1024 * 1024;
const BLOCKED_EXT = ['.exe', '.bat', '.cmd', '.com', '.msi', '.ps1', '.sh', '.js', '.vbs', '.scr'];

// Devuelve la clave del problema del fichero ('' si es válido).
function fileProblem(file) {
  if (!file) return 'tabs.documents.chooseFile';
  if (file.size > MAX_SIZE) return 'tabs.documents.fileTooBig';
  const name = file.name.toLowerCase();
  if (BLOCKED_EXT.some((ext) => name.endsWith(ext))) return 'tabs.documents.fileBlocked';
  return '';
}

// Opciones de un enum del catálogo con la etiqueta en el idioma activo.
function enumOptions(catalog, enumName) {
  return (catalog?.enums?.[enumName] || []).map((value) => ({ value, label: labelOf(catalog, enumName, value) }));
}

function NewDocumentModal({ ctx, onClose }) {
  const { t } = useI18n();
  const { catalog, data, suppliers, project } = ctx;
  const [mode, setMode] = useState('enlace');
  const [form, setForm] = useState({ tipo: 'otro', titulo: '', url: '', productId: '', supplierId: '' });
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const submit = async (event) => {
    event.preventDefault();
    const localErrors = {};
    const titulo = form.titulo.trim() || (mode === 'fichero' && file ? file.name : '');
    if (!titulo) localErrors.titulo = t('tabs.documents.titleRequired');
    if (mode === 'enlace') {
      if (!/^https?:\/\/\S+$/i.test(form.url.trim())) localErrors.url = t('tabs.documents.urlInvalid');
    } else {
      const problem = fileProblem(file);
      if (problem) localErrors.file = t(problem);
    }
    setErrors(localErrors);
    if (Object.keys(localErrors).length) {
      setError(t('tabs.reviewFields'));
      return;
    }
    const meta = { tipo: form.tipo, titulo, productId: idOrNull(form.productId), supplierId: idOrNull(form.supplierId) };
    setSaving(true);
    setError(null);
    try {
      if (mode === 'enlace') await createDocumentLink(project.id, { ...meta, url: form.url.trim() });
      else await uploadDocument(project.id, file, meta);
      await ctx.reload();
      onClose();
    } catch (err) {
      setErrors(err?.fields || {});
      setError(err);
      setSaving(false);
    }
  };

  return (
    <Modal title={t('tabs.documents.add')} onClose={onClose}>
      <form className="pd-form" onSubmit={submit} noValidate>
        <div className="pd-segmented" role="group" aria-label={t('tabs.documents.mode')}>
          <button type="button" aria-pressed={mode === 'enlace'} className={mode === 'enlace' ? 'is-active' : ''} onClick={() => setMode('enlace')}>
            {t('tabs.documents.modeLink')}
          </button>
          <button type="button" aria-pressed={mode === 'fichero'} className={mode === 'fichero' ? 'is-active' : ''} onClick={() => setMode('fichero')}>
            {t('tabs.documents.modeFile')}
          </button>
        </div>
        <div className="pd-form__grid">
          {mode === 'enlace' ? (
            <FieldRow label={t('tabs.documents.url')} required error={errors.url} full>
              <input type="url" value={form.url} onChange={(event) => set('url', event.target.value)} placeholder="https://…sharepoint.com/…" />
            </FieldRow>
          ) : (
            <FieldRow label={t('tabs.documents.file')} required error={errors.file} full help={t('tabs.documents.fileHelp')}>
              <input type="file" onChange={(event) => setFile(event.target.files?.[0] || null)} />
            </FieldRow>
          )}
          <FieldRow
            label={t('tabs.documents.docTitle')}
            required={mode === 'enlace'}
            error={errors.titulo}
            full
            help={mode === 'fichero' ? t('tabs.documents.docTitleHelp') : undefined}
          >
            <input type="text" value={form.titulo} onChange={(event) => set('titulo', event.target.value)} />
          </FieldRow>
          <FieldRow label={t('tabs.documents.type')} error={errors.tipo}>
            <FieldInput field={{ type: 'select', required: true, options: enumOptions(catalog, 'docTipo') }} value={form.tipo} onChange={(value) => set('tipo', value)} />
          </FieldRow>
          <FieldRow label={t('tabs.documents.product')} error={errors.productId}>
            <FieldInput field={{ type: 'id', options: productOptions(data.products) }} value={form.productId} onChange={(value) => set('productId', value)} />
          </FieldRow>
          <FieldRow label={t('tabs.documents.supplier')} error={errors.supplierId}>
            <FieldInput field={{ type: 'id', options: supplierOptions(suppliers) }} value={form.supplierId} onChange={(value) => set('supplierId', value)} />
          </FieldRow>
        </div>
        <ErrorMessage error={error} />
        <div className="pd-form__actions">
          <button type="button" className="pd-btn" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="pd-btn pd-btn--primary" disabled={saving}>
            {saving ? (mode === 'fichero' ? t('tabs.documents.uploading') : t('common.saving')) : t('common.save')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function DocumentLink({ doc }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  if (doc.url) return <ExternalLink href={doc.url}>{doc.titulo}</ExternalLink>;
  if (!doc.hasFile) return <span>{doc.titulo}</span>;
  const download = async () => {
    setBusy(true);
    setError(null);
    try {
      await downloadDocument(doc);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <button type="button" className="pd-link-btn" onClick={download} disabled={busy}>
        {busy ? t('tabs.documents.downloading') : doc.titulo}
      </button>
      {error ? <span className="pd-field__error"> {error.message}</span> : null}
    </>
  );
}

export default function DocumentosTab({ ctx }) {
  const { t } = useI18n();
  const { data, perms, catalog, project, suppliers } = ctx;
  const [modal, setModal] = useState(null); // 'new' | doc
  const docs = data.documents || [];
  const productName = (id) => (data.products || []).find((product) => Number(product.id) === Number(id))?.nombre;

  const add = perms.documents ? (
    <button type="button" className="pd-btn pd-btn--primary" onClick={() => setModal('new')}>
      {t('tabs.documents.add')}
    </button>
  ) : null;

  return (
    <div className="pd-stack">
      <SectionHead title={t('tabs.documents.title')}>{docs.length ? add : null}</SectionHead>
      {docs.length ? (
        <ul className="pd-docs">
          {docs.map((doc) => (
            <li key={doc.id} className="pd-doc">
              <div className="pd-doc__main">
                <div className="pd-doc__title">
                  <Badge>{labelOf(catalog, 'docTipo', doc.tipo)}</Badge>
                  <DocumentLink doc={doc} />
                  <span className="pd-muted pd-small">{doc.url ? t('tabs.documents.link') : t('tabs.documents.uploadedFile')}</span>
                </div>
                <div className="pd-muted pd-small">
                  {[
                    doc.productId ? productName(doc.productId) : '',
                    doc.supplierId ? supplierName(suppliers, doc.supplierId) : '',
                    doc.hasFile ? [doc.fileName, formatBytes(doc.size)].filter(Boolean).join(' · ') : '',
                    formatDateTime(doc.createdAt),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
              {perms.documents ? (
                <div className="pd-row-actions">
                  <button type="button" className="pd-btn pd-btn--sm" onClick={() => setModal(doc)}>
                    {t('common.edit')}
                  </button>
                  <DeleteButton
                    confirmText={t(doc.hasFile ? 'tabs.documents.confirmDeleteWithFile' : 'tabs.documents.confirmDelete', { title: doc.titulo })}
                    onDelete={async () => {
                      await deleteDocument(project.id, doc.id);
                      await ctx.reload();
                    }}
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <Empty action={add}>{t('tabs.documents.empty')}</Empty>
      )}

      {modal === 'new' ? <NewDocumentModal ctx={ctx} onClose={() => setModal(null)} /> : null}
      {modal && modal !== 'new' ? (
        <FormModal
          title={t('tabs.documents.editTitle')}
          fields={[
            { name: 'titulo', label: t('tabs.documents.docTitle'), required: true, full: true },
            { name: 'tipo', label: t('tabs.documents.type'), type: 'select', required: true, options: enumOptions(catalog, 'docTipo') },
            { name: 'productId', label: t('tabs.documents.product'), type: 'id', options: productOptions(data.products) },
            { name: 'supplierId', label: t('tabs.documents.supplier'), type: 'id', options: supplierOptions(suppliers) },
            ...(modal.url ? [{ name: 'url', label: t('tabs.documents.url'), type: 'url', required: true, full: true }] : []),
          ]}
          initial={modal}
          onClose={() => setModal(null)}
          onSubmit={async (payload) => {
            await updateDocument(project.id, modal.id, payload);
            await ctx.reload();
          }}
        />
      ) : null}
    </div>
  );
}
