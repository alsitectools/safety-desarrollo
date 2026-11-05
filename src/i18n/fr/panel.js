// Francés: textos del área «panel».
export default {
  title: "Tableau de bord",
  subtitle: "Synthèse des projets de développement Safety",
  subtitleAsOf: "Situation au {date}",
  empty: {
    title: "Aucun projet avec ces filtres",
    adminHint: "Créez un projet depuis la Liste ou chargez les données initiales dans Paramètres.",
    userHint: "Essayez d'effacer des filtres.",
  },
  kpis: {
    ariaLabel: "Indicateurs",
    activeProjects: "Projets actifs",
    ofSelection: "sur {total} dans la sélection",
    projects_one: "projet",
    projects_other: "projets",
    overdueActions: "Actions en retard",
    ofOpen: "sur {total} ouvertes",
    budget: "Prévu vs réel",
    actual: "réel {amount}",
    actualPct: "réel {amount} ({pct} %)",
  },
  phases: {
    title: "Projets par phase",
    hint: "cliquez pour voir la liste",
    barAria_one: "{camino}, {fase} : {count} projet",
    barAria_other: "{camino}, {fase} : {count} projets",
  },
  families: {
    title: "Indicateur et familles",
    empty: "Aucun projet.",
    barAria_one: "{family} : {count} projet",
    barAria_other: "{family} : {count} projets",
  },
  upcoming: {
    title: "Prochaines échéances",
    horizon: "60 jours",
    empty: "Rien dans les 60 prochains jours",
    groups: {
      semana: "7 prochains jours",
      mes: "30 prochains jours",
      despues: "Plus tard",
    },
    types: {
      proyecto: "Projet",
      fase: "Phase",
      accion: "Action",
    },
  },
  overdue: {
    title: "Actions en retard",
    empty: "Aucune action en retard",
    noOwner: "Sans responsable",
    daysLate_one: "{count} jour de retard",
    daysLate_other: "{count} jours de retard",
  },
};
