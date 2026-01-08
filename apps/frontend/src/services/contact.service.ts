import { api } from './api';

export interface Contact {
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

export interface CreateContactDto {
  client_id: string;
  name: string;
  email?: string;
  phone?: string;
  department?: string;
  position?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  errors?: any[];
}

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const contactService = {
  async getAll(clientId?: string, page = 1, limit = 20): Promise<{ contacts: Contact[]; total: number }> {
    try {
      const params: any = { page, limit };
      if (clientId) {
        params.client_id = clientId;
      }
      const response = await api.get<PaginatedResponse<Contact>>('/v1/clients/contacts', { params });
      return {
        contacts: response.data.data || [],
        total: response.data.meta?.total || 0,
      };
    } catch (error) {
      console.error('Erro ao buscar contatos:', error);
      return { contacts: [], total: 0 };
    }
  },

  async getById(id: string): Promise<Contact | null> {
    try {
      const response = await api.get<ApiResponse<Contact>>(`/v1/clients/contacts/${id}`);
      return response.data.data;
    } catch (error) {
      console.error('Erro ao buscar contato:', error);
      return null;
    }
  },

  async create(contactData: CreateContactDto): Promise<Contact | null> {
    try {
      const response = await api.post<ApiResponse<Contact>>('/v1/clients/contacts', contactData);
      return response.data.data;
    } catch (error) {
      console.error('Erro ao criar contato:', error);
      throw error;
    }
  },

  async update(id: string, contactData: Partial<CreateContactDto>): Promise<Contact | null> {
    try {
      const response = await api.patch<ApiResponse<Contact>>(`/v1/clients/contacts/${id}`, contactData);
      return response.data.data;
    } catch (error) {
      console.error('Erro ao atualizar contato:', error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await api.delete(`/v1/clients/contacts/${id}`);
    } catch (error) {
      console.error('Erro ao deletar contato:', error);
      throw error;
    }
  },
};
