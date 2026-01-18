import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketHistory, HistoryAction } from '../entities/ticket-history.entity';

interface RecordHistoryParams {
  ticket_id: string;
  user_id?: string | null;
  action: HistoryAction;
  field?: string | null;
  old_value?: string | null;
  new_value?: string | null;
  description?: string | null;
}

@Injectable()
export class TicketHistoryService {
  private readonly logger = new Logger(TicketHistoryService.name);

  constructor(
    @InjectRepository(TicketHistory)
    private historyRepository: Repository<TicketHistory>,
  ) {}

  /**
   * Registra uma ação no histórico do ticket
   */
  async recordHistory(params: RecordHistoryParams): Promise<TicketHistory> {
    const { ticket_id, user_id, action, field, old_value, new_value, description } = params;

    const history = this.historyRepository.create({
      ticket_id,
      user_id: user_id || null,
      action,
      field: field || null,
      old_value: old_value || null,
      new_value: new_value || null,
      description: description || null,
    });

    const saved = await this.historyRepository.save(history);
    this.logger.debug(`Histórico registrado: ${action} para ticket ${ticket_id}`);
    return saved;
  }

  /**
   * Registra a criação de um ticket
   */
  async recordCreated(ticketId: string, userId: string, ticketNumber: string): Promise<void> {
    await this.recordHistory({
      ticket_id: ticketId,
      user_id: userId,
      action: HistoryAction.CREATED,
      description: `Ticket ${ticketNumber} criado`,
    });
  }

  /**
   * Registra mudança de status
   */
  async recordStatusChange(
    ticketId: string,
    userId: string | null,
    oldStatus: string,
    newStatus: string,
  ): Promise<void> {
    await this.recordHistory({
      ticket_id: ticketId,
      user_id: userId,
      action: HistoryAction.STATUS_CHANGED,
      field: 'status',
      old_value: oldStatus,
      new_value: newStatus,
      description: `Status alterado de "${this.translateStatus(oldStatus)}" para "${this.translateStatus(newStatus)}"`,
    });
  }

  /**
   * Registra atribuição de ticket
   */
  async recordAssigned(
    ticketId: string,
    userId: string | null,
    assignedToId: string,
    assignedToName: string,
  ): Promise<void> {
    await this.recordHistory({
      ticket_id: ticketId,
      user_id: userId,
      action: HistoryAction.ASSIGNED,
      field: 'assigned_to_id',
      new_value: assignedToId,
      description: `Ticket atribuído a ${assignedToName}`,
    });
  }

  /**
   * Registra remoção de atribuição
   */
  async recordUnassigned(
    ticketId: string,
    userId: string | null,
    previousAssignedName?: string,
  ): Promise<void> {
    await this.recordHistory({
      ticket_id: ticketId,
      user_id: userId,
      action: HistoryAction.UNASSIGNED,
      field: 'assigned_to_id',
      description: previousAssignedName
        ? `Atribuição removida de ${previousAssignedName}`
        : 'Atribuição removida',
    });
  }

  /**
   * Registra mudança de prioridade
   */
  async recordPriorityChange(
    ticketId: string,
    userId: string | null,
    oldPriority: string,
    newPriority: string,
  ): Promise<void> {
    await this.recordHistory({
      ticket_id: ticketId,
      user_id: userId,
      action: HistoryAction.PRIORITY_CHANGED,
      field: 'priority',
      old_value: oldPriority,
      new_value: newPriority,
      description: `Prioridade alterada de "${this.translatePriority(oldPriority)}" para "${this.translatePriority(newPriority)}"`,
    });
  }

  /**
   * Registra mudança de cliente
   */
  async recordClientChange(
    ticketId: string,
    userId: string | null,
    oldClientName: string | null,
    newClientName: string,
  ): Promise<void> {
    await this.recordHistory({
      ticket_id: ticketId,
      user_id: userId,
      action: HistoryAction.CLIENT_CHANGED,
      field: 'client_id',
      old_value: oldClientName,
      new_value: newClientName,
      description: oldClientName
        ? `Cliente alterado de "${oldClientName}" para "${newClientName}"`
        : `Cliente definido como "${newClientName}"`,
    });
  }

  /**
   * Registra mudança de solicitante
   */
  async recordRequesterChange(
    ticketId: string,
    userId: string | null,
    oldRequester: string | null,
    newRequester: string,
  ): Promise<void> {
    await this.recordHistory({
      ticket_id: ticketId,
      user_id: userId,
      action: HistoryAction.REQUESTER_CHANGED,
      field: 'requester_name',
      old_value: oldRequester,
      new_value: newRequester,
      description: oldRequester
        ? `Solicitante alterado de "${oldRequester}" para "${newRequester}"`
        : `Solicitante definido como "${newRequester}"`,
    });
  }

  /**
   * Registra adição de comentário
   */
  async recordCommented(
    ticketId: string,
    userId: string,
    isInternal: boolean,
  ): Promise<void> {
    await this.recordHistory({
      ticket_id: ticketId,
      user_id: userId,
      action: HistoryAction.COMMENTED,
      description: isInternal ? 'Comentário interno adicionado' : 'Comentário adicionado',
    });
  }

  /**
   * Registra atualização genérica de campo
   */
  async recordFieldUpdate(
    ticketId: string,
    userId: string | null,
    field: string,
    oldValue: string | null,
    newValue: string | null,
  ): Promise<void> {
    await this.recordHistory({
      ticket_id: ticketId,
      user_id: userId,
      action: HistoryAction.UPDATED,
      field,
      old_value: oldValue,
      new_value: newValue,
      description: `Campo "${this.translateField(field)}" atualizado`,
    });
  }

  /**
   * Busca o histórico de um ticket
   */
  async getTicketHistory(ticketId: string, limit = 100, offset = 0): Promise<TicketHistory[]> {
    return this.historyRepository.find({
      where: { ticket_id: ticketId },
      relations: ['user'],
      order: { created_at: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Conta o total de registros de histórico de um ticket
   */
  async countTicketHistory(ticketId: string): Promise<number> {
    return this.historyRepository.count({
      where: { ticket_id: ticketId },
    });
  }

  // Helpers para tradução
  private translateStatus(status: string): string {
    const translations: Record<string, string> = {
      new: 'Novo',
      in_progress: 'Em Atendimento',
      waiting_client: 'Aguardando Cliente',
      waiting_third_party: 'Aguardando Terceiros',
      paused: 'Pausado',
      waiting_approval: 'Aguardando Aprovação',
      waiting_evaluation: 'Aguardando Avaliação',
      approved: 'Aprovado',
      reopened: 'Reaberto',
      resolved: 'Resolvido',
      cancelled: 'Cancelado',
    };
    return translations[status] || status;
  }

  private translatePriority(priority: string): string {
    const translations: Record<string, string> = {
      low: 'Baixa',
      medium: 'Média',
      high: 'Alta',
      urgent: 'Urgente',
    };
    return translations[priority] || priority;
  }

  private translateField(field: string): string {
    const translations: Record<string, string> = {
      title: 'Título',
      description: 'Descrição',
      priority: 'Prioridade',
      status: 'Status',
      client_id: 'Cliente',
      client_name: 'Nome do Cliente',
      requester_name: 'Solicitante',
      requester_email: 'Email do Solicitante',
      assigned_to_id: 'Atribuído a',
      service_desk_id: 'Service Desk',
      due_date: 'Data de Vencimento',
      category: 'Categoria',
      subcategory: 'Subcategoria',
      type: 'Tipo',
    };
    return translations[field] || field;
  }
}
