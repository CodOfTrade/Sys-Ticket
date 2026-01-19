import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';
import { TicketApproval, ApprovalStatus } from '../entities/ticket-approval.entity';
import { Ticket, TicketStatus } from '../entities/ticket.entity';
import { ClientContact } from '../../clients/entities/client-contact.entity';
import { TicketComment, CommentType } from '../entities/ticket-comment.entity';
import {
  RequestApprovalDto,
  SubmitApprovalDto,
  UpdateApproverDto,
  PublicApprovalDetailsDto,
} from '../dto/ticket-approval.dto';
import { EmailService } from '../../email/email.service';
import { TicketHistoryService } from './ticket-history.service';
import { HistoryAction } from '../entities/ticket-history.entity';

interface TokenValidationResult {
  valid: boolean;
  reason?: string;
  approval?: TicketApproval;
}

@Injectable()
export class TicketApprovalsService {
  private readonly logger = new Logger(TicketApprovalsService.name);

  constructor(
    @InjectRepository(TicketApproval)
    private approvalRepository: Repository<TicketApproval>,
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    @InjectRepository(ClientContact)
    private contactRepository: Repository<ClientContact>,
    @InjectRepository(TicketComment)
    private commentRepository: Repository<TicketComment>,
    private emailService: EmailService,
    private ticketHistoryService: TicketHistoryService,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Solicitar aprovação para um ticket
   */
  async requestApproval(userId: string, dto: RequestApprovalDto): Promise<TicketApproval> {
    const ticketId = dto.ticket_id;
    if (!ticketId) {
      throw new BadRequestException('ID do ticket é obrigatório');
    }

    // Buscar ticket
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
      relations: ['created_by', 'service_desk'],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket não encontrado');
    }

    // Verificar se já existe aprovação pendente
    const existingApproval = await this.getPendingApproval(ticketId);
    if (existingApproval) {
      throw new BadRequestException('Já existe uma solicitação de aprovação pendente para este ticket');
    }

    // Resolver aprovador
    let approverEmail: string;
    let approverName: string | null = null;
    let contactId: string | null = null;

    if (dto.contact_id) {
      // Buscar contato
      const contact = await this.contactRepository.findOne({
        where: { id: dto.contact_id },
      });

      if (!contact) {
        throw new NotFoundException('Contato não encontrado');
      }

      approverEmail = contact.email;
      approverName = contact.name;
      contactId = contact.id;
    } else if (dto.approver_email) {
      approverEmail = dto.approver_email;
      approverName = dto.approver_name || null;
    } else {
      throw new BadRequestException('É necessário informar um contato ou email do aprovador');
    }

    // Gerar token seguro
    const { token, hash } = this.generateSecureToken();
    const expiresAt = this.calculateExpiration();

    // Criar registro de aprovação
    const approval = this.approvalRepository.create({
      ticket_id: ticketId,
      contact_id: contactId,
      approver_email: approverEmail,
      approver_name: approverName,
      approval_token: token,
      token_hash: hash,
      expires_at: expiresAt,
      requested_by_id: userId,
      custom_message: dto.message || null,
      status: ApprovalStatus.PENDING,
    });

    const savedApproval = await this.approvalRepository.save(approval);

    // Mudar status do ticket para WAITING_APPROVAL se não estiver
    if (ticket.status !== TicketStatus.WAITING_APPROVAL) {
      ticket.status = TicketStatus.WAITING_APPROVAL;
      await this.ticketRepository.save(ticket);
    }

    // Enviar email
    await this.sendApprovalEmail(savedApproval, ticket, dto.message);

    // Registrar no histórico
    try {
      await this.ticketHistoryService.recordHistory({
        ticket_id: ticketId,
        user_id: userId,
        action: HistoryAction.APPROVAL_REQUESTED,
        description: `Aprovação solicitada para ${approverName || approverEmail}`,
      });
    } catch (error) {
      this.logger.warn(`Erro ao registrar solicitação de aprovação no histórico: ${error.message}`);
    }

    // Emitir evento
    this.eventEmitter.emit('ticket.approval.requested', {
      ticketId,
      approvalId: savedApproval.id,
      approverEmail,
    });

    this.logger.log(`Aprovação solicitada para ticket ${ticket.ticket_number} - Email: ${approverEmail}`);

    return savedApproval;
  }

