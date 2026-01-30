import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, IsNull, Not, In, MoreThan } from 'typeorm';
import { Ticket, TicketStatus } from '../tickets/entities/ticket.entity';
import { SlaService } from './sla.service';
import { NotificationsService } from '../notifications/services/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';

@Injectable()
export class SlaScheduler {
  private readonly logger = new Logger(SlaScheduler.name);

  constructor(
    private readonly slaService: SlaService,
    private readonly notificationsService: NotificationsService,
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
  ) {}

  /**
   * Cron job: Verificar violações de SLA a cada 5 minutos
   * Atualiza a flag sla_violated dos tickets que violaram e cria notificações
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkSlaViolations() {
    this.logger.debug('Iniciando verificação de violações de SLA...');

    try {
      const now = new Date();

      // Buscar tickets ativos com SLA definido que ainda não estão marcados como violados
      const tickets = await this.ticketRepository.find({
        where: [
          {
            sla_first_response_due: Not(IsNull()),
            first_response_at: IsNull(),
            status: Not(
              In([TicketStatus.RESOLVED, TicketStatus.CANCELLED, TicketStatus.APPROVED]),
            ),
          },
          {
            sla_resolution_due: Not(IsNull()),
            resolved_at: IsNull(),
            status: Not(
              In([TicketStatus.RESOLVED, TicketStatus.CANCELLED, TicketStatus.APPROVED]),
            ),
          },
        ],
        relations: ['assigned_to'],
      });

      let violatedCount = 0;

      for (const ticket of tickets) {
        const previouslyViolated = ticket.sla_violated;
        const wasViolated = await this.slaService.checkSlaViolation(ticket.id);

        // Se é uma nova violação, criar notificação
        if (wasViolated && !previouslyViolated) {
          violatedCount++;
          this.logger.warn(
            `SLA violado para ticket ${ticket.ticket_number} (${ticket.id})`,
          );

          // Determinar qual SLA violou
          const firstResponseViolated =
            ticket.sla_first_response_due &&
            !ticket.first_response_at &&
            new Date(ticket.sla_first_response_due) < now;

          const resolutionViolated =
            ticket.sla_resolution_due &&
            !ticket.resolved_at &&
            new Date(ticket.sla_resolution_due) < now;

          // Criar notificação de violação
          if (firstResponseViolated) {
            await this.createSlaNotification(
              ticket,
              NotificationType.SLA_FIRST_RESPONSE_BREACH,
              'SLA Violado: Primeira Resposta',
              `O ticket #${ticket.ticket_number} violou o SLA de primeira resposta.`,
            );
          }

          if (resolutionViolated) {
            await this.createSlaNotification(
              ticket,
              NotificationType.SLA_RESOLUTION_BREACH,
              'SLA Violado: Resolução',
              `O ticket #${ticket.ticket_number} violou o SLA de resolução.`,
            );
          }
        }
      }

      if (violatedCount > 0) {
        this.logger.log(
          `✅ Verificação concluída. ${violatedCount} novos tickets com SLA violado.`,
        );
      } else {
        this.logger.debug('✅ Verificação concluída. Nenhuma nova violação detectada.');
      }
    } catch (error) {
      this.logger.error('Erro ao verificar violações de SLA:', error);
    }
  }

  /**
   * Cron job: Alertar sobre tickets próximos ao vencimento (warning)
   * Executado a cada 10 minutos
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async alertUpcomingSlaBreaches() {
    this.logger.debug('Verificando tickets próximos ao vencimento de SLA...');

    try {
      const now = new Date();
      const warningThreshold = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutos

      // Buscar tickets com primeira resposta vencendo em breve (entre agora e 30 min)
      const ticketsFirstResponse = await this.ticketRepository.find({
        where: {
          sla_first_response_due: LessThan(warningThreshold),
          first_response_at: IsNull(),
          sla_violated: false,
          status: Not(
            In([TicketStatus.RESOLVED, TicketStatus.CANCELLED, TicketStatus.APPROVED]),
          ),
        },
        relations: ['assigned_to', 'service_desk'],
      });

      // Filtrar apenas os que ainda não venceram (para não duplicar com breach)
      const ticketsFirstResponseWarning = ticketsFirstResponse.filter(
        (t) => new Date(t.sla_first_response_due) > now,
      );

      // Buscar tickets com resolução vencendo em breve
      const ticketsResolution = await this.ticketRepository.find({
        where: {
          sla_resolution_due: LessThan(warningThreshold),
          resolved_at: IsNull(),
          sla_violated: false,
          status: Not(
            In([TicketStatus.RESOLVED, TicketStatus.CANCELLED, TicketStatus.APPROVED]),
          ),
        },
        relations: ['assigned_to', 'service_desk'],
      });

      // Filtrar apenas os que ainda não venceram
      const ticketsResolutionWarning = ticketsResolution.filter(
        (t) => new Date(t.sla_resolution_due) > now,
      );

      // Criar notificações de warning para primeira resposta
      for (const ticket of ticketsFirstResponseWarning) {
        const remaining = this.slaService.calculateRemainingMinutes(
          ticket.sla_first_response_due,
          now,
        );
        this.logger.warn(
          `⚠️  Ticket ${ticket.ticket_number}: ${remaining} minutos restantes (Primeira resposta)`,
        );

        await this.createSlaNotification(
          ticket,
          NotificationType.SLA_FIRST_RESPONSE_WARNING,
          'SLA Próximo de Vencer: Primeira Resposta',
          `O ticket #${ticket.ticket_number} vencerá o SLA de primeira resposta em ${remaining} minutos.`,
        );
      }

      // Criar notificações de warning para resolução
      for (const ticket of ticketsResolutionWarning) {
        const remaining = this.slaService.calculateRemainingMinutes(
          ticket.sla_resolution_due,
          now,
        );
        this.logger.warn(
          `⚠️  Ticket ${ticket.ticket_number}: ${remaining} minutos restantes (Resolução)`,
        );

        await this.createSlaNotification(
          ticket,
          NotificationType.SLA_RESOLUTION_WARNING,
          'SLA Próximo de Vencer: Resolução',
          `O ticket #${ticket.ticket_number} vencerá o SLA de resolução em ${remaining} minutos.`,
        );
      }

      this.logger.debug('✅ Verificação de alertas concluída.');
    } catch (error) {
      this.logger.error('Erro ao verificar alertas de SLA:', error);
    }
  }

  /**
   * Cron job: Recalcular SLAs violados (cleanup)
   * Executado diariamente à meia-noite
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async recalculateSlaViolations() {
    this.logger.log('Recalculando violações de SLA (cleanup diário)...');

    try {
      // Buscar todos os tickets marcados como violados
      const violatedTickets = await this.ticketRepository.find({
        where: { sla_violated: true },
      });

      let fixedCount = 0;

      for (const ticket of violatedTickets) {
        // Se o ticket foi resolvido ou teve primeira resposta, verificar se ainda está violado
        const isStillViolated = await this.slaService.checkSlaViolation(ticket.id);

        if (!isStillViolated) {
          fixedCount++;
        }
      }

      this.logger.log(
        `✅ Recalculo concluído. ${fixedCount} tickets tiveram status de violação corrigido.`,
      );
    } catch (error) {
      this.logger.error('Erro ao recalcular violações de SLA:', error);
    }
  }

  /**
   * Cria notificação de SLA para o responsável do ticket (ou todos os técnicos se não atribuído)
   */
  private async createSlaNotification(
    ticket: Ticket,
    type: NotificationType,
    title: string,
    message: string,
  ): Promise<void> {
    try {
      // Se o ticket tem responsável atribuído, notificar ele
      if (ticket.assigned_to_id) {
        await this.notificationsService.create({
          type,
          title,
          message,
          target_user_id: ticket.assigned_to_id,
          reference_id: ticket.id,
          reference_type: 'ticket',
        });
      } else {
        // Se não tem responsável, usar o sistema de alertas padrão
        // que notifica admins/managers conforme configuração
        await this.notificationsService.createAlertNotifications(
          type,
          ticket.id,
          'ticket',
          title,
          message,
          ticket.client_id,
        );
      }
    } catch (error) {
      this.logger.error(
        `Erro ao criar notificação de SLA para ticket ${ticket.ticket_number}:`,
        error,
      );
    }
  }
}
