/**
 * Tipos relacionados ao sistema de permissoes
 */

// Roles fixos do sistema
export type UserRole = 'admin' | 'manager' | 'agent' | 'client';

// Status do usuario
export type UserStatus = 'active' | 'inactive' | 'suspended';

// Permissao individual
export type Permission = string;

// Interface de usuario com permissoes
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  avatar_url?: string;
  phone?: string;
  department?: string;
  permissions: Permission[];
  custom_role_id?: string;
  custom_role?: CustomRole;
  service_desk_id?: string;
  service_desk_ids?: string[];
  created_at: string;
  updated_at: string;
}

// Role customizado
export interface CustomRole {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  color: string;
  is_active: boolean;
  created_by_id?: string;
  created_by?: {
    id: string;
    name: string;
  };
  created_at: string;
  updated_at: string;
}

// Log de auditoria
export interface PermissionAuditLog {
  id: string;
  target_user_id: string;
  target_user?: {
    id: string;
    name: string;
    email: string;
  };
  changed_by_id: string;
  changed_by?: {
    id: string;
    name: string;
    email: string;
  };
  action: PermissionAuditAction;
  old_value?: Record<string, any>;
  new_value?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export type PermissionAuditAction =
  | 'role_changed'
  | 'custom_role_assigned'
  | 'custom_role_removed'
  | 'permissions_added'
  | 'permissions_removed'
  | 'permissions_updated'
  | 'user_created'
  | 'user_status_changed';

// DTOs para criar/atualizar
export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
  status?: UserStatus;
  phone?: string;
  department?: string;
  service_desk_ids?: string[];
  custom_role_id?: string;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  status?: UserStatus;
  phone?: string;
  department?: string;
  service_desk_ids?: string[];
  custom_role_id?: string;
}

export interface CreateCustomRoleDto {
  name: string;
  description?: string;
  permissions: Permission[];
  color?: string;
}

export interface UpdateCustomRoleDto {
  name?: string;
  description?: string;
  permissions?: Permission[];
  color?: string;
  is_active?: boolean;
}

// Mapa de permissoes (chave -> descricao)
export type PermissionsMap = Record<string, string>;

// Permissoes agrupadas por modulo
export type PermissionsByModule = Record<string, Permission[]>;

// Resposta da API de permissoes
export interface PermissionsResponse {
  permissions: PermissionsMap;
  list: Permission[];
  byModule: PermissionsByModule;
}

// Resposta da API de roles defaults
export type DefaultRolePermissions = Record<UserRole, Permission[]>;

// Resposta de listagem com paginacao
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}
