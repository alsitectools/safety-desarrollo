// Alemán: textos del área «panel».
export default {
  title: 'Übersicht',
  subtitle: 'Übersicht der Safety-Entwicklungsprojekte',
  subtitleAsOf: 'Stand {date}',
  empty: {
    title: 'Keine Projekte mit diesen Filtern',
    adminHint: 'Legen Sie ein Projekt in der Liste an oder laden Sie die Startdaten unter Einstellungen.',
    userHint: 'Versuchen Sie, Filter zu entfernen.',
  },
  kpis: {
    ariaLabel: 'Kennzahlen',
    activeProjects: 'Aktive Projekte',
    ofSelection: 'von {total} in der Auswahl',
    projects_one: 'Projekt',
    projects_other: 'Projekte',
    overdueActions: 'Überfällige Aktionen',
    ofOpen: 'von {total} offenen',
    budget: 'Plan vs. Ist',
    actual: 'Ist {amount}',
    actualPct: 'Ist {amount} ({pct} %)',
  },
  phases: {
    title: 'Projekte nach Phase',
    hint: 'Klicken für die Liste',
    barAria_one: '{camino}, {fase}: {count} Projekt',
    barAria_other: '{camino}, {fase}: {count} Projekte',
  },
  families: {
    title: 'Ampel und Familien',
    empty: 'Keine Projekte.',
    barAria_one: '{family}: {count} Projekt',
    barAria_other: '{family}: {count} Projekte',
  },
  upcoming: {
    title: 'Nächste Termine',
    horizon: '60 Tage',
    empty: 'Nichts in den nächsten 60 Tagen',
    groups: {
      semana: 'Nächste 7 Tage',
      mes: 'Nächste 30 Tage',
      despues: 'Später',
    },
    types: {
      proyecto: 'Projekt',
      fase: 'Phase',
      accion: 'Aktion',
    },
  },
  overdue: {
    title: 'Überfällige Aktionen',
    empty: 'Keine überfälligen Aktionen',
    noOwner: 'Ohne Verantwortlichen',
    daysLate_one: '{count} Tag Verzug',
    daysLate_other: '{count} Tage Verzug',
  },
};
