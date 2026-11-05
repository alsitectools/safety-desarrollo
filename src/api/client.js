// Cliente HTTP de la API /api/safety-dev. Añade el token del portal (x-portal-token) y convierte
// las respuestas de error { error, message, fields } en un Error con:
//   err.message (en el idioma elegido; ver i18n/labels.js), err.code (= body.error), err.status, err.fields, err.body.
// Un 401 (token del portal caducado) lleva al login del portal: ver handleSessionExpired.
import { handleSessionExpired } from '../auth/usePortalAuth.js';
import { t } from '../i18n/core.js';
import { apiErrorMessage, fieldErrorMessage } from '../i18n/labels.js';

export const API_PREFIX = '/api/safety-dev';

// Mensaje por estado HTTP cuando la respuesta no trae código de error (claves catalog.errors.*).
const FALLBACK_ERRORS = {
  400: 'validation',
  401: 'session',
  403: 'forbidden',
  404: 'not_found',
  409: 'conflict',
  413: 'file_too_large',
  503: 'schema_missing',
};

function portalToken() {
  try {
    return sessionStorage.getItem('portal_token');
  } catch {
    return null;
  }
}

function buildHeaders(initHeaders = {}) {
  const token = portalToken();
  return {
    ...initHeaders,
    ...(token ? { 'x-portal-token': token } : {}),
  };
}

// Las rutas absolutas de la API (p. ej. downloadUrl "/api/safety-dev/documents/40/file") se usan tal cual.
export function apiUrl(path) {
  if (path.startsWith('/api/')) return path;
  return `${API_PREFIX}${path.startsWith('/') ? path : `/${path}`}`;
}

async function toError(response) {
  let body = null;
  try {
    body = await response.json();
  } catch {
    // sin cuerpo JSON
  }
  const error = new Error('');
  error.code = (body && body.error) || FALLBACK_ERRORS[response.status] || `http_${response.status}`;
  error.status = response.status;
  error.body = body;
  error.message = apiErrorMessage(error);
  const fields = body && body.fields ? body.fields : null;
  error.fields = fields
    ? Object.fromEntries(Object.entries(fields).map(([key, text]) => [key, fieldErrorMessage(text)]))
    : null;
  return error;
}

async function send(path, init = {}) {
  let response;
  try {
    response = await fetch(apiUrl(path), { ...init, headers: buildHeaders(init.headers) });
  } catch {
    const error = new Error(t('catalog.errors.network'));
    error.code = 'network';
    error.status = 0;
    throw error;
  }
  if (!response.ok) {
    const error = await toError(response);
    if (response.status === 401) handleSessionExpired();
    throw error;
  }
  return response;
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;
}

/**
 * request(path, init) → JSON (o null). Si init.body es un objeto o array se envía como JSON.
 * Ejemplo: request('/people', { method: 'POST', body: { nombre: 'Ana' } })
 */
export async function request(path, init = {}) {
  const next = { ...init };
  if (isPlainObject(next.body) || Array.isArray(next.body)) {
    next.body = JSON.stringify(next.body);
    next.headers = { 'Content-Type': 'application/json', ...(next.headers || {}) };
  }
  const response = await send(path, next);
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

/** Subida multipart (POST por defecto; el navegador pone el boundary del Content-Type). */
export function uploadForm(path, formData, init = {}) {
  return request(path, { method: 'POST', ...init, body: formData });
}

function fileNameFromDisposition(header) {
  if (!header) return '';
  const star = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (star) {
    try {
      return decodeURIComponent(star[1]);
    } catch {
      return star[1];
    }
  }
  const plain = header.match(/filename="?([^";]+)"?/i);
  return plain ? plain[1] : '';
}

/** Descarga autenticada (fetch con token + Blob + enlace temporal; no vale un <a href> directo). */
export async function downloadFile(path, fallbackName = 'documento') {
  const response = await send(path);
  const blob = await response.blob();
  const name = fileNameFromDisposition(response.headers.get('Content-Disposition')) || fallbackName;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Construye "?a=1&b=2" omitiendo valores vacíos. */
export function toQuery(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, String(value));
  });
  const text = search.toString();
  return text ? `?${text}` : '';
}
