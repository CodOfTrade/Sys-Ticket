import { api } from './api';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar_url?: string;
  };
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await api.post<{ success: boolean; data: LoginResponse }>('/v1/auth/login', credentials);
    return response.data.data;
  },

  async getProfile() {
    const response = await api.get('/v1/auth/profile');
    return response.data.data;
  },

  async logout() {
    // Pode implementar logout no backend se necessário
    return Promise.resolve();
  },
};
