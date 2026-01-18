import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Checklist, ChecklistFieldType } from '../entities/checklist.entity';
import { TicketChecklist, ChecklistFieldInstance } from '../entities/ticket-checklist.entity';
import {
  CreateChecklistTemplateDto,
  UpdateChecklistTemplateDto,
  AddChecklistToTicketDto,
  UpdateChecklistItemDto,
} from '../dto/create-checklist.dto';
import { TicketHistoryService } from './ticket-history.service';
import { HistoryAction } from '../entities/ticket-history.entity';

@Injectable()
export class ChecklistsService {
  private readonly logger = new Logger(ChecklistsService.name);

  constructor(
    @InjectRepository(Checklist)
    private checklistRepository: Repository<Checklist>,
    @InjectRepository(TicketChecklist)
    private ticketChecklistRepository: Repository<TicketChecklist>,
    private ticketHistoryService: TicketHistoryService,
  ) {}

  // ==================== TEMPLATES ====================

  /**
   * Criar template de checklist
   */
  async createTemplate(userId: string, dto: CreateChecklistTemplateDto) {
    this.logger.log(`Criando checklist template: ${dto.name}`);

    const checklist = this.checklistRepository.create({
      ...dto,
      items: dto.items || [],
      client_restrictions: dto.client_restrictions || [],
      catalog_restrictions: dto.catalog_restrictions || [],
      is_mandatory: dto.is_mandatory || false,
      created_by_id: userId,
    });

    const saved = await this.checklistRepository.save(checklist);
    this.logger.log(`Checklist criado: ${saved.id}`);
    return saved;
  }

  /**
   * Listar templates de checklist
   */
  async findTemplates(serviceDeskId?: string, category?: string, includeInactive = false) {
    const query = this.checklistRepository
      .createQueryBuilder('checklist')
      .leftJoinAndSelect('checklist.service_desk', 'service_desk')
      .leftJoinAndSelect('checklist.created_by', 'created_by')
      .orderBy('checklist.display_order', 'ASC')
      .addOrderBy('checklist.name', 'ASC');

    if (!includeInactive) {
      query.where('checklist.is_active = :isActive', { isActive: true });
    }

    if (serviceDeskId) {
      query.andWhere('(checklist.service_desk_id = :serviceDeskId OR checklist.service_desk_id IS NULL)', { serviceDeskId });
    }

    if (category) {
      query.andWhere('checklist.category = :category', { category });
    }

    return query.getMany();
  }

  /**
   * Listar todos os templates (incluindo inativos) para administração
   */
  async findAllTemplates() {
    return this.checklistRepository.find({
      relations: ['service_desk', 'created_by'],
      order: { display_order: 'ASC', name: 'ASC' },
    });
  }

  /**
   * Buscar template por ID
   */
  async findTemplate(id: string) {
    const checklist = await this.checklistRepository.findOne({
      where: { id },
      relations: ['service_desk', 'created_by'],
    });

    if (!checklist) {
      throw new NotFoundException('Template de checklist não encontrado');
    }

    return checklist;
  }

  /**
   * Atualizar template
   */
  async updateTemplate(id: string, dto: UpdateChecklistTemplateDto) {
    const checklist = await this.findTemplate(id);
    this.logger.log(`Atualizando checklist: ${id}`);

    Object.assign(checklist, dto);
    return this.checklistRepository.save(checklist);
  }

  /**
   * Remover template (soft delete)
   */
  async removeTemplate(id: string) {
    const checklist = await this.findTemplate(id);
    this.logger.log(`Desativando checklist: ${id}`);

    checklist.is_active = false;
    await this.checklistRepository.save(checklist);
    return { success: true, message: 'Template removido com sucesso' };
  }

  /**
   * Excluir template permanentemente
   */
  async deleteTemplate(id: string) {
    const checklist = await this.findTemplate(id);
    this.logger.warn(`Excluindo checklist permanentemente: ${id}`);

    await this.checklistRepository.remove(checklist);
    return { success: true, message: 'Template excluído permanentemente' };
  }

