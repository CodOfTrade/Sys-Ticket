import Store from 'electron-store';
import { AgentConfig } from '@shared/types';

export class StorageService {
  private store: Store;

  constructor() {
    this.store = new Store({
      name: 'sys-ticket-agent-config',
      encryptionKey: 'sys-ticket-agent-encryption-key-2024',
    });
  }

  /**
   * Salva configuração do agente
   */
  saveConfig(config: AgentConfig): void {
    this.store.set('config', config);
    console.log('Configuração salva com sucesso');
  }

  /**
   * Carrega configuração do agente
   */
  loadConfig(): AgentConfig {
    const defaultConfig: AgentConfig = {
      agentId: null,
      agentToken: null,
      resourceId: null,
      resourceCode: null,
      clientId: null,
      clientName: null,
      contractId: null,
      apiUrl: 'https://172.31.255.26/api',
      configured: false,
    };

    const config = this.store.get('config', defaultConfig) as AgentConfig;
    return config;
  }

  /**
   * Verifica se o agente está configurado
   */
  isConfigured(): boolean {
    const config = this.loadConfig();
    return config.configured && !!config.agentId && !!config.agentToken;
  }

  /**
   * Limpa configuração (reset)
   */
  clearConfig(): void {
    this.store.clear();
    console.log('Configuração limpa');
  }

  /**
   * Atualiza URL da API
   */
  updateApiUrl(apiUrl: string): void {
    const config = this.loadConfig();
    config.apiUrl = apiUrl;
    this.saveConfig(config);
  }

  /**
   * Obtém URL da API
   */
  getApiUrl(): string {
    const config = this.loadConfig();
    return config.apiUrl;
  }
}
