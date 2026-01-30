import api from './api';
import {
  SlaConfig,
  UpdateSlaConfigDto,
  SlaTicketStats,
  SlaConfigResponse,
  SlaMetricsResponse,
} from '../types/sla.types';

class SlaService {
  /**
   * Obter configuração de SLA de uma mesa de serviço
   */
  async getConfig(serviceDeskId: string): Promise<SlaConfigResponse> {
    const response = await api.get(`/v1/sla/service-desks/${serviceDeskId}/config`);
    return response.data;
  }

  /**
   * Atualizar configuração de SLA de uma mesa de serviço
   */
  async updateConfig(
    serviceDeskId: string,
    data: UpdateSlaConfigDto,
  ): Promise<{ message: string; service_desk_id: string; sla_config: SlaConfig }> {
    const response = await api.patch(
      `/v1/sla/service-desks/${serviceDeskId}/config`,
      data,
    );
    return response.data;
  }

  /**
   * Obter estatísticas de SLA de um ticket
   */
  async getTicketStats(ticketId: string): Promise<SlaTicketStats> {
    const response = await api.get(`/v1/sla/tickets/${ticketId}/stats`);
    return response.data;
  }

  /**
   * Obter métricas de SLA de uma mesa de serviço
   */
  async getMetrics(
    serviceDeskId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<SlaMetricsResponse> {
    const params: any = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;

    const response = await api.get(`/v1/sla/service-desks/${serviceDeskId}/metrics`, {
      params,
    });
    return response.data;
  }
}

export const slaService = new SlaService();
export default slaService;
