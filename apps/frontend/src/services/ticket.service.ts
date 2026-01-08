import { api } from './api';
import { Ticket, CreateTicketDto, UpdateTicketDto } from '@/types/ticket.types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  errors: any[];
}

export const ticketService = {
  async getAll(params?: {
    status?: string;
    priority?: string;
    service_desk_id?: string;
    assignee_id?: string;
    page?: number;
    perPage?: number;
  }): Promise<{ tickets: Ticket[]; total: number }> {
    const response = await api.get<ApiResponse<{ data: Ticket[]; meta: { total: number } }>>(
      '/v1/tickets',
      { params }
    );
    return {
      tickets: response.data.data.data,
      total: response.data.data.meta.total,
    };
  },

  async getById(id: string): Promise<Ticket> {
    console.log('Buscando ticket com ID:', id);
    console.log('URL completa:', `/v1/tickets/${id}`);
    try {
      const response = await api.get<ApiResponse<Ticket>>(`/v1/tickets/${id}`);
      console.log('Resposta da API:', response);
      return response.data.data;
    } catch (error: any) {
      console.error('Erro ao buscar ticket:', error);
      console.error('Response:', error.response);
      console.error('Request:', error.request);
      console.error('Config:', error.config);
      throw error;
    }
  },

  async create(data: CreateTicketDto): Promise<Ticket> {
    const response = await api.post<ApiResponse<Ticket>>('/v1/tickets', data);
    return response.data.data;
  },

  async update(id: string, data: UpdateTicketDto): Promise<Ticket> {
    const response = await api.patch<ApiResponse<Ticket>>(`/v1/tickets/${id}`, data);
    return response.data.data;
  },

  async assign(id: string, assigneeId: string): Promise<Ticket> {
    const response = await api.patch<ApiResponse<Ticket>>(
      `/v1/tickets/${id}/assign/${assigneeId}`
    );
    return response.data.data;
  },

  async unassign(id: string): Promise<Ticket> {
    const response = await api.patch<ApiResponse<Ticket>>(`/v1/tickets/${id}/unassign`);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/v1/tickets/${id}`);
  },

  async getByClient(clientId: string): Promise<Ticket[]> {
    const response = await api.get<ApiResponse<Ticket[]>>(`/v1/tickets/client/${clientId}`);
    return response.data.data;
  },
};
