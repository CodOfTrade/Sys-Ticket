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

export interface Client {
  id: string;
  nome: string;
  razao_social?: string;
  nome_fantasia?: string;
  cpf_cnpj?: string;
  tipo_pessoa?: string;
  email?: string;
  telefone?: string;
  celular?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  ativo?: boolean;
}

export interface ClientsResponse {
  data: Client[];
  meta: {
    current_page: number;
    per_page: number;
    total: number;
  };
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  errors?: any[];
}

export const clientService = {
  async findAll(page = 1, perPage = 50): Promise<ClientsResponse> {
    const response = await api.get<{ success: boolean; data: ClientsResponse }>('/v1/clients', {
      params: { page, per_page: perPage },
    });
    return response.data.data;
  },

  async searchByName(name: string, page = 1, perPage = 20): Promise<ClientsResponse> {
    const response = await api.get<{ success: boolean; data: ClientsResponse }>('/v1/clients/search', {
      params: { name, page, per_page: perPage },
    });
    return response.data.data;
  },

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
