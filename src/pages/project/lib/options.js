// Opciones { value, label } para los desplegables de la ficha (puro; textos en el idioma activo).
import { t } from '../../../i18n/core.js';
import { phaseLabelOf } from '../../../lib/format.js';

// Personas activas (más las ya asignadas aunque estén inactivas, para no perderlas al editar).
export function peopleOptions(people, keepIds = []) {
  const keep = new Set(keepIds.filter((id) => id !== null && id !== undefined && id !== '').map(Number));
  return (people || [])
    .filter((person) => person.activo !== false || keep.has(Number(person.id)))
    .map((person) => ({
      value: person.id,
      label: `${person.nombre}${person.empresa && person.empresa !== 'Alsina HQ' ? ` (${person.empresa})` : ''}${
        person.activo === false ? ` — ${t('project.options.inactive')}` : ''
      }`,
    }));
}

// preferTipo: los de ese tipo primero (p. ej. 'laboratorio' en certificaciones); el resto detrás, en su orden.
export function supplierOptions(suppliers, { preferTipo } = {}) {
  const list = [...(suppliers || [])];
  if (preferTipo) list.sort((a, b) => Number(b.tipo === preferTipo) - Number(a.tipo === preferTipo));
  return list.map((supplier) => ({
    value: supplier.id,
    label: supplier.pais ? `${supplier.nombre} · ${supplier.pais}` : supplier.nombre,
  }));
}

export function productOptions(products) {
  return (products || []).map((product) => ({ value: product.id, label: product.nombre }));
}

export function phaseOptions(catalog, phases) {
  return (phases || []).map((fase) => ({ value: fase, label: phaseLabelOf(catalog, fase) }));
}
