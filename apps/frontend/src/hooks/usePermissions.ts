import { useMemo, useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';
import type { UserRole, Permission } from '@/types/permissions.types';

/**
 * Hook para verificar permissoes do usuario atual
 *
 * @example
 * const { hasPermission, isAdmin } = usePermissions();
 *
 * if (hasPermission('tickets:create')) {
 *   // pode criar ticket
 * }
 *
 * if (isAdmin) {
 *   // pode fazer qualquer coisa
 * }
 */
export function usePermissions() {
  const user = useAuthStore((state) => state.user);

  const permissions = useMemo(() => user?.permissions || [], [user?.permissions]);
  const role = user?.role as UserRole | undefined;

  /**
   * Verifica se o usuario tem TODAS as permissoes especificadas
   */
  const hasPermission = useCallback(
    (permission: Permission | Permission[]): boolean => {
      // Admin tem todas as permissoes
      if (role === 'admin') return true;

      // Wildcard
      if (permissions.includes('*')) return true;

      const perms = Array.isArray(permission) ? permission : [permission];
      return perms.every((p) => permissions.includes(p));
    },
    [permissions, role],
  );

  /**
   * Verifica se o usuario tem PELO MENOS UMA das permissoes especificadas
   */
  const hasAnyPermission = useCallback(
    (permissionList: Permission[]): boolean => {
      // Admin tem todas as permissoes
      if (role === 'admin') return true;

      // Wildcard
      if (permissions.includes('*')) return true;

      return permissionList.some((p) => permissions.includes(p));
    },
    [permissions, role],
  );

  /**
   * Verifica se o usuario tem um role especifico ou superior
   */
  const hasRole = useCallback(
    (requiredRole: UserRole | UserRole[]): boolean => {
      if (!role) return false;

      const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      return roles.includes(role);
    },
    [role],
  );

  // Helpers de role
  const isAdmin = role === 'admin';
  const isManager = role === 'manager' || isAdmin;
  const isAgent = role === 'agent' || isManager;
  const isClient = role === 'client';

  return {
    // Estado
    permissions,
    role,

    // Verificadores
    hasPermission,
    hasAnyPermission,
    hasRole,

    // Helpers de role
    isAdmin,
    isManager,
    isAgent,
    isClient,
  };
}
