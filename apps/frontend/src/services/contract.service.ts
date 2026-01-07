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
    const response = await api.get<ApiResponse<Contract[]>>(`/v1/clients/${clientId}/contracts`);
    return response.data.data;
  },
};
