// Ficha de proyecto: GET/PUT/DELETE /projects/:id, /advance, fechas de fase y recursos anidados (contrato §3 y §4).
import { request, uploadForm, downloadFile } from './client.js';
import { t } from '../i18n/core.js';

const p = (id) => `/projects/${encodeURIComponent(id)}`;
const put = (path, data) => request(path, { method: 'PUT', body: data });
const post = (path, data) => request(path, { method: 'POST', body: data });
const del = (path) => request(path, { method: 'DELETE' });

// --- Proyecto ---------------------------------------------------------------
/** Ficha completa: { project, role, permissions, kpis, products, phases, deliverables, approvals, actions, suppliers, budget, certifications, documents, history } */
export const getProject = (id) => request(p(id));
/** Cuerpo parcial; camino y faseActual se ignoran (usar advance/changeCamino). → { project } */
export const updateProject = (id, data) => put(p(id), data);
export const deleteProject = (id) => del(p(id));

/** Cambio de fase (admin): { to, comentario } → { project, phases, deliverables, approval } */
export const advancePhase = (id, to, comentario = '') => post(`${p(id)}/advance`, { to, comentario });
/** Cambio de camino (admin, reinicia fases). */
export const changeCamino = (id, camino, comentario = '') => post(`${p(id)}/advance`, { camino, confirm: true, comentario });
/** Fechas de una fase: { fechaObjetivo, fechaInicio, fechaFin } (parcial) → { phase } */
export const updatePhaseDates = (id, fase, data) => put(`${p(id)}/phases/${encodeURIComponent(fase)}`, data);

// --- Productos --------------------------------------------------------------
export const createProduct = (id, data) => post(`${p(id)}/products`, data);
export const updateProduct = (id, productId, data) => put(`${p(id)}/products/${productId}`, data);
export const deleteProduct = (id, productId) => del(`${p(id)}/products/${productId}`);

// --- Entregables ------------------------------------------------------------
export const createDeliverable = (id, data) => post(`${p(id)}/deliverables`, data);
export const updateDeliverable = (id, deliverableId, data) => put(`${p(id)}/deliverables/${deliverableId}`, data);
export const deleteDeliverable = (id, deliverableId) => del(`${p(id)}/deliverables/${deliverableId}`);

// --- Acciones ---------------------------------------------------------------
export const createAction = (id, data) => post(`${p(id)}/actions`, data);
export const updateAction = (id, actionId, data) => put(`${p(id)}/actions/${actionId}`, data);
export const deleteAction = (id, actionId) => del(`${p(id)}/actions/${actionId}`);

// --- Fabricantes del proyecto y ofertas -------------------------------------
export const addProjectSupplier = (id, data) => post(`${p(id)}/suppliers`, data);
export const updateProjectSupplier = (id, psId, data) => put(`${p(id)}/suppliers/${psId}`, data);
export const deleteProjectSupplier = (id, psId) => del(`${p(id)}/suppliers/${psId}`);
export const createQuote = (id, psId, data) => post(`${p(id)}/suppliers/${psId}/quotes`, data);
export const updateQuote = (id, psId, quoteId, data) => put(`${p(id)}/suppliers/${psId}/quotes/${quoteId}`, data);
export const deleteQuote = (id, psId, quoteId) => del(`${p(id)}/suppliers/${psId}/quotes/${quoteId}`);

// --- Presupuesto (las respuestas traen totalsByCurrency y totalsByType) -----
export const createBudgetLine = (id, data) => post(`${p(id)}/budget`, data);
export const updateBudgetLine = (id, lineId, data) => put(`${p(id)}/budget/${lineId}`, data);
export const deleteBudgetLine = (id, lineId) => del(`${p(id)}/budget/${lineId}`);

// --- Certificaciones --------------------------------------------------------
export const createCertification = (id, data) => post(`${p(id)}/certifications`, data);
export const updateCertification = (id, certId, data) => put(`${p(id)}/certifications/${certId}`, data);
export const deleteCertification = (id, certId) => del(`${p(id)}/certifications/${certId}`);

// --- Documentos -------------------------------------------------------------
/** Enlace (SharePoint u otro): { tipo, titulo, url, productId, supplierId } */
export const createDocumentLink = (id, data) => post(`${p(id)}/documents`, data);

/** Subida multipart: campo `file` + tipo, titulo, productId, supplierId. */
export function uploadDocument(id, file, { tipo, titulo, productId, supplierId } = {}) {
  const form = new FormData();
  form.append('file', file);
  if (tipo) form.append('tipo', tipo);
  form.append('titulo', titulo || file.name);
  if (productId) form.append('productId', String(productId));
  if (supplierId) form.append('supplierId', String(supplierId));
  return uploadForm(`${p(id)}/documents`, form);
}

export const updateDocument = (id, docId, data) => put(`${p(id)}/documents/${docId}`, data);
export const deleteDocument = (id, docId) => del(`${p(id)}/documents/${docId}`);

/** Descarga con token (fetch + Blob). */
export const downloadDocument = (doc) =>
  downloadFile(doc.downloadUrl || `/documents/${doc.id}/file`, doc.fileName || doc.titulo || t('app.defaultFileName'));
