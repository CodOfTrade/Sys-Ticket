import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Checklist } from '../entities/checklist.entity';
import { TicketChecklist, ChecklistItem } from '../entities/ticket-checklist.entity';
import {
  CreateChecklistTemplateDto,
  UpdateChecklistTemplateDto,
  AddChecklistToTicketDto,
  UpdateChecklistItemDto,
} from '../dto/create-checklist.dto';

@Injectable()
export class ChecklistsService {
  constructor(
    @InjectRepository(Checklist)
    private checklistRepository: Repository<Checklist>,
    @InjectRepository(TicketChecklist)
    private ticketChecklistRepository: Repository<TicketChecklist>,
  ) {}

  // ==================== TEMPLATES ====================

  /**
   * Criar template de checklist
   */
  async createTemplate(userId: string, dto: CreateChecklistTemplateDto) {
    const checklist = this.checklistRepository.create({
      ...dto,
      created_by_id: userId,
    });

    return this.checklistRepository.save(checklist);
  }

  /**
   * Listar templates de checklist
   */
  async findTemplates(serviceDeskId?: string, category?: string) {
    const query = this.checklistRepository
      .createQueryBuilder('checklist')
      .where('checklist.is_active = :isActive', { isActive: true })
      .orderBy('checklist.display_order', 'ASC')
      .addOrderBy('checklist.name', 'ASC');

    if (serviceDeskId) {
      query.andWhere('checklist.service_desk_id = :serviceDeskId', { serviceDeskId });
    }

    if (category) {
      query.andWhere('checklist.category = :category', { category });
    }

    return query.getMany();
  }

  /**
   * Buscar template por ID
   */
  async findTemplate(id: string) {
    const checklist = await this.checklistRepository.findOne({ where: { id } });

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
    Object.assign(checklist, dto);
    return this.checklistRepository.save(checklist);
  }

  /**
   * Remover template (soft delete)
   */
  async removeTemplate(id: string) {
    const checklist = await this.findTemplate(id);
    checklist.is_active = false;
    await this.checklistRepository.save(checklist);
    return { success: true, message: 'Template removido com sucesso' };
  }

  // ==================== TICKET CHECKLISTS ====================

  /**
   * Adicionar checklist a um ticket
   */
  async addToTicket(userId: string, dto: AddChecklistToTicketDto) {
    const template = await this.findTemplate(dto.checklist_id);

    // Criar items com status de conclusão
    const items: ChecklistItem[] = template.items.map((item) => ({
      ...item,
      is_completed: false,
    }));

    const ticketChecklist = this.ticketChecklistRepository.create({
      ticket_id: dto.ticket_id,
      checklist_id: dto.checklist_id,
      checklist_name: template.name,
      items: items,
      completed_items: 0,
      total_items: items.length,
      completion_percent: 0,
      is_completed: false,
      created_by_id: userId,
    });

    return this.ticketChecklistRepository.save(ticketChecklist);
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
   * Atualizar item do checklist
   */
  async updateItem(
    checklistId: string,
    userId: string,
    userName: string,
    dto: UpdateChecklistItemDto,
  ) {
    const ticketChecklist = await this.findTicketChecklist(checklistId);

    // Encontrar e atualizar o item
    const items = ticketChecklist.items.map((item) => {
      if (item.id === dto.item_id) {
        return {
          ...item,
          is_completed: dto.is_completed,
          completed_at: dto.is_completed ? new Date() : undefined,
          completed_by_id: dto.is_completed ? userId : undefined,
          completed_by_name: dto.is_completed ? userName : undefined,
          notes: dto.notes,
        };
      }
      return item;
    });

    // Recalcular progresso
    const completedItems = items.filter((item) => item.is_completed).length;
    const totalItems = items.length;
    const completionPercent = (completedItems / totalItems) * 100;
    const isCompleted = completedItems === totalItems;

    ticketChecklist.items = items;
    ticketChecklist.completed_items = completedItems;
    ticketChecklist.total_items = totalItems;
    ticketChecklist.completion_percent = completionPercent;
    ticketChecklist.is_completed = isCompleted;

    if (isCompleted && !ticketChecklist.completed_at) {
      ticketChecklist.completed_at = new Date();
    } else if (!isCompleted && ticketChecklist.completed_at) {
      ticketChecklist.completed_at = null;
    }

    return this.ticketChecklistRepository.save(ticketChecklist);
  }

  /**
   * Remover checklist de um ticket
   */
  async removeFromTicket(id: string) {
    const ticketChecklist = await this.findTicketChecklist(id);
    await this.ticketChecklistRepository.remove(ticketChecklist);
    return { success: true, message: 'Checklist removido do ticket' };
  }
}
