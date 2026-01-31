import React from 'react';
import { useCanAccess } from '@/hooks/useCanAccess';
import type { Permission, UserRole } from '@/types/permissions.types';

interface PermissionGateProps {
  /** Permissoes necessarias */
  permissions?: Permission[];
  /** Roles permitidos */
  roles?: UserRole[];
  /** Se true, requer TODAS as permissoes. Se false, requer PELO MENOS UMA. Default: true */
  requireAll?: boolean;
  /** Conteudo a ser renderizado se tiver acesso */
  children: React.ReactNode;
  /** Conteudo alternativo se nao tiver acesso (opcional) */
  fallback?: React.ReactNode;
}

/**
 * Componente para renderizar conteudo condicionalmente baseado em permissoes
 *
 * @example
 * // Mostra botao apenas para quem pode deletar usuarios
 * <PermissionGate permissions={['users:delete']}>
 *   <button>Excluir Usuario</button>
 * </PermissionGate>
 *
 * @example
 * // Mostra para admin ou manager
 * <PermissionGate roles={['admin', 'manager']}>
 *   <AdminPanel />
 * </PermissionGate>
 *
 * @example
 * // Com fallback
 * <PermissionGate permissions={['reports:view']} fallback={<p>Sem acesso</p>}>
 *   <ReportsPanel />
 * </PermissionGate>
 */
export function PermissionGate({
  permissions = [],
  roles = [],
  requireAll = true,
  children,
  fallback = null,
}: PermissionGateProps) {
  const canAccess = useCanAccess({ permissions, roles, requireAll });

  if (!canAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * HOC para proteger componentes com permissoes
 *
 * @example
 * const ProtectedAdminPanel = withPermissions(AdminPanel, {
 *   roles: ['admin'],
 * });
 */
export function withPermissions<P extends object>(
  Component: React.ComponentType<P>,
  config: { permissions?: Permission[]; roles?: UserRole[]; requireAll?: boolean },
) {
  return function PermissionWrappedComponent(props: P) {
    const canAccess = useCanAccess(config);

    if (!canAccess) {
      return null;
    }

    return <Component {...props} />;
  };
}