  /**
   * Validar token de aprovação
   */
  async validateToken(token: string): Promise<TokenValidationResult> {
    const approval = await this.approvalRepository.findOne({
      where: { approval_token: token },
      relations: ['ticket', 'ticket.service_desk', 'ticket.created_by', 'requested_by'],
    });

    if (!approval) {
      return { valid: false, reason: 'Token inválido ou não encontrado' };
    }

    // Verificar hash
    const expectedHash = crypto.createHash('sha256').update(token).digest('hex');
    if (approval.token_hash !== expectedHash) {
      return { valid: false, reason: 'Token inválido' };
    }

    // Verificar expiração
    if (new Date() > approval.expires_at) {
      // Marcar como expirado se ainda estiver pendente
      if (approval.status === ApprovalStatus.PENDING) {
        approval.status = ApprovalStatus.EXPIRED;
        await this.approvalRepository.save(approval);
      }
      return { valid: false, reason: 'Token expirado', approval };
    }

    // Verificar se já foi respondido
    if (approval.status !== ApprovalStatus.PENDING) {
      return {
        valid: false,
        reason: `Esta solicitação já foi ${this.translateStatus(approval.status)}`,
        approval,
      };
    }

    return { valid: true, approval };
  }

  /**
   * Submeter decisão de aprovação (endpoint público)
   */
  async submitApproval(
    token: string,
    dto: SubmitApprovalDto,
    clientIp: string,
  ): Promise<TicketApproval> {
    const validation = await this.validateToken(token);

    if (!validation.valid) {
      throw new BadRequestException(validation.reason);
    }

    const approval = validation.approval!;
    const ticket = approval.ticket;

    // Atualizar aprovação
    approval.status = dto.decision === 'approved' ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED;
    approval.comment = dto.comment || null;
    approval.responded_at = new Date();
    approval.response_ip = clientIp;

    await this.approvalRepository.save(approval);

    // Atualizar status do ticket
    if (dto.decision === 'approved') {
      ticket.status = TicketStatus.IN_PROGRESS;
      await this.ticketRepository.save(ticket);
    }
    // Se rejeitado, mantém em WAITING_APPROVAL para nova tentativa ou ação manual

    // Adicionar comentário ao ticket se houver
    if (dto.comment) {
      await this.addApprovalComment(approval, dto.decision);
    }

    // Registrar no histórico
    try {
      const action = dto.decision === 'approved'
        ? HistoryAction.APPROVAL_APPROVED
        : HistoryAction.APPROVAL_REJECTED;

      const statusText = dto.decision === 'approved' ? 'aprovado' : 'rejeitado';

      await this.ticketHistoryService.recordHistory({
        ticket_id: ticket.id,
        user_id: null, // Aprovador externo
        action,
        description: `Ticket ${statusText} por ${approval.approver_name || approval.approver_email}`,
      });
    } catch (error) {
      this.logger.warn(`Erro ao registrar resposta de aprovação no histórico: ${error.message}`);
    }

    // Emitir evento
    this.eventEmitter.emit('ticket.approval.responded', {
      ticketId: ticket.id,
      approvalId: approval.id,
      approved: dto.decision === 'approved',
      approverEmail: approval.approver_email,
    });

    // Enviar notificação ao solicitante
    await this.notifyRequester(approval, dto.decision);

    this.logger.log(
      `Aprovação ${dto.decision} para ticket ${ticket.ticket_number} por ${approval.approver_email}`,
    );

    return approval;
  }

  /**
   * Buscar aprovação pendente de um ticket
   */
  async getPendingApproval(ticketId: string): Promise<TicketApproval | null> {
    return this.approvalRepository.findOne({
      where: {
        ticket_id: ticketId,
        status: ApprovalStatus.PENDING,
      },
      relations: ['contact', 'requested_by'],
    });
  }

  /**
   * Buscar aprovação por ID
   */
  async findOne(id: string): Promise<TicketApproval> {
    const approval = await this.approvalRepository.findOne({
      where: { id },
      relations: ['ticket', 'contact', 'requested_by'],
    });

    if (!approval) {
      throw new NotFoundException('Solicitação de aprovação não encontrada');
    }

    return approval;
  }

