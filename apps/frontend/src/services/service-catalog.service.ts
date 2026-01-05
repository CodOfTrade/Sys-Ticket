import { api } from './api';

export interface ServiceCatalog {
  id: string;
  name: string;
  description?: string;
  code?: string;
  service_desk_id: string;
  is_billable: boolean;
  default_price?: number;
  display_order: number;
  is_active: boolean;
}

export interface ServiceCategory {
  id: string;
  name: string;
  description?: string;
  service_catalog_id: string;
  icon?: string;
  color?: string;
  display_order: number;
  is_active: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  errors?: any[];
}

export const serviceCatalogService = {
  async getAll(serviceDeskId?: string): Promise<ServiceCatalog[]> {
    const params = serviceDeskId ? { service_desk_id: serviceDeskId } : {};
    const response = await api.get<ApiResponse<ServiceCatalog[]>>(
      '/v1/service-catalog',
      { params }
    );
    return response.data.data;
  },

  async getById(id: string): Promise<ServiceCatalog> {
    const response = await api.get<ApiResponse<ServiceCatalog>>(
      `/v1/service-catalog/${id}`
    );
    return response.data.data;
  },
};
