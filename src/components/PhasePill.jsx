/**
 * Píldora de fase.
 * Props: fase, label (texto ya resuelto), camino ('propio' | 'oem'), estado (pendiente | en_curso | hecha | saltada),
 * step/total (p. ej. 2 de 5) opcionales.
 */
export default function PhasePill({ fase, label, camino, estado, step, total }) {
  const classes = ['phase-pill'];
  if (camino === 'oem') classes.push('phase-pill--oem');
  if (estado) classes.push(`phase-pill--${estado}`);
  return (
    <span className={classes.join(' ')} title={label || fase}>
      {step ? (
        <span className="phase-pill__step">
          {step}
          {total ? `/${total}` : ''}
        </span>
      ) : null}
      {label || fase}
    </span>
  );
}
