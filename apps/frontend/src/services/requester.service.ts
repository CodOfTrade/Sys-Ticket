import { api } from './api';

export interface Requester {
  id: string;
  client_id: string;
  name: string;
  email?: string;
  phone?: string;
  department?: string;
  position?: string;
  is_primary: boolean;
  can_request_tickets: boolean;
  receive_notifications: boolean;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateRequesterDto {
  client_id: string;
  name: string;
  email?: string;
  phone?: string;
  department?: string;
  position?: string;
}

export const requesterService = {
  async findByClient(clientId: string, page = 1, limit = 20): Promise<{ data: Requester[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    try {
      const response = await api.get(`/v1/clients/contacts`, {
        params: { client_id: clientId, page, limit },
      });

      // Validar resposta
      if (!response.data || !response.data.data) {
        return { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
      }

      return {
        data: Array.isArray(response.data.data) ? response.data.data : [],
        meta: response.data.meta || { total: 0, page: 1, limit: 20, totalPages: 0 }
      };
    } catch (error) {
      console.error('Erro ao buscar solicitantes:', error);
      return { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
    }
  },

  async create(data: CreateRequesterDto): Promise<Requester> {
    const response = await api.post('/v1/clients/contacts', data);
    return response.data.data;
  },

  async findOne(id: string): Promise<Requester> {
    const response = await api.get(`/v1/clients/contacts/${id}`);
    return response.data.data;
  },
};
