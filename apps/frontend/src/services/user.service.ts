import { api } from './api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_url?: string;
  is_active: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  errors?: any[];
}

export const userService = {
  async getAllTechnicians(): Promise<User[]> {
    try {
      const response = await api.get<ApiResponse<User[]>>('/v1/users/technicians');
      return response.data.data || [];
    } catch (error) {
      console.error('Erro ao buscar técnicos:', error);
      return [];
    }
  },

  async getAll(): Promise<User[]> {
    try {
      const response = await api.get<ApiResponse<User[]>>('/v1/users');
      return response.data.data || [];
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      return [];
    }
  },
};
