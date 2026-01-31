import api from './api';
import type {
  PermissionsResponse,
  DefaultRolePermissions,
  CustomRole,
  CreateCustomRoleDto,
  UpdateCustomRoleDto,
  PermissionAuditLog,
  PaginatedResponse,
  Permission,
} from '@/types/permissions.types';

/**
 * Service para gerenciar permissoes e roles customizados
 */
export const permissionService = {
  // =====================
  // INFORMACOES GERAIS
  // =====================

  /**
   * Lista todas as permissoes disponiveis no sistema
   */
  async getAllPermissions(): Promise<PermissionsResponse> {
    const response = await api.get<PermissionsResponse>('/v1/permissions/all');
    return response.data;
  },

  /**
   * Lista permissoes padrao de cada role fixo
   */
  async getDefaultRolePermissions(): Promise<DefaultRolePermissions> {
    const response = await api.get<DefaultRolePermissions>('/v1/permissions/roles/defaults');
    return response.data;
  },

  // =====================
  // CUSTOM ROLES
  // =====================

  /**
   * Lista todos os roles customizados
   */
  async getAllCustomRoles(includeInactive = false): Promise<CustomRole[]> {
    const response = await api.get<CustomRole[]>('/v1/permissions/roles', {
      params: { includeInactive: includeInactive ? 'true' : undefined },
    });
    return response.data;
  },

  /**
   * Busca um role customizado por ID
   */
  async getCustomRoleById(id: string): Promise<CustomRole> {
    const response = await api.get<CustomRole>(`/v1/permissions/roles/${id}`);
    return response.data;
  },

  /**
   * Cria um novo role customizado
   */
  async createCustomRole(data: CreateCustomRoleDto): Promise<CustomRole> {
    const response = await api.post<CustomRole>('/v1/permissions/roles', data);
    return response.data;
  },

  /**
   * Atualiza um role customizado
   */
  async updateCustomRole(id: string, data: UpdateCustomRoleDto): Promise<CustomRole> {
    const response = await api.patch<CustomRole>(`/v1/permissions/roles/${id}`, data);
    return response.data;
  },

  /**
   * Remove um role customizado
   */
  async deleteCustomRole(id: string): Promise<void> {
    await api.delete(`/v1/permissions/roles/${id}`);
  },

  // =====================
  // PERMISSOES DO USUARIO
  // =====================

  /**
   * Obtem permissoes efetivas de um usuario
   */
  async getUserPermissions(userId: string): Promise<Permission[]> {
    const response = await api.get<{ permissions: Permission[] }>(
      `/v1/permissions/user/${userId}`,
    );
    return response.data.permissions;
  },

  /**
   * Atualiza permissoes extras de um usuario
   */
  async updateUserPermissions(userId: string, permissions: Permission[]): Promise<any> {
    const response = await api.put(`/v1/permissions/user/${userId}/permissions`, {
      permissions,
    });
    return response.data;
  },

  /**
   * Atualiza role fixo de um usuario
   */
  async updateUserRole(userId: string, role: string): Promise<any> {
    const response = await api.put(`/v1/permissions/user/${userId}/role`, { role });
    return response.data;
  },

  /**
   * Atribui um role customizado a um usuario
   */
  async assignCustomRole(userId: string, customRoleId: string): Promise<any> {
    const response = await api.put(`/v1/permissions/user/${userId}/custom-role`, {
      custom_role_id: customRoleId,
    });
    return response.data;
  },

  /**
   * Remove role customizado de um usuario
   */
  async removeCustomRole(userId: string): Promise<any> {
    const response = await api.delete(`/v1/permissions/user/${userId}/custom-role`);
    return response.data;
  },

  // =====================
  // AUDITORIA
  // =====================

  /**
   * Lista logs de auditoria de permissoes
   */
  async getAuditLogs(params: {
    targetUserId?: string;
    changedById?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    perPage?: number;
  }): Promise<{ data: PermissionAuditLog[]; total: number }> {
    const response = await api.get<{ data: PermissionAuditLog[]; total: number }>(
      '/v1/permissions/audit',
      { params },
    );
    return response.data;
  },
};