  /**
   * Buscar checklists aplicáveis a um ticket
   * (baseado nas restrições de cliente e catálogo)
   */
  async findApplicableChecklists(clientId?: string, catalogId?: string, serviceDeskId?: string) {
    const query = this.checklistRepository
      .createQueryBuilder('checklist')
      .where('checklist.is_active = :isActive', { isActive: true });

    if (serviceDeskId) {
      query.andWhere('(checklist.service_desk_id = :serviceDeskId OR checklist.service_desk_id IS NULL)', { serviceDeskId });
    }

    const checklists = await query.getMany();

    // Filtrar por restrições de cliente e catálogo
    return checklists.filter((checklist) => {
      // Se não há restrições, aplica a todos
      const clientOk =
        !checklist.client_restrictions?.length ||
        (clientId && checklist.client_restrictions.includes(clientId));

      const catalogOk =
        !checklist.catalog_restrictions?.length ||
        (catalogId && checklist.catalog_restrictions.includes(catalogId));

      return clientOk && catalogOk;
    });
  }

  // ==================== TICKET CHECKLISTS ====================

  /**
   * Adicionar checklist a um ticket
   */
  async addToTicket(userId: string, dto: AddChecklistToTicketDto) {
    const template = await this.findTemplate(dto.checklist_id);
    this.logger.log(`Adicionando checklist ${template.name} ao ticket ${dto.ticket_id}`);

    // Criar campos com status de não preenchido
    const items: ChecklistFieldInstance[] = template.items.map((field) => ({
      ...field,
      is_filled: false,
      is_completed: false,  // Compatibilidade legada
      value: this.getDefaultValue(field.type),
    }));

    // Contar campos obrigatórios
    const requiredFields = items.filter((item) => item.required);
    const totalItems = requiredFields.length || items.length;

    const ticketChecklist = this.ticketChecklistRepository.create({
      ticket_id: dto.ticket_id,
      checklist_id: dto.checklist_id,
      checklist_name: template.name,
      is_mandatory: template.is_mandatory,
      items: items,
      completed_items: 0,
      total_items: totalItems,
      completion_percent: 0,
      is_completed: false,
      created_by_id: userId,
    });

    const savedChecklist = await this.ticketChecklistRepository.save(ticketChecklist);

    // Registrar no histórico
    try {
      await this.ticketHistoryService.recordHistory({
        ticket_id: ticketChecklist.ticket_id,
        user_id: userId,
        action: HistoryAction.CHECKLIST_ADDED,
        description: `Checklist adicionado: ${template.name}`,
      });
    } catch (error) {
      this.logger.warn(`Erro ao registrar checklist no histórico: ${error.message}`);
    }

    return savedChecklist;
  }

  /**
   * Listar checklists de um ticket
   */
  async findTicketChecklists(ticketId: string) {
    return this.ticketChecklistRepository.find({
      where: { ticket_id: ticketId },
      relations: ['checklist', 'created_by'],
      order: { created_at: 'ASC' },
    });
  }

  /**
   * Buscar checklist de ticket por ID
   */
  async findTicketChecklist(id: string) {
    const ticketChecklist = await this.ticketChecklistRepository.findOne({
      where: { id },
      relations: ['checklist', 'created_by'],
    });

    if (!ticketChecklist) {
      throw new NotFoundException('Checklist do ticket não encontrado');
    }

    return ticketChecklist;
  }

