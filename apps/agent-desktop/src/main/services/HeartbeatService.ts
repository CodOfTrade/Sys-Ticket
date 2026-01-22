import { ApiService } from './ApiService';
import { SystemInfoService } from './SystemInfo';
import { HeartbeatData } from '@shared/types';

export class HeartbeatService {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly INTERVAL_MS = 5 * 60 * 1000; // 5 minutos
  private apiService: ApiService;
  private systemInfoService: SystemInfoService;
  private agentId: string;

  constructor(
    apiService: ApiService,
    systemInfoService: SystemInfoService,
    agentId: string
  ) {
    this.apiService = apiService;
    this.systemInfoService = systemInfoService;
    this.agentId = agentId;
  }

  /**
   * Inicia o serviço de heartbeat
   */
  start() {
    if (this.intervalId) {
      console.log('Heartbeat já está rodando');
      return;
    }

    console.log('Iniciando heartbeat service (intervalo: 5 minutos)');

    // Enviar primeiro heartbeat imediatamente
    this.sendHeartbeat();

    // Configurar intervalo para enviar heartbeats
    this.intervalId = setInterval(() => {
      this.sendHeartbeat();
    }, this.INTERVAL_MS);
  }

  /**
   * Para o serviço de heartbeat
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Heartbeat service parado');
    }
  }

  /**
   * Envia heartbeat para o backend
   */
  private async sendHeartbeat() {
    try {
      const quickStatus = await this.systemInfoService.collectQuickStatus();

      const heartbeatData: HeartbeatData = {
        agentId: this.agentId,
        timestamp: new Date().toISOString(),
        quickStatus,
      };

      await this.apiService.sendHeartbeat(heartbeatData);
      console.log('Heartbeat enviado com sucesso:', new Date().toISOString());
    } catch (error: any) {
      console.error('Erro ao enviar heartbeat:', error.message || error);
      // Não parar o serviço, apenas logar o erro
    }
  }

  /**
   * Verifica se o heartbeat está rodando
   */
  isRunning(): boolean {
    return this.intervalId !== null;
  }

  /**
   * Força envio de heartbeat imediato
   */
  async sendImmediately() {
    await this.sendHeartbeat();
  }
}
