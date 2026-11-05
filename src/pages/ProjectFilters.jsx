import Field, { Select } from '../components/Field.jsx';
import { activeFamilies, activePeople } from '../lib/projects.js';
import { labelOf, phaseLabelOf } from '../lib/format.js';
import { caminoLabel, familyName } from '../i18n/labels.js';
import { useI18n } from '../i18n/I18nProvider.jsx';

/**
 * Barra de filtros de proyectos compartida por Panel, Kanban y Lista.
 * show: lista de filtros a mostrar ('q', 'familia', 'camino', 'fase', 'estado', 'responsable').
 * value: { familia, camino, fase, estado, responsable, q } · onChange(nuevoValor)
 */
export default function ProjectFilters({ boot, value, onChange, show, extra }) {
  const { t } = useI18n();
  const { catalog } = boot;
  const set = (key) => (next) => {
    const patch = { ...value, [key]: next };
    // Si cambia el camino y la fase ya no le pertenece, se limpia.
    if (key === 'camino' && patch.fase && next && !(catalog.phasesByCamino[next] || []).includes(patch.fase)) {
      patch.fase = '';
    }
    onChange(patch);
  };

  const phaseKeys = value.camino
    ? catalog.phasesByCamino[value.camino] || []
    : [...new Set(catalog.caminos.flatMap((camino) => catalog.phasesByCamino[camino] || []))];

  const has = (key) => show.includes(key);

  return (
    <div className="filters" role="search">
      {has('q') && (
        <Field label={t('filters.search')}>
          <input
            className="input"
            type="search"
            placeholder={t('filters.searchPlaceholder')}
            value={value.q || ''}
            onChange={(event) => set('q')(event.target.value)}
          />
        </Field>
      )}
      {has('familia') && (
        <Field label={t('filters.family')}>
          <Select
            value={value.familia}
            onChange={set('familia')}
            options={activeFamilies(boot.families, value.familia).map((f) => ({ value: f.code, label: familyName(f) }))}
            placeholder={t('filters.allFem')}
          />
        </Field>
      )}
      {has('camino') && (
        <Field label={t('filters.camino')}>
          <Select
            value={value.camino}
            onChange={set('camino')}
            options={catalog.caminos.map((camino) => ({ value: camino, label: caminoLabel(camino) }))}
            placeholder={t('filters.allMasc')}
          />
        </Field>
      )}
      {has('fase') && (
        <Field label={t('filters.phase')}>
          <Select
            value={value.fase}
            onChange={set('fase')}
            options={phaseKeys.map((fase) => ({ value: fase, label: phaseLabelOf(catalog, fase) }))}
            placeholder={t('filters.allFem')}
          />
        </Field>
      )}
      {has('estado') && (
        <Field label={t('filters.status')}>
          <Select
            value={value.estado}
            onChange={set('estado')}
            options={(catalog.enums.projectEstado || Object.keys(catalog.enumLabels.projectEstado || {})).map((estado) => ({ value: estado, label: labelOf(catalog, 'projectEstado', estado) }))}
            placeholder={t('filters.allMasc')}
          />
        </Field>
      )}
      {has('responsable') && (
        <Field label={t('filters.owner')}>
          <Select
            value={value.responsable}
            onChange={set('responsable')}
            options={activePeople(boot.people, Number(value.responsable) || null).map((p) => ({ value: String(p.id), label: p.nombre }))}
            placeholder={t('filters.allMasc')}
          />
        </Field>
      )}
      {extra}
    </div>
  );
}