  /**
   * Atualizar campo do checklist
   */
  async updateItem(
    checklistId: string,
    userId: string,
    userName: string,
    dto: UpdateChecklistItemDto,
  ) {
    const ticketChecklist = await this.findTicketChecklist(checklistId);

    // Encontrar e atualizar o campo
    const items = ticketChecklist.items.map((item) => {
      if (item.id === dto.item_id) {
        const isFilled = this.isFieldFilled(item.type, dto.value ?? dto.is_completed);

        return {
          ...item,
          // Novos campos
          value: dto.value ?? dto.is_completed,
          is_filled: isFilled,
          filled_at: isFilled ? new Date() : undefined,
          filled_by_id: isFilled ? userId : undefined,
          filled_by_name: isFilled ? userName : undefined,
          // Campos legados (compatibilidade)
          is_completed: dto.is_completed ?? isFilled,
          completed_at: isFilled ? new Date() : undefined,
          completed_by_id: isFilled ? userId : undefined,
          completed_by_name: isFilled ? userName : undefined,
          notes: dto.notes,
        };
      }
      return item;
    });

    // Recalcular progresso baseado em campos obrigatórios preenchidos
    const requiredFields = items.filter((item) => item.required);
    const fieldsToCount = requiredFields.length > 0 ? requiredFields : items;
    const completedFields = fieldsToCount.filter((item) => item.is_filled);

    const completedItems = completedFields.length;
    const totalItems = fieldsToCount.length;
    const completionPercent = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
    const isCompleted = completedItems === totalItems;

    ticketChecklist.items = items;
    ticketChecklist.completed_items = completedItems;
    ticketChecklist.total_items = totalItems;
    ticketChecklist.completion_percent = completionPercent;

    // Detectar se o checklist acabou de ser completado
    const wasJustCompleted = isCompleted && !ticketChecklist.is_completed;
    ticketChecklist.is_completed = isCompleted;

    if (isCompleted && !ticketChecklist.completed_at) {
      ticketChecklist.completed_at = new Date();
    } else if (!isCompleted) {
      ticketChecklist.completed_at = null as any;
    }

    const savedChecklist = await this.ticketChecklistRepository.save(ticketChecklist);

    // Registrar no histórico quando o checklist é completado
    if (wasJustCompleted) {
      try {
        await this.ticketHistoryService.recordHistory({
          ticket_id: ticketChecklist.ticket_id,
          user_id: userId,
          action: HistoryAction.CHECKLIST_COMPLETED,
          description: `Checklist concluído: ${ticketChecklist.checklist_name}`,
        });
      } catch (error) {
        this.logger.warn(`Erro ao registrar conclusão do checklist no histórico: ${error.message}`);
      }
    }

    return savedChecklist;
  }

  /**
   * Remover checklist de um ticket
   */
  async removeFromTicket(id: string) {
    const ticketChecklist = await this.findTicketChecklist(id);
    await this.ticketChecklistRepository.remove(ticketChecklist);
    return { success: true, message: 'Checklist removido do ticket' };
  }

  /**
   * Verificar se todos os checklists obrigatórios de um ticket estão completos
   */
  async areRequiredChecklistsComplete(ticketId: string): Promise<boolean> {
    const checklists = await this.findTicketChecklists(ticketId);
    const mandatoryChecklists = checklists.filter((c) => c.is_mandatory);

    if (mandatoryChecklists.length === 0) {
      return true;
    }

    return mandatoryChecklists.every((c) => c.is_completed);
  }

  // ==================== HELPERS ====================

  /**
   * Obter valor padrão para um tipo de campo
   */
  private getDefaultValue(type: ChecklistFieldType): any {
    switch (type) {
      case ChecklistFieldType.CHECKBOX:
        return false;
      case ChecklistFieldType.NUMBER:
      case ChecklistFieldType.CURRENCY:
        return null;
      case ChecklistFieldType.MULTIPLE_CHOICE:
        return [];
      default:
        return '';
    }
  }

  /**
   * Verificar se um campo está preenchido
   */
  private isFieldFilled(type: ChecklistFieldType, value: any): boolean {
    if (value === undefined || value === null) {
      return false;
    }

    switch (type) {
      case ChecklistFieldType.CHECKBOX:
        return value === true;
      case ChecklistFieldType.TEXT:
      case ChecklistFieldType.PARAGRAPH:
        return typeof value === 'string' && value.trim().length > 0;
      case ChecklistFieldType.NUMBER:
      case ChecklistFieldType.CURRENCY:
        return typeof value === 'number' || (typeof value === 'string' && !isNaN(parseFloat(value)));
      case ChecklistFieldType.SINGLE_CHOICE:
        return typeof value === 'string' && value.length > 0;
      case ChecklistFieldType.MULTIPLE_CHOICE:
        return Array.isArray(value) && value.length > 0;
      case ChecklistFieldType.DATE:
        return value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)));
      case ChecklistFieldType.FILE:
        return value && typeof value === 'object' && value.file_path;
      default:
        return !!value;
    }
  }
}
