import { api } from './api';
import {
  Resource,
  ResourceLicense,
  LicenseDeviceAssignment,
  ContractResourceQuota,
  ResourceHistory,
  ResourceStats,
  QuotaUsage,
  CreateResourceDto,
  UpdateResourceDto,
  QueryResourceDto,
  CreateLicenseDto,
  UpdateLicenseDto,
  CreateQuotaDto,
  UpdateQuotaDto,
  LicenseGeneralStats,
  LicenseHistoryEntry,
} from '@/types/resource.types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  errors: any[];
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
}

export const resourceService = {
  // ========================================
  // RESOURCES
  // ========================================

  async getAll(params?: QueryResourceDto): Promise<PaginatedResponse<Resource>> {
    const response = await api.get<ApiResponse<PaginatedResponse<Resource>>>(
      '/v1/resources',
      { params }
    );
    return response.data.data;
  },

  async getById(id: string): Promise<Resource> {
    const response = await api.get<ApiResponse<Resource>>(`/v1/resources/${id}`);
    return response.data.data;
  },

  async create(data: CreateResourceDto): Promise<Resource> {
    const response = await api.post<ApiResponse<Resource>>('/v1/resources', data);
    return response.data.data;
  },

  async update(id: string, data: UpdateResourceDto): Promise<Resource> {
    const response = await api.patch<ApiResponse<Resource>>(`/v1/resources/${id}`, data);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/v1/resources/${id}`);
  },

  async retire(id: string): Promise<Resource> {
    const response = await api.post<ApiResponse<Resource>>(`/v1/resources/${id}/retire`);
    return response.data.data;
  },

  async getByClient(clientId: string): Promise<Resource[]> {
    const response = await api.get<ApiResponse<Resource[]>>(`/v1/resources/client/${clientId}`);
    return response.data.data;
  },

  async getByContract(contractId: string): Promise<Resource[]> {
    const response = await api.get<ApiResponse<Resource[]>>(`/v1/resources/contract/${contractId}`);
    return response.data.data;
  },

  async getHistory(resourceId: string): Promise<ResourceHistory[]> {
    const response = await api.get<ApiResponse<ResourceHistory[]>>(`/v1/resources/${resourceId}/history`);
    return response.data.data;
  },

  async sendCommand(resourceId: string, command: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post<{ success: boolean; message: string }>(
      `/v1/resources/${resourceId}/command`,
      { command }
    );
    // Backend retorna { success, message } direto (TransformInterceptor não embrulha)
    return response.data;
  },

  async cancelCommand(resourceId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post<{ success: boolean; message: string }>(
      `/v1/resources/${resourceId}/command/cancel`
    );
    // Backend retorna { success, message } direto (TransformInterceptor não embrulha)
    return response.data;
  },

  async getStats(clientId?: string): Promise<ResourceStats> {
    const response = await api.get<ApiResponse<ResourceStats>>('/v1/resources/stats/overview', {
      params: clientId ? { clientId } : undefined,
    });
    return response.data.data;
  },

  // ========================================
  // LICENSES
  // ========================================

  async getAllLicenses(params?: {
    clientId?: string;
    contractId?: string;
    licenseType?: string;
    licenseStatus?: string;
  }): Promise<ResourceLicense[]> {
    const response = await api.get<ApiResponse<ResourceLicense[]>>('/v1/resources/licenses', {
      params,
    });
    return response.data.data;
  },

  async getLicenseById(id: string): Promise<ResourceLicense> {
    const response = await api.get<ApiResponse<ResourceLicense>>(`/v1/resources/licenses/${id}`);
    return response.data.data;
  },

  async createLicense(data: CreateLicenseDto): Promise<ResourceLicense> {
    const response = await api.post<ApiResponse<ResourceLicense>>('/v1/resources/licenses', data);
    return response.data.data;
  },

  async updateLicense(id: string, data: UpdateLicenseDto): Promise<ResourceLicense> {
    const response = await api.patch<ApiResponse<ResourceLicense>>(
      `/v1/resources/licenses/${id}`,
      data
    );
    return response.data.data;
  },

  async deleteLicense(id: string): Promise<void> {
    await api.delete(`/v1/resources/licenses/${id}`);
  },

  async assignLicense(licenseId: string, resourceId: string): Promise<ResourceLicense> {
    const response = await api.post<ApiResponse<ResourceLicense>>(
      `/v1/resources/licenses/${licenseId}/assign`,
      { resourceId }
    );
    return response.data.data;
  },

  async unassignLicense(licenseId: string, resourceId: string): Promise<ResourceLicense> {
    const response = await api.post<ApiResponse<ResourceLicense>>(
      `/v1/resources/licenses/${licenseId}/unassign`,
      { resourceId }
    );
    return response.data.data;
  },

  async getAssignedDevices(licenseId: string): Promise<LicenseDeviceAssignment[]> {
    const response = await api.get<ApiResponse<LicenseDeviceAssignment[]>>(
      `/v1/resources/licenses/${licenseId}/devices`
    );
    return response.data.data;
  },

  async getLicensesByResource(resourceId: string): Promise<ResourceLicense[]> {
    const response = await api.get<ApiResponse<ResourceLicense[]>>(
      `/v1/resources/licenses/by-resource/${resourceId}`
    );
    return response.data.data;
  },

  async getAvailableLicenses(clientId: string): Promise<ResourceLicense[]> {
    const response = await api.get<ApiResponse<ResourceLicense[]>>(
      '/v1/resources/licenses/available',
      { params: { clientId } }
    );
    return response.data.data;
  },

  async getExpiringLicenses(days: number = 30): Promise<ResourceLicense[]> {
    const response = await api.get<ApiResponse<ResourceLicense[]>>(
      '/v1/resources/licenses/stats/expiring',
      { params: { days } }
    );
    return response.data.data;
  },

  async getLicenseStats(contractId: string): Promise<any> {
    const response = await api.get<ApiResponse<any>>(
      `/v1/resources/licenses/contract/${contractId}/stats`
    );
    return response.data.data;
  },

  async getGeneralLicenseStats(): Promise<LicenseGeneralStats> {
    const response = await api.get<ApiResponse<LicenseGeneralStats>>(
      '/v1/resources/licenses/stats/general'
    );
    return response.data.data;
  },

  async getLicenseHistory(licenseId: string, limit: number = 50): Promise<LicenseHistoryEntry[]> {
    const response = await api.get<ApiResponse<LicenseHistoryEntry[]>>(
      `/v1/resources/licenses/${licenseId}/history`,
      { params: { limit } }
    );
    return response.data.data;
  },

  async renewLicense(
    licenseId: string,
    renewData: {
      duration_type?: string;
      duration_value?: number;
      new_activation_date?: string;
      extend_from_current?: boolean;
    }
  ): Promise<ResourceLicense> {
    const response = await api.post<ApiResponse<ResourceLicense>>(
      `/v1/resources/licenses/${licenseId}/renew`,
      renewData
    );
    return response.data.data;
  },

  async suspendLicense(licenseId: string, reason?: string): Promise<ResourceLicense> {
    const response = await api.post<ApiResponse<ResourceLicense>>(
      `/v1/resources/licenses/${licenseId}/suspend`,
      { reason }
    );
    return response.data.data;
  },

  async reactivateLicense(licenseId: string): Promise<ResourceLicense> {
    const response = await api.post<ApiResponse<ResourceLicense>>(
      `/v1/resources/licenses/${licenseId}/reactivate`
    );
    return response.data.data;
  },

  async exportLicensesToExcel(params?: {
    clientId?: string;
    licenseStatus?: string;
    licenseType?: string;
  }): Promise<void> {
    const response = await api.get('/v1/resources/licenses/export/excel', {
      params,
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `licencas-${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // ========================================
  // QUOTAS
  // ========================================

  async createQuota(data: CreateQuotaDto): Promise<ContractResourceQuota> {
    const response = await api.post<ApiResponse<ContractResourceQuota>>(
      '/v1/resources/quotas',
      data
    );
    return response.data.data;
  },

  async getQuotaByContract(contractId: string): Promise<ContractResourceQuota> {
    const response = await api.get<ApiResponse<ContractResourceQuota>>(
      `/v1/resources/quotas/contract/${contractId}`
    );
    return response.data.data;
  },

  async getQuotaUsage(contractId: string): Promise<QuotaUsage> {
    const response = await api.get<ApiResponse<QuotaUsage>>(
      `/v1/resources/quotas/contract/${contractId}/usage`
    );
    return response.data.data;
  },

  async updateQuota(id: string, data: UpdateQuotaDto): Promise<ContractResourceQuota> {
    const response = await api.patch<ApiResponse<ContractResourceQuota>>(
      `/v1/resources/quotas/${id}`,
      data
    );
    return response.data.data;
  },

  async recalculateQuota(contractId: string): Promise<ContractResourceQuota> {
    const response = await api.post<ApiResponse<ContractResourceQuota>>(
      `/v1/resources/quotas/contract/${contractId}/recalculate`
    );
    return response.data.data;
  },
};
