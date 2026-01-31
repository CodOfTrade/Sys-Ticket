import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { useCanAccess } from '@/hooks/useCanAccess';
import type { Permission, UserRole } from '@/types/permissions.types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Permissoes necessarias para acessar a rota */
  permissions?: Permission[];
  /** Roles permitidos para acessar a rota */
  roles?: UserRole[];
  /** Se true, requer TODAS as permissoes. Default: true */
  requireAll?: boolean;
  /** Componente a ser exibido se nao tiver permissao (default: redireciona para /unauthorized) */
  fallback?: React.ReactNode;
  /** URL para redirecionar se nao tiver permissao */
  redirectTo?: string;
}

/**
 * Componente para proteger rotas baseado em autenticacao e permissoes
 *
 * @example
 * // Apenas requer autenticacao
 * <ProtectedRoute>
 *   <Dashboard />
 * </ProtectedRoute>
 *
 * @example
 * // Requer roles especificos
 * <ProtectedRoute roles={['admin', 'manager']}>
 *   <SettingsPage />
 * </ProtectedRoute>
 *
 * @example
 * // Requer permissoes especificas
 * <ProtectedRoute permissions={['users:read', 'users:update']}>
 *   <UsersPage />
 * </ProtectedRoute>
 */
export function ProtectedRoute({
  children,
  permissions = [],
  roles = [],
  requireAll = true,
  fallback,
  redirectTo = '/unauthorized',
}: ProtectedRouteProps) {
  const { isAuthenticated } = useAuthStore();
  const canAccess = useCanAccess({ permissions, roles, requireAll });

  // Se nao esta autenticado, redireciona para login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Se nao tem permissao/role, mostra fallback ou redireciona
  if (!canAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
