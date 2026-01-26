import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Not, IsNull } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Resource } from '../entities/resource.entity';

@Injectable()
export class OfflineDetectionTask {
  private readonly logger = new Logger(OfflineDetectionTask.name);
  private readonly OFFLINE_TIMEOUT_MINUTES = 10;
  private readonly COMMAND_TIMEOUT_MINUTES = 60; // 1 hora

  constructor(
    @InjectRepository(Resource)
    private readonly resourceRepository: Repository<Resource>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkOfflineAgents() {
    await this.markOfflineAgents();
    await this.cleanStaleCommands();
  }

  /**
   * Marca agentes como offline se nao recebeu heartbeat
   */
  private async markOfflineAgents() {
    const cutoffTime = new Date(Date.now() - this.OFFLINE_TIMEOUT_MINUTES * 60 * 1000);

    this.logger.debug(`Verificando agentes offline (timeout: ${this.OFFLINE_TIMEOUT_MINUTES} min)`);

    // Buscar agentes que estao online mas sem heartbeat recente
    const staleAgents = await this.resourceRepository.find({
      where: {
        is_online: true,
        agent_last_heartbeat: LessThan(cutoffTime),
      },
      select: ['id', 'name', 'agent_id', 'agent_last_heartbeat'],
    });

    if (staleAgents.length === 0) {
      this.logger.debug('Nenhum agente stale encontrado');
      return;
    }

    this.logger.log(`Marcando ${staleAgents.length} agente(s) como offline`);

    // Marcar todos como offline
    const ids = staleAgents.map(a => a.id);
    await this.resourceRepository
      .createQueryBuilder()
      .update(Resource)
      .set({ is_online: false })
      .whereInIds(ids)
      .execute();

    // Emitir eventos para cada agente que ficou offline
    for (const agent of staleAgents) {
      this.logger.log(`Agente offline: ${agent.name} (${agent.agent_id})`);

      this.eventEmitter.emit('resource.status-changed', {
        resourceId: agent.id,
        isOnline: false,
        reason: 'heartbeat_timeout',
      });
    }
  }

  /**
   * Limpa comandos pendentes antigos (> 1 hora)
   */
  private async cleanStaleCommands() {
    const cutoffTime = new Date(Date.now() - this.COMMAND_TIMEOUT_MINUTES * 60 * 1000);

    // Buscar recursos com comandos pendentes antigos
    const staleCommands = await this.resourceRepository.find({
      where: {
        pending_command: Not(IsNull()),
        pending_command_at: LessThan(cutoffTime),
      },
      select: ['id', 'name', 'pending_command', 'pending_command_at'],
    });

    if (staleCommands.length === 0) {
      return;
    }

    this.logger.log(`Limpando ${staleCommands.length} comando(s) pendente(s) antigo(s)`);

    // Limpar comandos antigos
    const ids = staleCommands.map(r => r.id);
    await this.resourceRepository
      .createQueryBuilder()
      .update(Resource)
      .set({
        pending_command: undefined as any,
        pending_command_at: undefined as any,
      })
      .whereInIds(ids)
      .execute();

    for (const resource of staleCommands) {
      this.logger.log(`Comando '${resource.pending_command}' expirado em ${resource.name}`);
    }
  }
}
