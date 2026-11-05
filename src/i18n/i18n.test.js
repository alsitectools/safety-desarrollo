import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DICTIONARIES, LANGS, setLang, t } from './core.js';
import { deliverableText, familyName } from './labels.js';
import { formatDate, formatNumber, relativeDays } from '../lib/format.js';

// Rutas de todas las claves de texto de un diccionario: 'panel.title', 'catalog.enum.gama.premium'…
function keysOf(node, prefix = '') {
  return Object.entries(node).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value !== null && typeof value === 'object' ? keysOf(value, path) : [path];
  });
}

function placeholders(text) {
  return [...String(text).matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

function valueAt(dict, path) {
  return path.split('.').reduce((node, part) => (node && typeof node === 'object' ? node[part] : undefined), dict);
}

const esKeys = keysOf(DICTIONARIES.es);
// Variantes de plural propias de cada idioma (key_few, key_many…) no existen en español.
const PLURAL_RE = /_(zero|one|two|few|many|other)$/;
const baseKey = (key) => key.replace(PLURAL_RE, '');

for (const { code } of LANGS.filter((lang) => lang.code !== 'es')) {
  test(`${code}: tiene todas las claves del español`, () => {
    const keys = new Set(keysOf(DICTIONARIES[code]).map(baseKey));
    const missing = esKeys.filter((key) => !keys.has(baseKey(key)));
    assert.deepEqual(missing, [], `Faltan ${missing.length} claves en ${code}`);
  });

  test(`${code}: no tiene claves que el español no conoce`, () => {
    const known = new Set(esKeys.map(baseKey));
    const extra = keysOf(DICTIONARIES[code]).filter((key) => !known.has(baseKey(key)));
    assert.deepEqual(extra, []);
  });

  test(`${code}: mantiene las variables {x} y no deja textos vacíos`, () => {
    for (const key of keysOf(DICTIONARIES[code])) {
      const value = valueAt(DICTIONARIES[code], key);
      assert.ok(String(value).trim(), `${code}.${key} vacío`);
      const esValue = valueAt(DICTIONARIES.es, key) ?? valueAt(DICTIONARIES.es, `${baseKey(key)}_other`);
      if (esValue !== undefined) {
        assert.deepEqual(placeholders(value), placeholders(esValue), `${code}.${key}`);
      }
    }
  });
}

test('t: variables, plural y respaldo en español', () => {
  setLang('es');
  assert.equal(t('common.inDays', { count: 1 }), 'en 1 día');
  assert.equal(t('common.inDays', { count: 5 }), 'en 5 días');
  assert.equal(t('no.existe'), 'no.existe');
  assert.equal(t('no.existe', { defaultValue: 'x' }), 'x');
});

test('el cambio de idioma afecta a textos, listas y formatos', () => {
  setLang('de');
  assert.equal(formatNumber(27500), '27.500');
  assert.equal(formatDate('2026-10-29'), '29.10.2026');
  assert.notEqual(relativeDays(3), 'en 3 días');
  setLang('en');
  assert.equal(formatNumber(1538.5, 2), '1,538.50');
  assert.equal(formatDate('2026-10-29'), '29/10/2026');
  setLang('es');
  assert.equal(familyName({ code: 'zzz', nombre: 'Nueva' }), 'Nueva');
  assert.equal(deliverableText('Benchmark de competidores'), 'Benchmark de competidores');
  assert.equal(deliverableText('Texto libre de alguien'), 'Texto libre de alguien');
});
