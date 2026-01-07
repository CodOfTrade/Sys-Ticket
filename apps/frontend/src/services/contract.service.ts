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
      console.log('Buscando contratos para cliente:', clientId);
      const response = await api.get<ApiResponse<Contract[]>>(`/v1/clients/contract/client/${clientId}`);
      console.log('Resposta da API de contratos:', response.data);

      // Validar resposta
      if (!response.data || !response.data.data) {
        console.error('Resposta inválida da API de contratos:', response.data);
        return [];
      }

      const contracts = Array.isArray(response.data.data) ? response.data.data : [];
      console.log('Contratos encontrados:', contracts.length);
      return contracts;
    } catch (error) {
      console.error('Erro ao buscar contratos:', error);
      return [];
    }
  },
};
