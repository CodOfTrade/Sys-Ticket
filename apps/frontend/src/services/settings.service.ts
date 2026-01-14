import { api } from './api';

export interface LogosData {
  logo_report: string | null;
  logo_system: string | null;
  logo_login: string | null;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const settingsService = {
  /**
   * Buscar todas as logos
   */
  async getLogos(): Promise<LogosData> {
    const response = await api.get<ApiResponse<LogosData>>('/v1/settings/logos');
    return response.data.data;
  },

  /**
   * Upload de logo
   * @param type - Tipo da logo: 'report', 'system' ou 'login'
   * @param file - Arquivo PNG
   */
  async uploadLogo(type: 'report' | 'system' | 'login', file: File): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);

    await api.post(`/v1/settings/logos/${type}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * Remover logo
   * @param type - Tipo da logo: 'report', 'system' ou 'login'
   */
  async removeLogo(type: 'report' | 'system' | 'login'): Promise<void> {
    await api.delete(`/v1/settings/logos/${type}`);
  },
};
