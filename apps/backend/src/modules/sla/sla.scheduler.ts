import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, IsNull, Not, In } from 'typeorm';
import { Ticket, TicketStatus } from '../tickets/entities/ticket.entity';
import { SlaService } from './sla.service';

@Injectable()
export class SlaScheduler {
  private readonly logger = new Logger(SlaScheduler.name);

  constructor(
    private readonly slaService: SlaService,
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
  ) {}

  /**
   * Cron job: Verificar violações de SLA a cada 5 minutos
   * Atualiza a flag sla_violated dos tickets que violaram
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkSlaViolations() {
    this.logger.debug('Iniciando verificação de violações de SLA...');

    try {
      const now = new Date();

      // Buscar tickets ativos com SLA definido
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
      });

      let violatedCount = 0;

      for (const ticket of tickets) {
        const wasViolated = await this.slaService.checkSlaViolation(ticket.id);
        if (wasViolated && !ticket.sla_violated) {
          violatedCount++;
          this.logger.warn(
            `SLA violado para ticket ${ticket.ticket_number} (${ticket.id})`,
          );
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

      // Buscar tickets com primeira resposta vencendo em breve
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

      if (ticketsFirstResponse.length > 0) {
        this.logger.warn(
          `⚠️  ${ticketsFirstResponse.length} ticket(s) próximos de violar SLA de primeira resposta`,
        );
        ticketsFirstResponse.forEach((ticket) => {
          const remaining = this.slaService.calculateRemainingMinutes(
            ticket.sla_first_response_due,
            now,
          );
          this.logger.warn(
            `   - Ticket ${ticket.ticket_number}: ${remaining} minutos restantes (Primeira resposta)`,
          );
        });
      }

      if (ticketsResolution.length > 0) {
        this.logger.warn(
          `⚠️  ${ticketsResolution.length} ticket(s) próximos de violar SLA de resolução`,
        );
        ticketsResolution.forEach((ticket) => {
          const remaining = this.slaService.calculateRemainingMinutes(
            ticket.sla_resolution_due,
            now,
          );
          this.logger.warn(
            `   - Ticket ${ticket.ticket_number}: ${remaining} minutos restantes (Resolução)`,
          );
        });
      }

      // TODO: Enviar notificações (email, webhook, etc)
      // Para implementar futuramente: integrar com o sistema de notificações

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
}
