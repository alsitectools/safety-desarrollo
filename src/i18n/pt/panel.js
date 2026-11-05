// Portugués: textos del área «panel».
export default {
  title: 'Painel',
  subtitle: 'Resumo dos projetos de desenvolvimento Safety',
  subtitleAsOf: 'Situação a {date}',
  empty: {
    title: 'Não há projetos com estes filtros',
    adminHint: 'Crie um projeto a partir da Lista ou carregue os dados iniciais em Configuração.',
    userHint: 'Experimente limpar os filtros.',
  },
  kpis: {
    ariaLabel: 'Indicadores',
    activeProjects: 'Projetos ativos',
    ofSelection: 'de {total} na seleção',
    projects_one: 'projeto',
    projects_other: 'projetos',
    overdueActions: 'Ações vencidas',
    ofOpen: 'de {total} abertas',
    budget: 'Previsto vs. real',
    actual: 'real {amount}',
    actualPct: 'real {amount} ({pct} %)',
  },
  phases: {
    title: 'Projetos por fase',
    hint: 'clique para ver a lista',
    barAria_one: '{camino}, {fase}: {count} projeto',
    barAria_other: '{camino}, {fase}: {count} projetos',
  },
  families: {
    title: 'Semáforo e famílias',
    empty: 'Sem projetos.',
    barAria_one: '{family}: {count} projeto',
    barAria_other: '{family}: {count} projetos',
  },
  upcoming: {
    title: 'Próximas datas',
    horizon: '60 dias',
    empty: 'Nada nos próximos 60 dias',
    groups: {
      semana: 'Próximos 7 dias',
      mes: 'Próximos 30 dias',
      despues: 'Mais tarde',
    },
    types: {
      proyecto: 'Projeto',
      fase: 'Fase',
      accion: 'Ação',
    },
  },
  overdue: {
    title: 'Ações vencidas',
    empty: 'Não há ações vencidas',
    noOwner: 'Sem responsável',
    daysLate_one: '{count} dia de atraso',
    daysLate_other: '{count} dias de atraso',
  },
};
