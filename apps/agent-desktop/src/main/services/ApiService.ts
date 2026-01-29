import axios, { AxiosInstance } from 'axios';
import https from 'https';
import {
  RegistrationData,
  RegistrationResponse,
  HeartbeatData,
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
        // Log detalhado para debug
        console.error('API Error Details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message,
          code: error.code,
        });

        // Extrair mensagem do erro do backend
        let errorMessage = '';

        if (error.response?.data) {
          const data = error.response.data;
          // NestJS pode retornar message como string ou array
          if (typeof data.message === 'string') {
            errorMessage = data.message;
          } else if (Array.isArray(data.message)) {
            errorMessage = data.message.join(', ');
          } else if (data.error) {
            errorMessage = data.error;
          }
        }

        // Se não conseguiu extrair do backend, usar mensagem do axios
        if (!errorMessage && error.message) {
          errorMessage = error.message;
        }

        // Último fallback com informação útil
        if (!errorMessage) {
          errorMessage = `Erro HTTP ${error.response?.status || 'desconhecido'}`;
        }

        console.error('Extracted error message:', errorMessage);

        // IMPORTANTE: Lançar instância de Error nativa, não objeto simples
        // Isso garante que o IPC do Electron preserve a mensagem corretamente
        const err = new Error(errorMessage);
        (err as any).statusCode = error.response?.status || 500;
        throw err;
      }
    );
  }

  setAgentToken(token: string) {
    this.agentToken = token;
  }

  /**
   * Valida código de ativação
   */
  async validateActivationCode(code: string): Promise<{ valid: boolean; message: string }> {
    try {
      const response = await this.api.post<{
        success: boolean;
        valid: boolean;
        message: string;
      }>('/v1/agent/activation/validate', { code });
      return {
        valid: response.data.valid,
        message: response.data.message,
      };
    } catch (error: any) {
      return {
        valid: false,
        message: error.message || 'Erro ao validar código',
      };
    }
  }

  /**
   * Registra o agente no backend
   */
  async registerAgent(data: RegistrationData, activationCode: string): Promise<RegistrationResponse> {
    const response = await this.api.post<{
      success: boolean;
      data: RegistrationResponse;
    }>('/v1/agent/register', data, {
      headers: {
        'X-Activation-Code': activationCode,
      },
    });

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
    // Solicitar todos os clientes (incluindo inativos) para Setup
    const response = await this.api.get('/v1/clients?perPage=5000&includeInactive=true');
    // Backend retorna { data: { data: [...], meta: {...} } }
    const result = response.data.data;
    if (Array.isArray(result)) {
      return result;
    }
    // Se data.data é outro objeto com data dentro (estrutura aninhada)
    if (result && Array.isArray(result.data)) {
      return result.data;
    }
    return [];
  }

  /**
   * Busca clientes por nome via API search endpoint
   */
  async searchClients(searchTerm: string): Promise<any[]> {
    if (!searchTerm || searchTerm.length < 2) {
      return [];
    }

    const response = await this.api.get('/v1/clients/search', {
      params: {
        name: searchTerm,
        page: 1,
        per_page: 10
      }
    });

    // Backend retorna { data: { data: [...], meta: {...} } }
    const result = response.data.data;
    if (result && Array.isArray(result.data)) {
      return result.data;
    }
    return [];
  }

  /**
   * Busca contratos de um cliente
   */
  async getClientContracts(clientId: string): Promise<any[]> {
    const response = await this.api.get(`/v1/clients/contract/client/${clientId}`);
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

  /**
   * Busca comando pendente para o agente
   */
  async getPendingCommand(agentId: string): Promise<{
    command: string | null;
    commandAt: string | null;
  }> {
    const response = await this.api.get(`/v1/agent/commands/${agentId}`);
    return response.data.data || { command: null, commandAt: null };
  }

  /**
   * Confirma execução de comando
   */
  async confirmCommand(
    agentId: string,
    command: string,
    success: boolean,
    message?: string,
  ): Promise<void> {
    await this.api.post(`/v1/agent/commands/${agentId}/confirm`, {
      command,
      success,
      message,
    });
  }
}
