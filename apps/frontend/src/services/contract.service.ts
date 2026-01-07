import { api } from './api';

export interface Contract {
  id: string;
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

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export const contractService = {
  async getByClient(clientId: string): Promise<Contract[]> {
    try {
      const response = await api.get<ApiResponse<Contract[]>>(`/v1/clients/${clientId}/contracts`);

      // Validar resposta
      if (!response.data || !response.data.data) {
        console.error('Resposta inválida da API de contratos:', response.data);
        return [];
      }

      return Array.isArray(response.data.data) ? response.data.data : [];
    } catch (error) {
      console.error('Erro ao buscar contratos:', error);
      return [];
    }
  },
};
