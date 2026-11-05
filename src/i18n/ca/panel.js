// Catalán: textos del área «panel».
export default {
  title: 'Tauler',
  subtitle: 'Resum de projectes de desenvolupament Safety',
  subtitleAsOf: 'Situació a {date}',
  empty: {
    title: 'No hi ha projectes amb aquests filtres',
    adminHint: 'Crea un projecte des de la Llista o carrega les dades inicials a Configuració.',
    userHint: 'Prova de treure filtres.',
  },
  kpis: {
    ariaLabel: 'Indicadors',
    activeProjects: 'Projectes actius',
    ofSelection: 'de {total} a la selecció',
    projects_one: 'projecte',
    projects_other: 'projectes',
    overdueActions: 'Accions vençudes',
    ofOpen: 'de {total} obertes',
    budget: 'Previst vs. real',
    actual: 'real {amount}',
    actualPct: 'real {amount} ({pct} %)',
  },
  phases: {
    title: 'Projectes per fase',
    hint: 'clic per veure la llista',
    barAria_one: '{camino}, {fase}: {count} projecte',
    barAria_other: '{camino}, {fase}: {count} projectes',
  },
  families: {
    title: 'Semàfor i famílies',
    empty: 'Sense projectes.',
    barAria_one: '{family}: {count} projecte',
    barAria_other: '{family}: {count} projectes',
  },
  upcoming: {
    title: 'Properes dates',
    horizon: '60 dies',
    empty: 'Res en els propers 60 dies',
    groups: {
      semana: 'Propers 7 dies',
      mes: 'Propers 30 dies',
      despues: 'Més endavant',
    },
    types: {
      proyecto: 'Projecte',
      fase: 'Fase',
      accion: 'Acció',
    },
  },
  overdue: {
    title: 'Accions vençudes',
    empty: 'No hi ha accions vençudes',
    noOwner: 'Sense responsable',
    daysLate_one: '{count} dia de retard',
    daysLate_other: '{count} dies de retard',
  },
};
