import { useEffect, useState } from 'react';
import { capturePortalOrigin, getPortalUrl } from './portalUrl.js';

const AUTH_ENTRY_KEY = 'portal_auth_entry';
const AUTH_ENTRY_APPHUB = 'apphub';
const AUTH_ENTRY_PORTAL = 'portal';
const APP_ID = 38;

let appViewRecorded = false;

function resolveAuthEntry(urlEntry, hasUrlToken) {
  if (urlEntry === AUTH_ENTRY_APPHUB) return AUTH_ENTRY_APPHUB;
  if (hasUrlToken) return AUTH_ENTRY_PORTAL;
  return sessionStorage.getItem(AUTH_ENTRY_KEY) === AUTH_ENTRY_APPHUB
    ? AUTH_ENTRY_APPHUB
    : AUTH_ENTRY_PORTAL;
}

function normalizeExternalUrl(url) {
  const trimmed = url.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function redirectOnAuthFailure(entry) {
  sessionStorage.removeItem('portal_token');
  sessionStorage.removeItem(AUTH_ENTRY_KEY);

  if (entry === AUTH_ENTRY_APPHUB) {
    const returnUrl = normalizeExternalUrl(String(import.meta.env.APPHUB_RETURN_URL || ''));
    if (returnUrl) {
      window.location.href = returnUrl;
      return;
    }
  }

  window.location.href = getPortalUrl('/login');
}

let sessionExpiredHandled = false;

/** Token caducado durante la sesión (la API responde 401): limpia la sesión y vuelve al login del portal (o a AppHub). */
export function handleSessionExpired() {
  if (sessionExpiredHandled) return;
  sessionExpiredHandled = true;
  redirectOnAuthFailure(sessionStorage.getItem(AUTH_ENTRY_KEY) === AUTH_ENTRY_APPHUB ? AUTH_ENTRY_APPHUB : AUTH_ENTRY_PORTAL);
}

function recordAppView(token, entryMethod) {
  if (appViewRecorded) return;
  appViewRecorded = true;

  fetch(`/api/apps/${APP_ID}/view`, {
    method: 'POST',
    headers: {
      'x-portal-token': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ entry_method: entryMethod }),
  }).catch(() => {});
}

/**
 * Sesión del portal ALSIAPPS: toma el token de la URL (?token=) o de sessionStorage,
 * lo verifica contra /api/auth/verify y, si falla, redirige al login del portal.
 * Devuelve { user, loading, error, isAppAdmin, authEntry, token }.
 */
export function usePortalAuth() {
  const [state, setState] = useState({
    user: null,
    loading: true,
    error: null,
    isAppAdmin: false,
    authEntry: AUTH_ENTRY_PORTAL,
    token: null,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    capturePortalOrigin(params);
    const urlToken = params.get('token');
    const storedToken = sessionStorage.getItem('portal_token');
    const token = urlToken || storedToken;
    const authEntry = resolveAuthEntry(params.get('entry'), Boolean(urlToken));

    if (!token) {
      redirectOnAuthFailure(authEntry);
      return;
    }

    sessionStorage.setItem('portal_token', token);
    sessionStorage.setItem(AUTH_ENTRY_KEY, authEntry);
    if (urlToken) {
      // Conserva el hash (#/proyecto/12) al quitar el token de la URL.
      window.history.replaceState({}, '', window.location.pathname + window.location.hash);
    }

    fetch(`/api/auth/verify?token=${encodeURIComponent(token)}&app_id=${APP_ID}`)
      .then((response) => {
        if (!response.ok) throw new Error('Invalid portal session');
        return response.json();
      })
      .then((data) => {
        recordAppView(token, authEntry);
        setState({
          user: {
            id: data.id,
            name: data.name,
            email: data.email,
            avatar: data.avatar,
            role: data.role,
          },
          loading: false,
          error: null,
          isAppAdmin: Boolean(data.is_app_admin),
          authEntry,
          token,
        });
      })
      .catch(() => {
        redirectOnAuthFailure(authEntry);
      });
  }, []);

  return state;
}

export function goToPortal() {
  const authEntry = sessionStorage.getItem(AUTH_ENTRY_KEY) === AUTH_ENTRY_APPHUB
    ? AUTH_ENTRY_APPHUB
    : AUTH_ENTRY_PORTAL;

  if (authEntry === AUTH_ENTRY_APPHUB) {
    const returnUrl = normalizeExternalUrl(String(import.meta.env.APPHUB_RETURN_URL || ''));
    window.location.href = returnUrl || getPortalUrl('/');
    return;
  }

  window.location.href = getPortalUrl('/');
}

export function logoutFromPortal() {
  const authEntry = sessionStorage.getItem(AUTH_ENTRY_KEY) === AUTH_ENTRY_APPHUB
    ? AUTH_ENTRY_APPHUB
    : AUTH_ENTRY_PORTAL;

  sessionStorage.removeItem('portal_token');
  sessionStorage.removeItem(AUTH_ENTRY_KEY);

  if (authEntry === AUTH_ENTRY_APPHUB) {
    const returnUrl = normalizeExternalUrl(String(import.meta.env.APPHUB_RETURN_URL || ''));
    window.location.href = returnUrl || getPortalUrl('/login');
    return;
  }

  window.location.href = getPortalUrl('/');
}

export { APP_ID, getPortalUrl };
