// Funciones de la API /api/safety-dev (contrato: docs/api-contract.md).
// Lo propio de la ficha de proyecto (GET/PUT/DELETE /projects/:id, /advance, fases, recursos anidados y
// descarga de documentos) vive en ./project.js.
import { request, toQuery } from './client.js';

// --- Bootstrap, resumen y exportación ---------------------------------------
export const getBootstrap = () => request('/bootstrap');

/** Filtros: { familia, responsable, estado } */
export const getSummary = (filters = {}) => request(`/summary${toQuery(filters)}`);

/** Filtros: { familia, camino, fase, estado, responsable, q } */
export const getExport = (filters = {}) => request(`/export${toQuery(filters)}`);

// --- Proyectos (lista y alta) -----------------------------------------------
/** Filtros: { familia, camino, fase, estado, responsable, q } → { projects } */
export const listProjects = (filters = {}) => request(`/projects${toQuery(filters)}`);

/** Alta (admin). Respuesta 201 con la forma de GET /projects/:id. */
export const createProject = (data) => request('/projects', { method: 'POST', body: data });

// --- Fabricantes (directorio) -----------------------------------------------
/** Filtros: { tipo, pais, region, q } → { suppliers } */
export const listSuppliers = (filters = {}) => request(`/suppliers${toQuery(filters)}`);
export const getSupplier = (supplierId) => request(`/suppliers/${supplierId}`);
export const createSupplier = (data) => request('/suppliers', { method: 'POST', body: data });
export const updateSupplier = (supplierId, data) => request(`/suppliers/${supplierId}`, { method: 'PUT', body: data });
export const deleteSupplier = (supplierId) => request(`/suppliers/${supplierId}`, { method: 'DELETE' });

// --- Personas ---------------------------------------------------------------
export const listPeople = () => request('/people');
export const createPerson = (data) => request('/people', { method: 'POST', body: data });
export const updatePerson = (personId, data) => request(`/people/${personId}`, { method: 'PUT', body: data });
export const deletePerson = (personId) => request(`/people/${personId}`, { method: 'DELETE' });

// --- Familias y campos técnicos ---------------------------------------------
const fam = (code) => `/families/${encodeURIComponent(code)}`;
export const listFamilies = () => request('/families');
export const createFamily = (data) => request('/families', { method: 'POST', body: data });
export const updateFamily = (code, data) => request(fam(code), { method: 'PUT', body: data });
export const deleteFamily = (code) => request(fam(code), { method: 'DELETE' });
export const createFamilyField = (code, data) => request(`${fam(code)}/fields`, { method: 'POST', body: data });
export const updateFamilyField = (code, fieldId, data) => request(`${fam(code)}/fields/${fieldId}`, { method: 'PUT', body: data });
export const deleteFamilyField = (code, fieldId) => request(`${fam(code)}/fields/${fieldId}`, { method: 'DELETE' });

// --- Plantillas de entregables ----------------------------------------------
export const listTemplates = (camino) => request(`/templates${toQuery({ camino })}`);
export const createTemplate = (data) => request('/templates', { method: 'POST', body: data });
export const updateTemplate = (templateId, data) => request(`/templates/${templateId}`, { method: 'PUT', body: data });
export const deleteTemplate = (templateId) => request(`/templates/${templateId}`, { method: 'DELETE' });

// --- Datos iniciales --------------------------------------------------------
export const runSeed = () => request('/seed', { method: 'POST' });
