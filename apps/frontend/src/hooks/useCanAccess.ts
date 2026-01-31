import { useMemo } from 'react';
import { usePermissions } from './usePermissions';
import type { Permission, UserRole } from '@/types/permissions.types';

interface AccessConfig {
  /** Permissoes necessarias (AND - todas sao requeridas se requireAll=true) */
  permissions?: Permission[];
  /** Roles permitidos */
  roles?: UserRole[];
  /** Se true, requer TODAS as permissoes. Se false, requer PELO MENOS UMA. Default: true */
  requireAll?: boolean;
}

/**
 * Hook para verificar se o usuario pode acessar um recurso
 *
 * @example
 * // Verifica se pode acessar a pagina de configuracoes
 * const canAccessSettings = useCanAccess({
 *   roles: ['admin', 'manager'],
 *   permissions: ['settings:read'],
 * });
 *
 * @example
 * // Verifica se pode deletar usuarios (requer TODAS as permissoes)
 * const canDeleteUser = useCanAccess({
 *   permissions: ['users:delete', 'users:manage-permissions'],
 *   requireAll: true,
 * });
 *
 * @example
 * // Verifica se pode ver tickets (requer PELO MENOS UMA permissao)
 * const canViewTickets = useCanAccess({
 *   permissions: ['tickets:read', 'tickets:read:all', 'tickets:read:own'],
 *   requireAll: false,
 * });
 */
export function useCanAccess(config: AccessConfig): boolean {
  const { hasPermission, hasAnyPermission, hasRole, isAdmin } = usePermissions();

  return useMemo(() => {
    // Admin sempre pode acessar
    if (isAdmin) return true;

    const { permissions = [], roles = [], requireAll = true } = config;

    // Verifica roles primeiro
    if (roles.length > 0 && !hasRole(roles)) {
      return false;
    }

    // Verifica permissoes
    if (permissions.length > 0) {
      return requireAll ? hasPermission(permissions) : hasAnyPermission(permissions);
    }

    // Se nao especificou permissoes nem roles, permite
    return true;
  }, [config, hasPermission, hasAnyPermission, hasRole, isAdmin]);
}

/**
 * Hook para obter funcao de verificacao de acesso (util para listas)
 *
 * @example
 * const checkAccess = useCanAccessFn();
 *
 * const menuItems = allMenuItems.filter(item =>
 *   checkAccess({ permissions: item.permissions, roles: item.roles })
 * );
 */
export function useCanAccessFn() {
  const { hasPermission, hasAnyPermission, hasRole, isAdmin } = usePermissions();

  return (config: AccessConfig): boolean => {
    if (isAdmin) return true;

    const { permissions = [], roles = [], requireAll = true } = config;

    if (roles.length > 0 && !hasRole(roles)) {
      return false;
    }

    if (permissions.length > 0) {
      return requireAll ? hasPermission(permissions) : hasAnyPermission(permissions);
    }

    return true;
  };
}
