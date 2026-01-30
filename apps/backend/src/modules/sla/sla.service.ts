import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Not, In } from 'typeorm';
import { Ticket, TicketPriority, TicketStatus } from '../tickets/entities/ticket.entity';
import { ServiceDesk } from '../service-desks/entities/service-desk.entity';
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
  ) {}

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
      slaConfig.working_days,
    );

    // Calcular data de vencimento para resolução
    const resolutionDue = this.addBusinessMinutes(
      createdAt,
      priorityConfig.resolution,
      slaConfig.business_hours,
      slaConfig.working_days,
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
   */
  addBusinessMinutes(
    startDate: Date,
    minutesToAdd: number,
    businessHours: BusinessHoursConfig,
    workingDays: number[],
  ): Date {
    if (minutesToAdd <= 0) {
      return startDate;
    }

    let currentDate = new Date(startDate);
    let remainingMinutes = minutesToAdd;

    // Parse business hours
    const [startHour, startMinute] = businessHours.start.split(':').map(Number);
    const [endHour, endMinute] = businessHours.end.split(':').map(Number);

    const businessStartMinutes = startHour * 60 + startMinute;
    const businessEndMinutes = endHour * 60 + endMinute;
    const dailyBusinessMinutes = businessEndMinutes - businessStartMinutes;

    // Função auxiliar para verificar se é dia útil
    const isWorkingDay = (date: Date): boolean => {
      return workingDays.includes(date.getDay());
    };

    // Função auxiliar para obter minutos do dia
    const getMinutesOfDay = (date: Date): number => {
      return date.getHours() * 60 + date.getMinutes();
    };

    // Avançar para o próximo dia útil se necessário
    while (!isWorkingDay(currentDate)) {
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(startHour, startMinute, 0, 0);
    }

    const currentMinutes = getMinutesOfDay(currentDate);

    // Se estamos antes do horário comercial, avançar para o início
    if (currentMinutes < businessStartMinutes) {
      currentDate.setHours(startHour, startMinute, 0, 0);
    }
    // Se estamos depois do horário comercial, avançar para o próximo dia útil
    else if (currentMinutes >= businessEndMinutes) {
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(startHour, startMinute, 0, 0);
      // Avançar para o próximo dia útil
      while (!isWorkingDay(currentDate)) {
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    // Loop principal: consumir minutos até remainingMinutes = 0
    while (remainingMinutes > 0) {
      // Garantir que estamos em um dia útil
      if (!isWorkingDay(currentDate)) {
        currentDate.setDate(currentDate.getDate() + 1);
        currentDate.setHours(startHour, startMinute, 0, 0);
        continue;
      }

      const currentMinutesOfDay = getMinutesOfDay(currentDate);

      // Se estamos fora do horário comercial, avançar para o início do próximo dia útil
      if (
        currentMinutesOfDay < businessStartMinutes ||
        currentMinutesOfDay >= businessEndMinutes
      ) {
        currentDate.setDate(currentDate.getDate() + 1);
        currentDate.setHours(startHour, startMinute, 0, 0);
        continue;
      }

      // Calcular quantos minutos restam no dia útil atual
      const minutesLeftInDay = businessEndMinutes - currentMinutesOfDay;

      if (remainingMinutes <= minutesLeftInDay) {
        // Temos minutos suficientes neste dia
        currentDate.setMinutes(currentDate.getMinutes() + remainingMinutes);
        remainingMinutes = 0;
      } else {
        // Consumir o resto do dia e avançar para o próximo dia útil
        remainingMinutes -= minutesLeftInDay;
        currentDate.setDate(currentDate.getDate() + 1);
        currentDate.setHours(startHour, startMinute, 0, 0);
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
}
