import { UserRole } from '../../users/entities/user.entity';
import { Permission, PERMISSION_LIST } from './all-permissions';

/**
 * Permissoes padrao para cada role do sistema
 * ADMIN tem wildcard '*' que significa todas as permissoes
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  // =====================
  // ADMIN - Acesso total
  // =====================
  [UserRole.ADMIN]: ['*'],

  // =====================
  // MANAGER - Gerencial + Operacional
  // =====================
  [UserRole.MANAGER]: [
    // Tickets - acesso completo
    'tickets:create',
    'tickets:read',
    'tickets:read:all',
    'tickets:update',
    'tickets:delete',
    'tickets:assign',
    'tickets:transfer',
    'tickets:close',
    'tickets:reopen',

    // Usuarios - leitura e atualizacao (sem delete)
    'users:read',
    'users:update',

    // Roles - apenas leitura
    'roles:read',

    // Filas - gerenciamento completo
    'queues:read',
    'queues:create',
    'queues:update',
    'queues:manage-members',

    // Clientes - acesso completo (sem delete)
    'clients:create',
    'clients:read',
    'clients:update',

    // Recursos e Licencas - acesso completo (sem delete)
    'resources:create',
    'resources:read',
    'resources:update',
    'licenses:create',
    'licenses:read',
    'licenses:update',

    // Configuracoes - leitura
    'settings:read',

    // Relatorios
    'reports:view',
    'reports:export',

    // Service Desks - leitura
    'service-desks:read',

    // SLA
    'sla:read',
    'sla:update',

    // Timesheets - gerenciamento completo
    'timesheets:create',
    'timesheets:read',
    'timesheets:read:all',
    'timesheets:update',
    'timesheets:approve',

    // Notificacoes
    'notifications:read',
    'notifications:manage',

    // Catalogo de servicos
    'service-catalog:read',
    'service-catalog:create',
    'service-catalog:update',

    // Downloads
    'downloads:read',
  ],

  // =====================
  // AGENT - Operacional
  // =====================
  [UserRole.AGENT]: [
    // Tickets - operacional
    'tickets:create',
    'tickets:read',
    'tickets:read:assigned',
    'tickets:update',
    'tickets:close',

    // Usuarios - apenas leitura
    'users:read',

    // Filas - leitura
    'queues:read',

    // Clientes - leitura
    'clients:read',

    // Recursos e Licencas - leitura
    'resources:read',
    'licenses:read',

    // Service Desks - leitura
    'service-desks:read',

    // Timesheets - proprio
    'timesheets:create',
    'timesheets:read',
    'timesheets:update',

    // Notificacoes
    'notifications:read',

    // Catalogo de servicos - leitura
    'service-catalog:read',

    // Downloads
    'downloads:read',
  ],

  // =====================
  // CLIENT - Acesso limitado
  // =====================
  [UserRole.CLIENT]: [
    // Tickets - apenas proprios
    'tickets:create',
    'tickets:read:own',
    'tickets:update',

    // Recursos - proprios
    'resources:read',

    // Notificacoes
    'notifications:read',
  ],
};

/**
 * Verifica se uma permissao esta na lista de permissoes de um role
 */
export function roleHasPermission(role: UserRole, permission: Permission): boolean {
  const rolePermissions = DEFAULT_ROLE_PERMISSIONS[role];

  // Wildcard - todas as permissoes
  if (rolePermissions.includes('*')) {
    return true;
  }

  return rolePermissions.includes(permission);
}

/**
 * Obtem todas as permissoes efetivas de um role (expande wildcard)
 */
export function getExpandedRolePermissions(role: UserRole): Permission[] {
  const rolePermissions = DEFAULT_ROLE_PERMISSIONS[role];

  // Wildcard - retorna todas as permissoes
  if (rolePermissions.includes('*')) {
    return [...PERMISSION_LIST];
  }

  return rolePermissions as Permission[];
}
