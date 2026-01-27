import { api } from './api';

export interface Contract {
  id: string;
  sige_id?: string;
  numero_contrato?: string;
  descricao?: string;
  valor_mensal?: number;
  data_inicio?: string;
  data_fim?: string;
  status?: string;
  tipo?: string;
  observacoes?: string;
  ativo: boolean;
}

export interface ContractQuota {
  id: string;
  contract_id: string;
  client_id: string;
  computers_quota: number;
  computers_used: number;
  printers_quota: number;
  printers_used: number;
  monitors_quota: number;
  monitors_used: number;
  servers_quota: number;
  servers_used: number;
  windows_licenses_quota: number;
  windows_licenses_used: number;
  office_licenses_quota: number;
  office_licenses_used: number;
  antivirus_licenses_quota: number;
  antivirus_licenses_used: number;
  allow_exceed: boolean;
  alert_threshold: number;
}

export interface QuotaUsageItem {
  quota: number;
  used: number;
  available: number;
  percentage: number;
}

export interface QuotaUsage {
  quota: ContractQuota;
  usage: {
    computers: QuotaUsageItem;
    printers: QuotaUsageItem;
    monitors: QuotaUsageItem;
    servers: QuotaUsageItem;
    windows_licenses: QuotaUsageItem;
    office_licenses: QuotaUsageItem;
    antivirus_licenses: QuotaUsageItem;
  };
  alerts: string[];
}

export interface CreateQuotaDto {
  contract_id: string;
  client_id: string;
  computers_quota?: number;
  printers_quota?: number;
  monitors_quota?: number;
  servers_quota?: number;
  windows_licenses_quota?: number;
  office_licenses_quota?: number;
  antivirus_licenses_quota?: number;
  allow_exceed?: boolean;
  alert_threshold?: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export const contractService = {
  async getByClient(clientId: string): Promise<Contract[]> {
    try {
      const response = await api.get<ApiResponse<Contract[]>>(`/v1/clients/contract/client/${clientId}`);
      if (!response.data || !response.data.data) {
        return [];
      }
      return Array.isArray(response.data.data) ? response.data.data : [];
    } catch (error) {
      console.error('Erro ao buscar contratos:', error);
      return [];
    }
  },

  async getContractQuota(contractId: string): Promise<ContractQuota | null> {
    try {
      const response = await api.get<ApiResponse<ContractQuota>>(`/v1/resources/quotas/contract/${contractId}`);
      return response.data.data;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  async getQuotaUsage(contractId: string): Promise<QuotaUsage | null> {
    try {
      const response = await api.get<ApiResponse<QuotaUsage>>(`/v1/resources/quotas/contract/${contractId}/usage`);
      return response.data.data;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  async createContractQuota(data: CreateQuotaDto): Promise<ContractQuota> {
    const response = await api.post<ApiResponse<ContractQuota>>('/v1/resources/quotas', data);
    return response.data.data;
  },

  async updateContractQuota(id: string, data: Partial<CreateQuotaDto>): Promise<ContractQuota> {
    const response = await api.patch<ApiResponse<ContractQuota>>(`/v1/resources/quotas/${id}`, data);
    return response.data.data;
  },

  async recalculateQuota(contractId: string): Promise<ContractQuota> {
    const response = await api.post<ApiResponse<ContractQuota>>(`/v1/resources/quotas/contract/${contractId}/recalculate`);
    return response.data.data;
  },
};
