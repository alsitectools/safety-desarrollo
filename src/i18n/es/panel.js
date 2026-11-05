// Textos del área «panel»: página de resumen (KPIs, gráficos por fase y familia, próximas fechas y acciones vencidas).
export default {
  title: 'Panel',
  subtitle: 'Resumen de proyectos de desarrollo Safety',
  subtitleAsOf: 'Situación a {date}',
  empty: {
    title: 'No hay proyectos con estos filtros',
    adminHint: 'Crea un proyecto desde la Lista o carga los datos iniciales en Configuración.',
    userHint: 'Prueba a quitar filtros.',
  },
  kpis: {
    ariaLabel: 'Indicadores',
    activeProjects: 'Proyectos activos',
    ofSelection: 'de {total} en la selección',
    projects_one: 'proyecto',
    projects_other: 'proyectos',
    overdueActions: 'Acciones vencidas',
    ofOpen: 'de {total} abiertas',
    budget: 'Previsto vs real',
    actual: 'real {amount}',
    actualPct: 'real {amount} ({pct} %)',
  },
  phases: {
    title: 'Proyectos por fase',
    hint: 'clic para ver la lista',
    barAria_one: '{camino}, {fase}: {count} proyecto',
    barAria_other: '{camino}, {fase}: {count} proyectos',
  },
  families: {
    title: 'Semáforo y familias',
    empty: 'Sin proyectos.',
    barAria_one: '{family}: {count} proyecto',
    barAria_other: '{family}: {count} proyectos',
  },
  upcoming: {
    title: 'Próximas fechas',
    horizon: '60 días',
    empty: 'Nada en los próximos 60 días',
    groups: {
      semana: 'Próximos 7 días',
      mes: 'Próximos 30 días',
      despues: 'Más adelante',
    },
    types: {
      proyecto: 'Proyecto',
      fase: 'Fase',
      accion: 'Acción',
    },
  },
  overdue: {
    title: 'Acciones vencidas',
    empty: 'No hay acciones vencidas',
    noOwner: 'Sin responsable',
    daysLate_one: '{count} día de retraso',
    daysLate_other: '{count} días de retraso',
  },
};
