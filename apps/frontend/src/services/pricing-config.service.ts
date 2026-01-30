import api from './api';
import {
  PricingConfig,
  CreatePricingConfigDto,
  UpdatePricingConfigDto,
} from '../types/ticket-details.types';

/**
 * Serviço para gerenciar classificações de atendimento (Pricing Configs)
 */
class PricingConfigService {
  /**
   * Listar todas as classificações de atendimento
   */
  async getAll(serviceDeskId?: string): Promise<PricingConfig[]> {
    const params = serviceDeskId ? { service_desk_id: serviceDeskId } : {};
    const response = await api.get('/v1/pricing-configs', { params });
    return response.data.data || response.data;
  }

  /**
   * Buscar classificação específica por ID
   */
  async getById(id: string): Promise<PricingConfig> {
    const response = await api.get(`/v1/pricing-configs/${id}`);
    return response.data.data || response.data;
  }

  /**
   * Criar nova classificação de atendimento
   */
  async create(data: CreatePricingConfigDto): Promise<PricingConfig> {
    const response = await api.post('/v1/pricing-configs', data);
    return response.data.data || response.data;
  }

  /**
   * Atualizar classificação de atendimento
   */
  async update(id: string, data: UpdatePricingConfigDto): Promise<PricingConfig> {
    const response = await api.patch(`/v1/pricing-configs/${id}`, data);
    return response.data.data || response.data;
  }

  /**
   * Deletar classificação de atendimento
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/v1/pricing-configs/${id}`);
  }
}

export const pricingConfigService = new PricingConfigService();
export default pricingConfigService;
