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
  async findByClient(clientId: string): Promise<Requester[]> {
    const response = await api.get(`/v1/clients/contacts`, {
      params: { client_id: clientId },
    });
    return response.data.data;
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
