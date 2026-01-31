/**
 * Todas as permissoes disponiveis no sistema
 * Formato: 'modulo:acao' ou 'modulo:recurso:acao'
 */
export const ALL_PERMISSIONS = {
  // =====================
  // TICKETS (10)
  // =====================
  'tickets:create': 'Criar tickets',
  'tickets:read': 'Visualizar tickets',
  'tickets:read:all': 'Ver todos os tickets',
  'tickets:read:own': 'Ver apenas proprios tickets',
  'tickets:read:assigned': 'Ver tickets atribuidos',
  'tickets:update': 'Atualizar tickets',
  'tickets:delete': 'Excluir tickets',
  'tickets:assign': 'Atribuir tickets a usuarios',
  'tickets:transfer': 'Transferir tickets entre filas',
  'tickets:close': 'Fechar tickets',
  'tickets:reopen': 'Reabrir tickets fechados',

  // =====================
  // USUARIOS (5)
  // =====================
  'users:create': 'Criar usuarios',
  'users:read': 'Visualizar usuarios',
  'users:update': 'Atualizar usuarios',
  'users:delete': 'Excluir usuarios',
  'users:manage-permissions': 'Gerenciar permissoes de usuarios',

  // =====================
  // ROLES/PERFIS (4)
  // =====================
  'roles:create': 'Criar perfis customizados',
  'roles:read': 'Visualizar perfis',
  'roles:update': 'Atualizar perfis',
  'roles:delete': 'Excluir perfis',

  // =====================
  // FILAS (4)
  // =====================
  'queues:read': 'Visualizar filas',
  'queues:create': 'Criar filas',
  'queues:update': 'Atualizar filas',
  'queues:delete': 'Excluir filas',
  'queues:manage-members': 'Gerenciar membros de filas',

  // =====================
  // CLIENTES (4)
  // =====================
  'clients:create': 'Criar clientes',
  'clients:read': 'Visualizar clientes',
  'clients:update': 'Atualizar clientes',
  'clients:delete': 'Excluir clientes',

  // =====================
  // RECURSOS/ASSETS (4)
  // =====================
  'resources:create': 'Criar recursos',
  'resources:read': 'Visualizar recursos',
  'resources:update': 'Atualizar recursos',
  'resources:delete': 'Excluir recursos',

  // =====================
  // LICENCAS (4)
  // =====================
  'licenses:create': 'Criar licencas',
  'licenses:read': 'Visualizar licencas',
  'licenses:update': 'Atualizar licencas',
  'licenses:delete': 'Excluir licencas',

  // =====================
  // CONFIGURACOES (3)
  // =====================
  'settings:read': 'Visualizar configuracoes',
  'settings:update': 'Atualizar configuracoes',
  'settings:branding': 'Gerenciar identidade visual',

  // =====================
  // RELATORIOS (2)
  // =====================
  'reports:view': 'Visualizar relatorios',
  'reports:export': 'Exportar relatorios',

  // =====================
  // SERVICE DESKS (4)
  // =====================
  'service-desks:read': 'Visualizar mesas de servico',
  'service-desks:create': 'Criar mesas de servico',
  'service-desks:update': 'Atualizar mesas de servico',
  'service-desks:delete': 'Excluir mesas de servico',

  // =====================
  // SLA (2)
  // =====================
  'sla:read': 'Visualizar configuracoes de SLA',
  'sla:update': 'Atualizar configuracoes de SLA',

  // =====================
  // TIMESHEETS (5)
  // =====================
  'timesheets:create': 'Criar apontamentos',
  'timesheets:read': 'Visualizar apontamentos',
  'timesheets:read:all': 'Ver todos os apontamentos',
  'timesheets:update': 'Atualizar apontamentos',
  'timesheets:delete': 'Excluir apontamentos',
  'timesheets:approve': 'Aprovar apontamentos',

  // =====================
  // NOTIFICACOES (2)
  // =====================
  'notifications:read': 'Visualizar notificacoes',
  'notifications:manage': 'Gerenciar configuracoes de notificacoes',

  // =====================
  // AUDITORIA (1)
  // =====================
  'audit:view': 'Visualizar logs de auditoria',

  // =====================
  // CATALOGO DE SERVICOS (4)
  // =====================
  'service-catalog:read': 'Visualizar catalogo de servicos',
  'service-catalog:create': 'Criar servicos no catalogo',
  'service-catalog:update': 'Atualizar servicos do catalogo',
  'service-catalog:delete': 'Excluir servicos do catalogo',

  // =====================
  // DOWNLOADS/AGENT (2)
  // =====================
  'downloads:read': 'Acessar pagina de downloads',
  'downloads:manage': 'Gerenciar releases do agent',
} as const;

export type Permission = keyof typeof ALL_PERMISSIONS;

export const PERMISSION_LIST = Object.keys(ALL_PERMISSIONS) as Permission[];

/**
 * Agrupa permissoes por modulo para exibicao na UI
 */
export const PERMISSIONS_BY_MODULE = {
  tickets: PERMISSION_LIST.filter((p) => p.startsWith('tickets:')),
  users: PERMISSION_LIST.filter((p) => p.startsWith('users:')),
  roles: PERMISSION_LIST.filter((p) => p.startsWith('roles:')),
  queues: PERMISSION_LIST.filter((p) => p.startsWith('queues:')),
  clients: PERMISSION_LIST.filter((p) => p.startsWith('clients:')),
  resources: PERMISSION_LIST.filter((p) => p.startsWith('resources:')),
  licenses: PERMISSION_LIST.filter((p) => p.startsWith('licenses:')),
  settings: PERMISSION_LIST.filter((p) => p.startsWith('settings:')),
  reports: PERMISSION_LIST.filter((p) => p.startsWith('reports:')),
  'service-desks': PERMISSION_LIST.filter((p) => p.startsWith('service-desks:')),
  sla: PERMISSION_LIST.filter((p) => p.startsWith('sla:')),
  timesheets: PERMISSION_LIST.filter((p) => p.startsWith('timesheets:')),
  notifications: PERMISSION_LIST.filter((p) => p.startsWith('notifications:')),
  audit: PERMISSION_LIST.filter((p) => p.startsWith('audit:')),
  'service-catalog': PERMISSION_LIST.filter((p) => p.startsWith('service-catalog:')),
  downloads: PERMISSION_LIST.filter((p) => p.startsWith('downloads:')),
};

export type PermissionModule = keyof typeof PERMISSIONS_BY_MODULE;
