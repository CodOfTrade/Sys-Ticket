import axios, { AxiosInstance } from 'axios';
import https from 'https';
import {
  RegistrationData,
  RegistrationResponse,
  HeartbeatData,
  ApiError,
} from '@shared/types';

export class ApiService {
  private api: AxiosInstance;
  private agentToken: string | null = null;

  constructor(apiUrl: string) {
    this.api = axios.create({
      baseURL: apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
      // Allow self-signed certificates (for development)
      httpsAgent: new https.Agent({
        rejectUnauthorized: false,
      }),
    });

    // Interceptor para adicionar token em todas as requisições
    this.api.interceptors.request.use((config) => {
      if (this.agentToken) {
        config.headers['X-Agent-Token'] = this.agentToken;
      }
      return config;
    });

    // Interceptor para tratar erros
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        const apiError: ApiError = {
          message: error.response?.data?.message || error.message || 'Erro desconhecido',
          statusCode: error.response?.status || 500,
        };
        throw apiError;
      }
    );
  }

  setAgentToken(token: string) {
    this.agentToken = token;
  }

  /**
   * Registra o agente no backend
   */
  async registerAgent(data: RegistrationData): Promise<RegistrationResponse> {
    const response = await this.api.post<{
      success: boolean;
      data: RegistrationResponse;
    }>('/v1/agent/register', data);

    if (response.data.success && response.data.data.agentToken) {
      this.setAgentToken(response.data.data.agentToken);
    }

    return response.data.data;
  }

  /**
   * Envia heartbeat para o backend
   */
  async sendHeartbeat(data: HeartbeatData): Promise<void> {
    await this.api.post('/v1/agent/heartbeat', data);
  }

  /**
   * Atualiza inventário completo do sistema
   */
  async updateInventory(agentId: string, systemInfo: any): Promise<void> {
    await this.api.post('/v1/agent/update-inventory', {
      agentId,
      systemInfo,
    });
  }

  /**
   * Busca lista de clientes (para tela de setup)
   */
  async getClients(): Promise<any[]> {
    const response = await this.api.get('/v1/clients');
    return response.data.data || [];
  }

  /**
   * Busca contratos de um cliente
   */
  async getClientContracts(clientId: string): Promise<any[]> {
    const response = await this.api.get(`/v1/clients/${clientId}/contracts`);
    return response.data.data || [];
  }

  /**
   * Cria ticket via agente
   */
  async createTicket(ticketData: {
    agentId: string;
    title: string;
    description: string;
    priority: string;
    category?: string;
    hasScreenshot: boolean;
    screenshotBase64?: string;
    systemInfo: any;
  }): Promise<{
    ticketId: string;
    ticketNumber: string;
    chatWebSocketUrl: string;
  }> {
    const response = await this.api.post('/v1/agent/tickets', ticketData);
    return response.data.data;
  }

  /**
   * Busca tickets do agente
   */
  async getTickets(agentId: string): Promise<any[]> {
    const response = await this.api.get(`/v1/agent/tickets/${agentId}`);
    return response.data.data || [];
  }

  /**
   * Testa conexão com o servidor
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing connection to:', this.api.defaults.baseURL);
      const response = await this.api.get('/v1/health');
      console.log('Connection test successful:', response.status);
      return true;
    } catch (error: any) {
      console.error('Connection test failed:', error.message);
      console.error('Error details:', {
        code: error.code,
        response: error.response?.status,
        message: error.message,
      });
      return false;
    }
  }
}
