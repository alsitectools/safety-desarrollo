// Textos del armazón de la app: cabecera, navegación, estados comunes, semáforo y responsables.
export default {
  documentTitle: 'Alsina Safety · Desarrollo',
  checkingSession: 'Comprobando la sesión del portal…',
  bootError: 'No se han podido cargar los datos de la aplicación',
  brand: {
    appName: 'Desarrollo',
    subtitle: 'Diseño, homologación y aprovisionamiento',
    homeAria: '{brand}, ir al panel',
  },
  nav: {
    aria: 'Secciones',
    panel: 'Panel',
    kanban: 'Kanban',
    list: 'Lista',
    suppliers: 'Fabricantes',
    config: 'Configuración',
    backToPortal: '← Portal',
  },
  signal: {
    verde: 'En plazo',
    ambar: 'Atención',
    rojo: 'Fuera de plazo',
    gris: 'Sin seguimiento',
  },
  signalHelp: {
    verde: 'En plazo',
    ambar: 'Fecha objetivo en menos de 15 días o acciones vencidas',
    rojo: 'Fecha objetivo superada',
    gris: 'Proyecto no activo',
  },
  roles: {
    design: 'Diseño',
    sourcing: 'Búsqueda',
    homologation: 'Homologación',
  },
  rolesShort: {
    design: 'D',
    sourcing: 'B',
    homologation: 'H',
  },
  ownerTitle: '{role}: {name}',
  noOwners: 'Sin responsables',
  busy: 'Un momento…',
  error: {
    generic: 'Ha ocurrido un error.',
    title: 'No se ha podido completar',
    schemaMissing: 'Base de datos sin preparar',
    fieldLine: '{field}:',
  },
  upcoming: {
    week: 'Próximos 7 días',
    month: 'Próximos 30 días',
    later: 'Más adelante',
  },
  defaultFileName: 'documento',
};
