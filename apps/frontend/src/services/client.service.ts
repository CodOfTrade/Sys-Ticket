import { api } from './api';

export interface ClientContact {
  id: string;
  client_id: string;
  name: string;
  email?: string;
  phone?: string;
  department?: string;
  position?: string;
  is_primary: boolean;
  can_request_tickets: boolean;
  is_active: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  errors?: any[];
}

export const clientService = {
  async getContacts(clientId?: string): Promise<ClientContact[]> {
    const params = clientId ? { client_id: clientId } : {};
    const response = await api.get<ApiResponse<ClientContact[]>>(
      '/v1/clients/contacts',
      { params }
    );
    return response.data.data;
  },

  async createContact(data: {
    client_id: string;
    name: string;
    email?: string;
    phone?: string;
    department?: string;
    position?: string;
  }): Promise<ClientContact> {
    const response = await api.post<ApiResponse<ClientContact>>(
      '/v1/clients/contacts',
      data
    );
    return response.data.data;
  },
};