  /**
   * Cancelar aprovação pendente
   */
  async cancelApproval(approvalId: string, userId: string): Promise<TicketApproval> {
    const approval = await this.findOne(approvalId);

    if (approval.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException('Apenas aprovações pendentes podem ser canceladas');
    }

    approval.status = ApprovalStatus.CANCELLED;
    await this.approvalRepository.save(approval);

    // Registrar no histórico
    try {
      await this.ticketHistoryService.recordHistory({
        ticket_id: approval.ticket_id,
        user_id: userId,
        action: HistoryAction.APPROVAL_CANCELLED,
        description: `Solicitação de aprovação cancelada`,
      });
    } catch (error) {
      this.logger.warn(`Erro ao registrar cancelamento no histórico: ${error.message}`);
    }

    this.logger.log(`Aprovação ${approvalId} cancelada`);

    return approval;
  }

  /**
   * Reenviar email de aprovação
   */
  async resendApprovalEmail(approvalId: string, userId: string): Promise<boolean> {
    const approval = await this.approvalRepository.findOne({
      where: { id: approvalId },
      relations: ['ticket', 'ticket.service_desk', 'ticket.created_by'],
    });

    if (!approval) {
      throw new NotFoundException('Solicitação de aprovação não encontrada');
    }

    if (approval.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException('Apenas aprovações pendentes podem ter email reenviado');
    }

    // Verificar se não expirou
    if (new Date() > approval.expires_at) {
      throw new BadRequestException('Esta solicitação expirou. Crie uma nova solicitação.');
    }

    // Enviar email
    const sent = await this.sendApprovalEmail(approval, approval.ticket, approval.custom_message);

    if (sent) {
      approval.email_retry_count += 1;
      approval.email_sent_at = new Date();
      await this.approvalRepository.save(approval);

      this.logger.log(`Email de aprovação reenviado para ${approval.approver_email}`);
    }

    return sent;
  }

  /**
   * Atualizar email do aprovador (gera novo token)
   */
  async updateApproverEmail(
    approvalId: string,
    userId: string,
    dto: UpdateApproverDto,
  ): Promise<TicketApproval> {
    const approval = await this.approvalRepository.findOne({
      where: { id: approvalId },
      relations: ['ticket', 'ticket.service_desk', 'ticket.created_by'],
    });

    if (!approval) {
      throw new NotFoundException('Solicitação de aprovação não encontrada');
    }

    if (approval.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException('Apenas aprovações pendentes podem ser editadas');
    }

    // Gerar novo token (invalida o anterior)
    const { token, hash } = this.generateSecureToken();
    const expiresAt = this.calculateExpiration();

    // Atualizar dados
    approval.approver_email = dto.approver_email;
    approval.approver_name = dto.approver_name || null;
    approval.contact_id = null; // Remove vínculo com contato se tinha
    approval.approval_token = token;
    approval.token_hash = hash;
    approval.expires_at = expiresAt;

    await this.approvalRepository.save(approval);

    // Enviar email para novo endereço
    await this.sendApprovalEmail(approval, approval.ticket, approval.custom_message);

    this.logger.log(`Email de aprovador atualizado para ${dto.approver_email}`);

    return approval;
  }

