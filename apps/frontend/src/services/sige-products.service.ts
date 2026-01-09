import { api } from './api';

export interface SigeProduct {
  id: string;
  nome: string;
  descricao?: string;
  codigo?: string;
  preco_venda?: number;
  preco_custo?: number;
  unidade?: string;
  tipo?: string;
  ativo?: boolean;
}

export interface SigeProductsResponse {
  data: SigeProduct[];
  meta: {
    current_page: number;
    per_page: number;
    total: number;
  };
}

export const sigeProductsService = {
  /**
   * Busca produtos no banco local (sincronizado do SIGE Cloud)
   */
  async searchProducts(query: string): Promise<SigeProduct[]> {
    const response = await api.get('/products/search', {
      params: { q: query },
    });
    return response.data;
  },

  /**
   * Sincroniza produtos do SIGE Cloud para o banco local
   */
  async syncProducts(): Promise<{ success: boolean; message: string; synced: number }> {
    const response = await api.post('/products/sync');
    return response.data;
  },
};
