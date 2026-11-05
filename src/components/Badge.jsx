import { initials } from '../lib/format.js';
import { t } from '../i18n/core.js';
import { useI18n } from '../i18n/I18nProvider.jsx';

/** Etiqueta. tone: green | amber | red | grey | blue | oem | solid | (vacío = neutro) */
export function Badge({ tone, title, children }) {
  return (
    <span className={`badge${tone ? ` badge--${tone}` : ''}`} title={title}>
      {children}
    </span>
  );
}

const SIGNALS = ['verde', 'ambar', 'rojo', 'gris'];

/** Texto del semáforo en el idioma activo. */
export function signalLabel(key) {
  return t(`app.signal.${SIGNALS.includes(key) ? key : 'gris'}`);
}

/** Compatibilidad: SIGNAL_LABELS.verde devuelve el texto traducido en el momento de leerlo. */
export const SIGNAL_LABELS = Object.freeze(Object.defineProperties({}, Object.fromEntries(
  SIGNALS.map((key) => [key, { enumerable: true, get: () => signalLabel(key) }]),
)));

/** Semáforo verde | ambar | rojo | gris. `withLabel` muestra el texto junto al punto. */
export function Semaforo({ value, withLabel = false }) {
  const { t: tr } = useI18n();
  const key = SIGNALS.includes(value) ? value : 'gris';
  const label = tr(`app.signal.${key}`);
  return (
    <span className={`signal signal--${key}`} title={tr(`app.signalHelp.${key}`)}>
      <span className="signal__dot" aria-hidden="true" />
      {withLabel ? <span>{label}</span> : <span className="sr-only">{label}</span>}
    </span>
  );
}

const PRIORITY_TONES = { alta: 'red', media: 'amber', baja: 'grey' };
const ESTADO_TONES = { activo: 'green', en_pausa: 'amber', terminado: 'blue', cancelado: 'grey' };

/** Prioridad (alta/media/baja) con color. `label` = texto ya resuelto del catálogo. */
export function PriorityBadge({ value, label }) {
  if (!value) return null;
  return <Badge tone={PRIORITY_TONES[value]}>{label || value}</Badge>;
}

/** Estado del proyecto (activo/en_pausa/terminado/cancelado). */
export function EstadoBadge({ value, label }) {
  if (!value) return null;
  return <Badge tone={ESTADO_TONES[value]}>{label || value}</Badge>;
}

/** Iniciales de responsables: slots = [{ short: 'D', rol: 'Diseño', person: { nombre } }] (rol y short ya traducidos). */
export function Initials({ slots }) {
  const { t: tr } = useI18n();
  if (!slots || !slots.length) return <span className="muted small">{tr('app.noOwners')}</span>;
  return (
    <span className="initials">
      {slots.map((slot) => (
        <span key={slot.key || slot.short} className="initials__item" title={tr('app.ownerTitle', { role: slot.rol, name: slot.person.nombre })}>
          <small>{slot.short}</small>
          {initials(slot.person.nombre)}
        </span>
      ))}
    </span>
  );
}
