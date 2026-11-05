export const PORTAL_ORIGIN_KEY = 'portal_origin';

export function capturePortalOrigin(params) {
  const portalOrigin = params.get('portal_origin');
  if (!portalOrigin) return;

  try {
    const url = new URL(portalOrigin);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      sessionStorage.setItem(PORTAL_ORIGIN_KEY, url.origin);
    }
  } catch {
    // ignore invalid values
  }
}

function devPortalBaseUrl() {
  return String(import.meta.env.PORTAL_BASE_URL || '').replace(/\/+$/, '');
}

export function getPortalUrl(path = '/') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const storedOrigin = sessionStorage.getItem(PORTAL_ORIGIN_KEY);

  if (storedOrigin) {
    return `${storedOrigin}${normalizedPath}`;
  }

  if (import.meta.env.DEV) {
    const devBase = devPortalBaseUrl();
    if (devBase) {
      return `${devBase}${normalizedPath}`;
    }
  }

  return normalizedPath;
}
