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
   * Busca produtos no SIGE Cloud (endpoint já existente em clients)
   */
  async searchProducts(query: string, page = 1, perPage = 20): Promise<SigeProductsResponse> {
    const response = await api.get('/v1/clients/products/search', {
      params: { query, page, per_page: perPage },
    });
    // API retorna { success: true, data: { data: [...], meta: {...} } }
    return response.data.data || response.data;
  },

  /**
   * Busca produto por ID no SIGE Cloud
   */
  async getProduct(productId: string): Promise<SigeProduct> {
    const response = await api.get(`/v1/clients/products/${productId}`);
    return response.data;
  },

  /**
   * Sincroniza todos os dados do SIGE Cloud (clientes, contratos, produtos)
   */
  async syncSigeData(): Promise<{ success: boolean; message: string }> {
    const response = await api.post('/v1/clients/sync');
    return response.data;
  },
};
