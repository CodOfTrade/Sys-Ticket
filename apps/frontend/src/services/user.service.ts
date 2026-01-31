import api from './api';
import type {
  User,
  CreateUserDto,
  UpdateUserDto,
  UserRole,
  UserStatus,
} from '@/types/permissions.types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  errors?: any[];
}

interface UsersListResponse {
  data: User[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

interface UsersQueryParams {
  page?: number;
  perPage?: number;
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export const userService = {
  /**
   * Lista usuarios com paginacao e filtros
   */
  async getAll(params?: UsersQueryParams): Promise<UsersListResponse> {
    try {
      const response = await api.get<UsersListResponse>('/v1/users', { params });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar usuarios:', error);
      return { data: [], total: 0, page: 1, perPage: 20, totalPages: 0 };
    }
  },

  /**
   * Lista apenas tecnicos (agents e managers)
   */
  async getAllTechnicians(): Promise<User[]> {
    try {
      const response = await api.get<ApiResponse<User[]>>('/v1/users/technicians');
      return response.data.data || [];
    } catch (error) {
      console.error('Erro ao buscar tecnicos:', error);
      return [];
    }
  },

  /**
   * Busca usuario por ID
   */
  async getById(id: string): Promise<User | null> {
    try {
      const response = await api.get<User>(`/v1/users/${id}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar usuario:', error);
      return null;
    }
  },

  /**
   * Cria novo usuario
   */
  async create(data: CreateUserDto): Promise<User> {
    const response = await api.post<User>('/v1/users', data);
    return response.data;
  },

  /**
   * Atualiza usuario
   */
  async update(id: string, data: UpdateUserDto): Promise<User> {
    const response = await api.patch<User>(`/v1/users/${id}`, data);
    return response.data;
  },

  /**
   * Remove usuario
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/v1/users/${id}`);
  },

  /**
   * Atualiza status do usuario
   */
  async updateStatus(id: string, status: UserStatus): Promise<User> {
    const response = await api.patch<User>(`/v1/users/${id}/status`, { status });
    return response.data;
  },

  /**
   * Reseta senha do usuario (admin)
   */
  async resetPassword(id: string, newPassword: string): Promise<void> {
    await api.post(`/v1/users/${id}/reset-password`, { password: newPassword });
  },
};
