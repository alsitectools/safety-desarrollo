// Núcleo de idiomas sin React: idioma actual, t() y suscripción a cambios.
// Diccionarios: src/i18n/<lang>/index.js (objetos anidados por área). El español es la referencia;
// si falta una clave en otro idioma se usa la española y, si tampoco existe, `defaultValue` o la clave.
import es from './es/index.js';
import ca from './ca/index.js';
import en from './en/index.js';
import fr from './fr/index.js';
import de from './de/index.js';
import it from './it/index.js';
import pt from './pt/index.js';
import pl from './pl/index.js';
import ro from './ro/index.js';

export const LANGS = [
  { code: 'es', name: 'Español', intl: 'es-ES' },
  { code: 'ca', name: 'Català', intl: 'ca-ES' },
  { code: 'en', name: 'English', intl: 'en-GB' },
  { code: 'fr', name: 'Français', intl: 'fr-FR' },
  { code: 'de', name: 'Deutsch', intl: 'de-DE' },
  { code: 'it', name: 'Italiano', intl: 'it-IT' },
  { code: 'pt', name: 'Português', intl: 'pt-PT' },
  { code: 'pl', name: 'Polski', intl: 'pl-PL' },
  { code: 'ro', name: 'Română', intl: 'ro-RO' },
];

export const DICTIONARIES = { es, ca, en, fr, de, it, pt, pl, ro };

const STORAGE_KEY = 'safety_dev_locale';
const PORTAL_KEY = 'portal_locale';

function isSupported(code) {
  return LANGS.some((lang) => lang.code === code);
}

function readStorage(key) {
  try {
    return globalThis.localStorage ? globalThis.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

/** Primera carga: elección guardada en esta app → idioma del portal → español. */
function initialLang() {
  const own = readStorage(STORAGE_KEY);
  if (isSupported(own)) return own;
  const portal = String(readStorage(PORTAL_KEY) || '').slice(0, 2).toLowerCase();
  return isSupported(portal) ? portal : 'es';
}

let current = initialLang();
const listeners = new Set();

export function getLang() {
  return current;
}

export function getIntlLocale(lang = current) {
  return (LANGS.find((item) => item.code === lang) || LANGS[0]).intl;
}

export function setLang(code) {
  if (!isSupported(code) || code === current) return;
  current = code;
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, code);
  } catch {
    // sin almacenamiento: el cambio dura hasta recargar
  }
  if (globalThis.document) globalThis.document.documentElement.lang = code;
  listeners.forEach((listener) => listener());
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function lookup(dict, key) {
  let node = dict;
  for (const part of key.split('.')) {
    if (node === null || typeof node !== 'object' || !(part in node)) return undefined;
    node = node[part];
  }
  return typeof node === 'string' ? node : undefined;
}

const pluralRules = new Map();

function pluralSuffix(count, lang) {
  if (!pluralRules.has(lang)) pluralRules.set(lang, new Intl.PluralRules(getIntlLocale(lang)));
  return pluralRules.get(lang).select(count);
}

/** Busca la clave en el idioma pedido y, si no, en español. Con vars.count prueba antes key_<categoría> y key_other. */
function resolve(key, vars, lang) {
  const dicts = lang === 'es' ? [DICTIONARIES.es] : [DICTIONARIES[lang], DICTIONARIES.es];
  const hasCount = vars && typeof vars.count === 'number';
  for (const dict of dicts) {
    if (hasCount) {
      const plural = lookup(dict, `${key}_${pluralSuffix(vars.count, dict === DICTIONARIES.es ? 'es' : lang)}`)
        ?? lookup(dict, `${key}_other`);
      if (plural !== undefined) return plural;
    }
    const value = lookup(dict, key);
    if (value !== undefined) return value;
  }
  return undefined;
}

/** t('panel.title') · t('list.count', { count: 3 }) → usa list.count_one / list.count_other · {name} se sustituye. */
export function t(key, vars, lang = current) {
  const text = resolve(key, vars, lang);
  if (text === undefined) return vars && vars.defaultValue !== undefined ? vars.defaultValue : key;
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name) => (vars[name] !== undefined && vars[name] !== null ? String(vars[name]) : match));
}

/** ¿Existe la clave (en el idioma actual o en español)? */
export function has(key, lang = current) {
  return resolve(key, null, lang) !== undefined;
}
