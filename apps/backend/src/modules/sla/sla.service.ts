import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Not, In } from 'typeorm';
import { Ticket, TicketPriority, TicketStatus } from '../tickets/entities/ticket.entity';
import { ServiceDesk } from '../service-desks/entities/service-desk.entity';
import { Queue } from '../queues/entities/queue.entity';
import {
  SlaConfig,
  SlaCalculationResult,
  SlaTicketStats,
  SlaMetrics,
  BusinessHoursConfig,
} from './interfaces/sla-config.interface';

@Injectable()
export class SlaService {
  private readonly logger = new Logger(SlaService.name);

  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(ServiceDesk)
    private readonly serviceDeskRepository: Repository<ServiceDesk>,
    @InjectRepository(Queue)
    private readonly queueRepository: Repository<Queue>,
  ) {}

  /**
   * Obtém a configuração de SLA para um ticket
   * Hierarquia: Fila > Service Desk > Padrão
   */
  async getSlaConfigForTicket(
    queueId: string | null,
    serviceDeskId: string,
  ): Promise<SlaConfig> {
    // 1. Se tem fila, verificar se fila tem SLA próprio
    if (queueId) {
      const queue = await this.queueRepository.findOne({
        where: { id: queueId },
      });

      if (queue?.sla_config?.priorities) {
        this.logger.debug(`Usando SLA da fila ${queue.name}`);
        // Buscar business_hours do service_desk (horário comercial é global)
        const serviceDesk = await this.serviceDeskRepository.findOne({
          where: { id: serviceDeskId },
        });
        return {
          priorities: queue.sla_config.priorities,
          business_hours: serviceDesk?.sla_config?.business_hours || this.getDefaultBusinessHours(),
        };
      }
    }

    // 2. Fallback: usar SLA do service_desk
    const serviceDesk = await this.serviceDeskRepository.findOne({
      where: { id: serviceDeskId },
    });

    if (serviceDesk?.sla_config) {
      this.logger.debug(`Usando SLA do service_desk ${serviceDesk.name}`);
      return serviceDesk.sla_config;
    }

    // 3. Fallback final: valores padrão
    this.logger.debug('Usando SLA padrão do sistema');
    return this.getDefaultSlaConfig();
  }

  /**
   * Retorna horário comercial padrão
   */
  private getDefaultBusinessHours(): BusinessHoursConfig {
    return {
      timezone: 'America/Sao_Paulo',
      schedules: [
        { day_of_week: 1, periods: [{ start: '08:00', end: '12:00' }, { start: '14:00', end: '18:00' }] },
        { day_of_week: 2, periods: [{ start: '08:00', end: '12:00' }, { start: '14:00', end: '18:00' }] },
        { day_of_week: 3, periods: [{ start: '08:00', end: '12:00' }, { start: '14:00', end: '18:00' }] },
        { day_of_week: 4, periods: [{ start: '08:00', end: '12:00' }, { start: '14:00', end: '18:00' }] },
        { day_of_week: 5, periods: [{ start: '08:00', end: '12:00' }, { start: '14:00', end: '18:00' }] },
      ],
    };
  }

  /**
   * Retorna configuração de SLA padrão
   */
  private getDefaultSlaConfig(): SlaConfig {
    return {
      priorities: {
        low: { first_response: 480, resolution: 2880 },
        medium: { first_response: 240, resolution: 1440 },
        high: { first_response: 120, resolution: 480 },
        urgent: { first_response: 60, resolution: 240 },
      },
      business_hours: this.getDefaultBusinessHours(),
    };
  }

  /**
   * Calcula os prazos de SLA para um ticket
   */
  calculateSlaDueDates(
    createdAt: Date,
    priority: TicketPriority,
    slaConfig: SlaConfig,
  ): SlaCalculationResult {
    if (!slaConfig || !slaConfig.priorities) {
      this.logger.warn('SLA config não encontrada, retornando valores vazios');
      return {
        first_response_due: null,
        resolution_due: null,
        first_response_minutes: 0,
        resolution_minutes: 0,
      };
    }

    const priorityConfig = slaConfig.priorities[priority];

    this.logger.debug(
      `Calculando SLA - Prioridade: ${priority}, ` +
      `Config encontrada: ${JSON.stringify(priorityConfig)}, ` +
      `Todas prioridades disponíveis: ${Object.keys(slaConfig.priorities).join(', ')}`
    );

    if (!priorityConfig) {
      this.logger.warn(`Configuração de SLA não encontrada para prioridade: ${priority}`);
      return {
        first_response_due: null,
        resolution_due: null,
        first_response_minutes: 0,
        resolution_minutes: 0,
      };
    }

    // Calcular data de vencimento para primeira resposta
    const firstResponseDue = this.addBusinessMinutes(
      createdAt,
      priorityConfig.first_response,
      slaConfig.business_hours,
    );

    // Calcular data de vencimento para resolução
    const resolutionDue = this.addBusinessMinutes(
      createdAt,
      priorityConfig.resolution,
      slaConfig.business_hours,
    );

    return {
      first_response_due: firstResponseDue,
      resolution_due: resolutionDue,
      first_response_minutes: priorityConfig.first_response,
      resolution_minutes: priorityConfig.resolution,
    };
  }

  /**
   * Adiciona minutos úteis (business minutes) a uma data
   * Considera apenas horário comercial e dias úteis
   * Suporta múltiplos períodos por dia (ex: 08-12 + 14-18)
   */
  addBusinessMinutes(
    startDate: Date,
    minutesToAdd: number,
    businessHours: BusinessHoursConfig,
    workingDays?: number[], // Deprecated: working_days agora vem dos schedules
  ): Date {
    if (minutesToAdd <= 0) {
      return startDate;
    }

    let currentDate = new Date(startDate);
    let remainingMinutes = minutesToAdd;

    // Limite de segurança: máximo 10000 iterações
    let iterations = 0;
    const MAX_ITERATIONS = 10000;

    // Função auxiliar para obter minutos do dia
    const getMinutesOfDay = (date: Date): number => {
      return date.getHours() * 60 + date.getMinutes();
    };

    // Loop principal: consumir minutos até remainingMinutes = 0
    while (remainingMinutes > 0) {
      iterations++;
      if (iterations > MAX_ITERATIONS) {
        this.logger.error(
          `addBusinessMinutes excedeu ${MAX_ITERATIONS} iterações. Abortando.`,
        );
        break;
      }

      const dayOfWeek = currentDate.getDay();

      // Buscar schedule do dia atual
      const daySchedule = businessHours.schedules?.find((s) => s.day_of_week === dayOfWeek);

      // Se não há expediente neste dia, avançar para o próximo
      if (!daySchedule || !daySchedule.periods || daySchedule.periods.length === 0) {
        currentDate.setDate(currentDate.getDate() + 1);
        currentDate.setHours(0, 0, 0, 0);
        continue;
      }

      const currentMinutesOfDay = getMinutesOfDay(currentDate);
      let consumed = false;

      // Processar cada período do dia
      for (const period of daySchedule.periods) {
        const [startHour, startMinute] = period.start.split(':').map(Number);
        const [endHour, endMinute] = period.end.split(':').map(Number);

        const periodStartMinutes = startHour * 60 + startMinute;
        const periodEndMinutes = endHour * 60 + endMinute;

        // Se estamos antes do período, pular para o início dele
        if (currentMinutesOfDay < periodStartMinutes) {
          currentDate.setHours(startHour, startMinute, 0, 0);
          const updatedMinutes = getMinutesOfDay(currentDate);

          // Calcular minutos disponíveis neste período
          const availableMinutes = periodEndMinutes - updatedMinutes;

          if (remainingMinutes <= availableMinutes) {
            // Cabe neste período
            currentDate.setMinutes(currentDate.getMinutes() + remainingMinutes);
            remainingMinutes = 0;
            consumed = true;
            break;
          } else {
            // Consumir todo o período e continuar para o próximo
            remainingMinutes -= availableMinutes;
            currentDate.setHours(endHour, endMinute, 0, 0);
            consumed = true;
            continue; // Tentar próximo período do mesmo dia
          }
        }

        // Se estamos dentro do período
        if (currentMinutesOfDay >= periodStartMinutes && currentMinutesOfDay < periodEndMinutes) {
          const availableMinutes = periodEndMinutes - currentMinutesOfDay;

          if (remainingMinutes <= availableMinutes) {
            // Cabe neste período
            currentDate.setMinutes(currentDate.getMinutes() + remainingMinutes);
            remainingMinutes = 0;
            consumed = true;
            break;
          } else {
            // Consumir resto do período
            remainingMinutes -= availableMinutes;
            currentDate.setHours(endHour, endMinute, 0, 0);
            consumed = true;
            continue; // Tentar próximo período do mesmo dia
          }
        }

        // Se estamos após este período, continuar para o próximo período
      }

      // Se não conseguiu consumir minutos em nenhum período, avançar para o próximo dia
      if (!consumed && remainingMinutes > 0) {
        currentDate.setDate(currentDate.getDate() + 1);
        currentDate.setHours(0, 0, 0, 0);
      }
    }

    return currentDate;
  }

  /**
   * Calcula o tempo restante até o vencimento do SLA em minutos
   * Retorna valor negativo se já venceu
   */
  calculateRemainingMinutes(dueDate: Date | null, now: Date = new Date()): number | null {
    if (!dueDate) {
      return null;
    }

    const diffMs = dueDate.getTime() - now.getTime();
    return Math.floor(diffMs / (1000 * 60));
  }

  /**
   * Verifica se um ticket violou o SLA
   */
  async checkSlaViolation(ticketId: string): Promise<boolean> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
      relations: ['service_desk'],
    });

    if (!ticket) {
      return false;
    }

    const now = new Date();
    let violated = false;

    // Verificar violação de primeira resposta
    if (
      ticket.sla_first_response_due &&
      !ticket.first_response_at &&
      now > ticket.sla_first_response_due
    ) {
      violated = true;
    }

    // Verificar violação de resolução
    if (
      ticket.sla_resolution_due &&
      !ticket.resolved_at &&
      now > ticket.sla_resolution_due &&
      ticket.status !== TicketStatus.RESOLVED &&
      ticket.status !== TicketStatus.CANCELLED &&
      ticket.status !== TicketStatus.APPROVED
    ) {
      violated = true;
    }

    // Atualizar flag de violação se necessário
    if (violated !== ticket.sla_violated) {
      await this.ticketRepository.update(ticketId, { sla_violated: violated });
    }

    return violated;
  }

  /**
   * Marca primeira resposta de um ticket
   */
  async markFirstResponse(ticketId: string): Promise<void> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
    });

    if (!ticket || ticket.first_response_at) {
      return; // Já tem primeira resposta
    }

    await this.ticketRepository.update(ticketId, {
      first_response_at: new Date(),
    });

    this.logger.log(`Primeira resposta marcada para ticket ${ticket.ticket_number}`);
  }

  /**
   * Marca resolução de um ticket
   */
  async markResolved(ticketId: string): Promise<void> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
    });

    if (!ticket || ticket.resolved_at) {
      return; // Já resolvido
    }

    await this.ticketRepository.update(ticketId, {
      resolved_at: new Date(),
    });

    this.logger.log(`Resolução marcada para ticket ${ticket.ticket_number}`);
  }

  /**
   * Obtém estatísticas de SLA de um ticket
   */
  async getTicketSlaStats(ticketId: string): Promise<SlaTicketStats | null> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
    });

    if (!ticket) {
      return null;
    }

    const now = new Date();

    return {
      ticket_id: ticket.id,
      ticket_number: ticket.ticket_number,
      priority: ticket.priority,
      created_at: ticket.created_at,
      first_response_due: ticket.sla_first_response_due,
      resolution_due: ticket.sla_resolution_due,
      first_response_at: ticket.first_response_at,
      resolved_at: ticket.resolved_at,
      sla_violated: ticket.sla_violated,
      first_response_remaining_minutes: this.calculateRemainingMinutes(
        ticket.sla_first_response_due,
        now,
      ),
      resolution_remaining_minutes: this.calculateRemainingMinutes(
        ticket.sla_resolution_due,
        now,
      ),
      first_response_breach:
        !!ticket.sla_first_response_due &&
        !ticket.first_response_at &&
        now > ticket.sla_first_response_due,
      resolution_breach:
        !!ticket.sla_resolution_due &&
        !ticket.resolved_at &&
        now > ticket.sla_resolution_due,
    };
  }

  /**
   * Obtém métricas agregadas de SLA para uma mesa de serviço
   */
  async getServiceDeskSlaMetrics(
    serviceDeskId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<SlaMetrics> {
    const where: any = {
      service_desk_id: serviceDeskId,
    };

    if (startDate) {
      where.created_at = { $gte: startDate };
    }
    if (endDate) {
      where.created_at = { ...where.created_at, $lte: endDate };
    }

    const tickets = await this.ticketRepository.find({
      where,
    });

    const ticketsWithSla = tickets.filter(
      (t) => t.sla_first_response_due || t.sla_resolution_due,
    );

    const firstResponseBreached = ticketsWithSla.filter(
      (t) =>
        t.sla_first_response_due &&
        t.first_response_at &&
        t.first_response_at > t.sla_first_response_due,
    ).length;

    const resolutionBreached = ticketsWithSla.filter(
      (t) =>
        t.sla_resolution_due && t.resolved_at && t.resolved_at > t.sla_resolution_due,
    ).length;

    // Calcular médias de tempo
    const firstResponseTimes = ticketsWithSla
      .filter((t) => t.first_response_at && t.created_at)
      .map((t) => {
        const diff = t.first_response_at.getTime() - t.created_at.getTime();
        return Math.floor(diff / (1000 * 60));
      });

    const resolutionTimes = ticketsWithSla
      .filter((t) => t.resolved_at && t.created_at)
      .map((t) => {
        const diff = t.resolved_at.getTime() - t.created_at.getTime();
        return Math.floor(diff / (1000 * 60));
      });

    const avgFirstResponse =
      firstResponseTimes.length > 0
        ? firstResponseTimes.reduce((a, b) => a + b, 0) / firstResponseTimes.length
        : 0;

    const avgResolution =
      resolutionTimes.length > 0
        ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
        : 0;

    // Métricas por prioridade
    const byPriority: any = {};
    for (const priority of Object.values(TicketPriority)) {
      const priorityTickets = ticketsWithSla.filter((t) => t.priority === priority);
      const priorityBreached = priorityTickets.filter(
        (t) =>
          (t.sla_first_response_due &&
            t.first_response_at &&
            t.first_response_at > t.sla_first_response_due) ||
          (t.sla_resolution_due &&
            t.resolved_at &&
            t.resolved_at > t.sla_resolution_due),
      ).length;

      byPriority[priority] = {
        total: priorityTickets.length,
        breached: priorityBreached,
        compliance_rate:
          priorityTickets.length > 0
            ? ((priorityTickets.length - priorityBreached) / priorityTickets.length) * 100
            : 100,
      };
    }

    return {
      total_tickets: tickets.length,
      tickets_with_sla: ticketsWithSla.length,
      first_response_breached: firstResponseBreached,
      resolution_breached: resolutionBreached,
      first_response_compliance_rate:
        ticketsWithSla.length > 0
          ? ((ticketsWithSla.length - firstResponseBreached) / ticketsWithSla.length) * 100
          : 100,
      resolution_compliance_rate:
        ticketsWithSla.length > 0
          ? ((ticketsWithSla.length - resolutionBreached) / ticketsWithSla.length) * 100
          : 100,
      average_first_response_time_minutes: avgFirstResponse,
      average_resolution_time_minutes: avgResolution,
      by_priority: byPriority,
    };
  }

  /**
   * Recalcula o SLA de todos os tickets abertos de uma fila
   * Chamado quando a configuração de SLA da fila é alterada
   */
  async recalculateSlaForQueue(queueId: string): Promise<number> {
    this.logger.log(`Recalculando SLA para todos os tickets abertos da fila ${queueId}`);

    try {
      // Buscar a fila para obter service_desk_id
      const queue = await this.queueRepository.findOne({
        where: { id: queueId },
        relations: ['service_desk'],
      });

      if (!queue) {
        this.logger.warn(`Fila ${queueId} não encontrada para recálculo de SLA`);
        return 0;
      }

      // Buscar todos os tickets abertos (não cancelados) desta fila
      const openTickets = await this.ticketRepository.find({
        where: {
          queue_id: queueId,
          status: Not(TicketStatus.CANCELLED),
        },
      });

      if (openTickets.length === 0) {
        this.logger.debug(`Nenhum ticket aberto encontrado na fila ${queue.name}`);
        return 0;
      }

      this.logger.log(`Encontrados ${openTickets.length} tickets abertos para recalcular SLA`);

      // Obter configuração de SLA da fila
      const slaConfig = await this.getSlaConfigForTicket(
        queueId,
        queue.service_desk.id,
      );

      let recalculatedCount = 0;

      // Recalcular SLA para cada ticket
      for (const ticket of openTickets) {
        try {
          const slaResult = this.calculateSlaDueDates(
            ticket.created_at,
            ticket.priority,
            slaConfig,
          );

          // Atualizar campos de SLA do ticket (apenas se não forem null)
          if (slaResult.first_response_due || slaResult.resolution_due) {
            await this.ticketRepository.update(ticket.id, {
              sla_first_response_due: slaResult.first_response_due || undefined,
              sla_resolution_due: slaResult.resolution_due || undefined,
            });

            recalculatedCount++;

            this.logger.debug(
              `SLA recalculado para ticket ${ticket.ticket_number}: ` +
              `Primeira resposta: ${slaResult.first_response_due}, ` +
              `Resolução: ${slaResult.resolution_due}`,
            );
          } else {
            this.logger.warn(
              `SLA não pôde ser calculado para ticket ${ticket.ticket_number} (valores null)`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Erro ao recalcular SLA do ticket ${ticket.ticket_number}: ${error.message}`,
          );
        }
      }

      this.logger.log(
        `Recálculo de SLA concluído: ${recalculatedCount} de ${openTickets.length} tickets atualizados`,
      );

      return recalculatedCount;
    } catch (error) {
      this.logger.error(`Erro ao recalcular SLA da fila ${queueId}: ${error.message}`);
      throw error;
    }
  }
}
