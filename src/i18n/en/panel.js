// Inglés: textos del área «panel».
export default {
  title: 'Dashboard',
  subtitle: 'Overview of Safety development projects',
  subtitleAsOf: 'Status as of {date}',
  empty: {
    title: 'No projects match these filters',
    adminHint: 'Create a project from the List or load the initial data in Settings.',
    userHint: 'Try clearing the filters.',
  },
  kpis: {
    ariaLabel: 'Indicators',
    activeProjects: 'Active projects',
    ofSelection: 'of {total} in selection',
    projects_one: 'project',
    projects_other: 'projects',
    overdueActions: 'Overdue actions',
    ofOpen: 'of {total} open',
    budget: 'Planned vs actual',
    actual: 'actual {amount}',
    actualPct: 'actual {amount} ({pct} %)',
  },
  phases: {
    title: 'Projects by phase',
    hint: 'click to see the list',
    barAria_one: '{camino}, {fase}: {count} project',
    barAria_other: '{camino}, {fase}: {count} projects',
  },
  families: {
    title: 'RAG status and families',
    empty: 'No projects.',
    barAria_one: '{family}: {count} project',
    barAria_other: '{family}: {count} projects',
  },
  upcoming: {
    title: 'Upcoming dates',
    horizon: '60 days',
    empty: 'Nothing in the next 60 days',
    groups: {
      semana: 'Next 7 days',
      mes: 'Next 30 days',
      despues: 'Later',
    },
    types: {
      proyecto: 'Project',
      fase: 'Phase',
      accion: 'Action',
    },
  },
  overdue: {
    title: 'Overdue actions',
    empty: 'No overdue actions',
    noOwner: 'No owner',
    daysLate_one: '{count} day late',
    daysLate_other: '{count} days late',
  },
};
