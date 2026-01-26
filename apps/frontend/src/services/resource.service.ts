import { api } from './api';
import {
  Resource,
  ResourceLicense,
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
    const response = await api.post<ApiResponse<{ success: boolean; message: string }>>(
      `/v1/resources/${resourceId}/command`,
      { command }
    );
    return response.data.data;
  },

  async cancelCommand(resourceId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post<ApiResponse<{ success: boolean; message: string }>>(
      `/v1/resources/${resourceId}/command/cancel`
    );
    return response.data.data;
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

  async unassignLicense(licenseId: string): Promise<ResourceLicense> {
    const response = await api.post<ApiResponse<ResourceLicense>>(
      `/v1/resources/licenses/${licenseId}/unassign`
    );
    return response.data.data;
  },

  async getAvailableLicenses(contractId: string): Promise<ResourceLicense[]> {
    const response = await api.get<ApiResponse<ResourceLicense[]>>(
      `/v1/resources/licenses/contract/${contractId}/available`
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
