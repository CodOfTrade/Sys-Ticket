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

  // ========================================
  // MÉTODOS DE FOLLOWERS (SEGUIDORES)
  // ========================================

  async getFollowers(ticketId: string): Promise<TicketFollower[]> {
    const response = await api.get<ApiResponse<TicketFollower[]>>(`/v1/tickets/${ticketId}/followers`);
    return response.data.data;
  },

  async addFollower(ticketId: string, data: { user_id?: string; email?: string; name?: string }): Promise<TicketFollower> {
    const response = await api.post<ApiResponse<TicketFollower>>(`/v1/tickets/${ticketId}/followers`, data);
    return response.data.data;
  },

  async removeFollower(ticketId: string, followerId: string): Promise<void> {
    await api.delete(`/v1/tickets/${ticketId}/followers/${followerId}`);
  },

  // ========================================
  // MÉTODOS DE FATURAMENTO / OS SIGE
  // ========================================

  async getBillingSummary(ticketId: string): Promise<BillingSummary> {
    const response = await api.get<ApiResponse<BillingSummary>>(`/v1/tickets/${ticketId}/billing-summary`);
    return response.data.data;
  },

  async createServiceOrder(ticketId: string): Promise<CreateServiceOrderResponse> {
    const response = await api.post<ApiResponse<CreateServiceOrderResponse>>(`/v1/tickets/${ticketId}/create-service-order`);
    return response.data.data;
  },
};

// Interface para resumo de faturamento
export interface BillingSummary {
  appointments: {
    n1: { hours: number; amount: number };
    n2: { hours: number; amount: number };
    contract: { hours: number; amount: number };
    total: { hours: number; amount: number };
  };
  valuations: {
    count: number;
    amount: number;
  };
  grandTotal: number;
}

// Interface para resposta de criação de OS
export interface CreateServiceOrderResponse {
  sigeOrderId: number;
  totalValue: number;
}

// Interface para Follower
export interface TicketFollower {
  id: string;
  ticket_id: string;
  user_id?: string;
  email?: string;
  name?: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  notification_preferences?: {
    on_status_change?: boolean;
    on_new_comment?: boolean;
    on_assigned?: boolean;
    on_closed?: boolean;
    on_reopened?: boolean;
  };
  created_at: string;
}