  /**
   * Histórico de aprovações de um ticket
   */
  async getApprovalHistory(ticketId: string): Promise<TicketApproval[]> {
    return this.approvalRepository.find({
      where: { ticket_id: ticketId },
      relations: ['contact', 'requested_by'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Obter detalhes públicos da aprovação (para página de aprovação)
   */
  async getPublicApprovalDetails(token: string): Promise<PublicApprovalDetailsDto> {
    const approval = await this.approvalRepository.findOne({
      where: { approval_token: token },
      relations: ['ticket', 'ticket.service_desk', 'ticket.created_by'],
    });

    if (!approval) {
      throw new NotFoundException('Solicitação não encontrada');
    }

    const ticket = approval.ticket;
    const isExpired = new Date() > approval.expires_at;
    const isAlreadyResponded = approval.status !== ApprovalStatus.PENDING;

    return {
      ticket_number: ticket.ticket_number,
      ticket_title: ticket.title,
      ticket_description: ticket.description || '',
      client_name: ticket.client_name || 'Não informado',
      requester_name: ticket.requester_name || ticket.created_by?.name || 'Não informado',
      approver_name: approval.approver_name,
      status: approval.status,
      expires_at: approval.expires_at,
      is_expired: isExpired,
      is_already_responded: isAlreadyResponded,
    };
  }

  // ==================== MÉTODOS PRIVADOS ====================

  /**
   * Gerar token seguro
   */
  private generateSecureToken(): { token: string; hash: string } {
    const uuid = crypto.randomUUID();
    const randomPart = crypto.randomBytes(16).toString('hex');
    const token = `${uuid}-${randomPart}`;
    const hash = crypto.createHash('sha256').update(token).digest('hex');

    return { token, hash };
  }

  /**
   * Calcular data de expiração (48 horas)
   */
  private calculateExpiration(): Date {
    const hours = 48;
    return new Date(Date.now() + hours * 60 * 60 * 1000);
  }

  /**
   * Traduzir status
   */
  private translateStatus(status: ApprovalStatus): string {
    const translations: Record<ApprovalStatus, string> = {
      [ApprovalStatus.PENDING]: 'pendente',
      [ApprovalStatus.APPROVED]: 'aprovada',
      [ApprovalStatus.REJECTED]: 'rejeitada',
      [ApprovalStatus.EXPIRED]: 'expirada',
      [ApprovalStatus.CANCELLED]: 'cancelada',
    };
    return translations[status] || status;
  }

  /**
   * Enviar email de aprovação
   */
  private async sendApprovalEmail(
    approval: TicketApproval,
    ticket: Ticket,
    customMessage?: string | null,
  ): Promise<boolean> {
    try {
      const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
      const apiUrl = this.configService.get<string>('API_URL') || 'http://localhost:3001/api';

      // URLs de ação direta (API_URL já contém /api)
      const approveUrl = `${apiUrl}/v1/tickets/public/approval/${approval.approval_token}/submit?decision=approved`;
      const rejectUrl = `${apiUrl}/v1/tickets/public/approval/${approval.approval_token}/submit?decision=rejected`;

      // URL da página de aprovação (com campo de comentário)
      const approvalPageUrl = `${apiUrl}/v1/tickets/public/approval/${approval.approval_token}/page`;

      const sent = await this.emailService.sendApprovalRequestEmail(
        approval.approver_email,
        approval.approver_name || 'Aprovador',
        ticket.ticket_number,
        ticket.title,
        ticket.description || '',
        ticket.client_name || 'Não informado',
        ticket.requester_name || ticket.created_by?.name || 'Não informado',
        approveUrl,
        rejectUrl,
        approvalPageUrl,
        customMessage || undefined,
      );

      if (sent) {
        approval.email_sent = true;
        approval.email_sent_at = new Date();
        await this.approvalRepository.save(approval);
      }

      return sent;
    } catch (error) {
      this.logger.error(`Erro ao enviar email de aprovação: ${error.message}`);
      return false;
    }
  }

  /**
   * Adicionar comentário de aprovação ao ticket
   */
  private async addApprovalComment(
    approval: TicketApproval,
    decision: 'approved' | 'rejected',
  ): Promise<void> {
    try {
      const statusText = decision === 'approved' ? 'APROVADO' : 'REJEITADO';
      const approverName = approval.approver_name || approval.approver_email;

      const content = `**[${statusText}]** por ${approverName}\n\n${approval.comment}`;

      // Usar o user que solicitou a aprovação como autor do comentário
      // já que o aprovador é externo e user_id não pode ser null
      const comment = this.commentRepository.create({
        ticket_id: approval.ticket_id,
        user_id: approval.requested_by_id,
        content,
        type: CommentType.CLIENT,
        sent_to_client: false,
        metadata: {
          approval_id: approval.id,
          approval_decision: decision,
          approver_email: approval.approver_email,
          is_external_approval: true,
        },
      });

      await this.commentRepository.save(comment);
    } catch (error) {
      this.logger.warn(`Erro ao adicionar comentário de aprovação: ${error.message}`);
    }
  }

  /**
   * Notificar solicitante sobre a resposta
   */
  private async notifyRequester(
    approval: TicketApproval,
    decision: 'approved' | 'rejected',
  ): Promise<void> {
    try {
      // Por enquanto, apenas logamos. Pode-se implementar email/notificação push
      const statusText = decision === 'approved' ? 'aprovado' : 'rejeitado';
      this.logger.log(
        `Ticket ${approval.ticket.ticket_number} foi ${statusText} por ${approval.approver_email}`,
      );

      // TODO: Implementar notificação por email ao solicitante
      // await this.emailService.sendApprovalResponseNotification(...)
    } catch (error) {
      this.logger.warn(`Erro ao notificar solicitante: ${error.message}`);
    }
  }
}
