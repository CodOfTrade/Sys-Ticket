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
   * Busca produtos no SIGE Cloud
   */
  async searchProducts(query: string, page = 1, perPage = 20): Promise<SigeProductsResponse> {
    const response = await api.get('/v1/clients/products/search', {
      params: { query, page, per_page: perPage },
    });
    return response.data;
  },

  /**
   * Busca produto por ID no SIGE Cloud
   */
  async getProduct(productId: string): Promise<SigeProduct> {
    const response = await api.get(`/v1/clients/products/${productId}`);
    return response.data;
  },
};
