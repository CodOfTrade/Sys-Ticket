import { api } from './api';

export interface ServiceCatalog {
  id: string;
  name: string;
  description?: string;
  code?: string;
  service_desk_id: string;
  sla_config?: {
    low: { first_response: number; resolution: number };
    medium: { first_response: number; resolution: number };
    high: { first_response: number; resolution: number };
    urgent: { first_response: number; resolution: number };
  };
  requires_approval: boolean;
  is_billable: boolean;
  default_price?: number;
  estimated_time?: number;
  display_order: number;
  is_active: boolean;
  categories?: ServiceCategory[];
  created_at?: string;
  updated_at?: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
  description?: string;
  code?: string;
  service_catalog_id: string;
  icon?: string;
  color?: string;
  display_order: number;
  is_active: boolean;
  service_catalog?: ServiceCatalog;
  created_at?: string;
  updated_at?: string;
}

export interface CreateServiceCatalogDto {
  name: string;
  description?: string;
  code?: string;
  service_desk_id: string;
  sla_config?: ServiceCatalog['sla_config'];
  requires_approval?: boolean;
  is_billable?: boolean;
  default_price?: number;
  estimated_time?: number;
  display_order?: number;
}

export interface CreateServiceCategoryDto {
  name: string;
  description?: string;
  code?: string;
  service_catalog_id: string;
  icon?: string;
  color?: string;
  display_order?: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: any[];
}

export const serviceCatalogService = {
  // ========================================
  // CATÁLOGOS DE SERVIÇO
  // ========================================

  async getAll(serviceDeskId?: string): Promise<ServiceCatalog[]> {
    const params = serviceDeskId ? { service_desk_id: serviceDeskId } : {};
    const response = await api.get<ApiResponse<ServiceCatalog[]>>(
      '/v1/service-catalog',
      { params }
    );
    return response.data.data;
  },

  async getAllIncludingInactive(serviceDeskId?: string): Promise<ServiceCatalog[]> {
    const params = serviceDeskId ? { service_desk_id: serviceDeskId } : {};
    const response = await api.get<ApiResponse<ServiceCatalog[]>>(
      '/v1/service-catalog/all',
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

  async create(data: CreateServiceCatalogDto): Promise<ServiceCatalog> {
    const response = await api.post<ApiResponse<ServiceCatalog>>(
      '/v1/service-catalog',
      data
    );
    return response.data.data;
  },

  async update(id: string, data: Partial<CreateServiceCatalogDto>): Promise<ServiceCatalog> {
    const response = await api.put<ApiResponse<ServiceCatalog>>(
      `/v1/service-catalog/${id}`,
      data
    );
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/v1/service-catalog/${id}`);
  },

  // ========================================
  // CATEGORIAS DE SERVIÇO
  // ========================================

  async getAllCategories(serviceCatalogId?: string): Promise<ServiceCategory[]> {
    const params = serviceCatalogId ? { service_catalog_id: serviceCatalogId } : {};
    const response = await api.get<ApiResponse<ServiceCategory[]>>(
      '/v1/service-catalog/categories/all',
      { params }
    );
    return response.data.data;
  },

  async getCategoriesByCatalog(catalogId: string): Promise<ServiceCategory[]> {
    const response = await api.get<ApiResponse<ServiceCategory[]>>(
      `/v1/service-catalog/${catalogId}/categories`
    );
    return response.data.data;
  },

  async getCategoryById(id: string): Promise<ServiceCategory> {
    const response = await api.get<ApiResponse<ServiceCategory>>(
      `/v1/service-catalog/categories/${id}`
    );
    return response.data.data;
  },

  async createCategory(data: CreateServiceCategoryDto): Promise<ServiceCategory> {
    const response = await api.post<ApiResponse<ServiceCategory>>(
      '/v1/service-catalog/categories',
      data
    );
    return response.data.data;
  },

  async updateCategory(id: string, data: Partial<CreateServiceCategoryDto>): Promise<ServiceCategory> {
    const response = await api.put<ApiResponse<ServiceCategory>>(
      `/v1/service-catalog/categories/${id}`,
      data
    );
    return response.data.data;
  },

  async deleteCategory(id: string): Promise<void> {
    await api.delete(`/v1/service-catalog/categories/${id}`);
  },
};
