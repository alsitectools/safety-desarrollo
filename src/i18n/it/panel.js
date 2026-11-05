// Italiano: textos del área «panel».
export default {
  title: "Dashboard",
  subtitle: "Riepilogo dei progetti di sviluppo Safety",
  subtitleAsOf: "Situazione al {date}",
  empty: {
    title: "Nessun progetto con questi filtri",
    adminHint: "Crea un progetto dall'Elenco o carica i dati iniziali in Impostazioni.",
    userHint: "Prova a rimuovere i filtri.",
  },
  kpis: {
    ariaLabel: "Indicatori",
    activeProjects: "Progetti attivi",
    ofSelection: "su {total} nella selezione",
    projects_one: "progetto",
    projects_other: "progetti",
    overdueActions: "Azioni scadute",
    ofOpen: "su {total} aperte",
    budget: "Previsto vs effettivo",
    actual: "effettivo {amount}",
    actualPct: "effettivo {amount} ({pct} %)",
  },
  phases: {
    title: "Progetti per fase",
    hint: "fai clic per vedere l'elenco",
    barAria_one: "{camino}, {fase}: {count} progetto",
    barAria_other: "{camino}, {fase}: {count} progetti",
  },
  families: {
    title: "Semaforo e famiglie",
    empty: "Nessun progetto.",
    barAria_one: "{family}: {count} progetto",
    barAria_other: "{family}: {count} progetti",
  },
  upcoming: {
    title: "Prossime scadenze",
    horizon: "60 giorni",
    empty: "Nulla nei prossimi 60 giorni",
    groups: {
      semana: "Prossimi 7 giorni",
      mes: "Prossimi 30 giorni",
      despues: "Più avanti",
    },
    types: {
      proyecto: "Progetto",
      fase: "Fase",
      accion: "Azione",
    },
  },
  overdue: {
    title: "Azioni scadute",
    empty: "Nessuna azione scaduta",
    noOwner: "Nessun responsabile",
    daysLate_one: "{count} giorno di ritardo",
    daysLate_other: "{count} giorni di ritardo",
  },
};
