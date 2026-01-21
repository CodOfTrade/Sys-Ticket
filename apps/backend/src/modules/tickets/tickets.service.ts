import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Ticket, TicketStatus } from './entities/ticket.entity';
import { TicketFollower } from './entities/ticket-follower.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { QueryTicketDto } from './dto/query-ticket.dto';
import { CACHE_MANAGER } from '../../shared/shared.module';
import { SimpleCacheService } from '../../shared/services/simple-cache.service';
import { PaginatedResult } from './interfaces/paginated-result.interface';
import { ClientsService } from '../clients/clients.service';
import { TicketHistoryService } from './services/ticket-history.service';

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);
  private ticketCounter = 0;

  constructor(
    @InjectRepository(Ticket)
    private ticketsRepository: Repository<Ticket>,
    @InjectRepository(TicketFollower)
    private ticketFollowersRepository: Repository<TicketFollower>,
    private eventEmitter: EventEmitter2,
    @Inject(CACHE_MANAGER) private cacheManager: SimpleCacheService,
    @Inject(forwardRef(() => ClientsService))
    private clientsService: ClientsService,
    private ticketHistoryService: TicketHistoryService,
  ) {
    this.initializeTicketCounter();
  }

  /**
   * Inicializa o contador de tickets baseado no último ticket criado
   */
  private async initializeTicketCounter() {
    try {
      const lastTicket = await this.ticketsRepository.findOne({
        where: {},
        order: { created_at: 'DESC' },
        select: ['ticket_number'],
      });

      if (lastTicket) {
        const match = lastTicket.ticket_number.match(/\d+$/);
        if (match) {
          this.ticketCounter = parseInt(match[0], 10);
        }
      }
    } catch (error) {
      this.logger.error('Erro ao inicializar contador de tickets');
      this.logger.error(error);
      this.ticketCounter = 0;
    }
  }

  /**
   * Gera o próximo número de ticket sequencial (busca sempre do banco)
   */
  private async generateTicketNumber(): Promise<string> {
    const year = new Date().getFullYear();

    // Buscar o maior número de ticket do ano atual
    const result = await this.ticketsRepository
      .createQueryBuilder('ticket')
      .select('MAX(CAST(SUBSTRING(ticket.ticket_number FROM \'[0-9]+$\') AS INTEGER))', 'maxNumber')
      .where('ticket.ticket_number LIKE :pattern', { pattern: `TKT-${year}-%` })
      .getRawOne();

    const nextNumber = (result?.maxNumber || 0) + 1;
    const paddedNumber = String(nextNumber).padStart(6, '0');
    return `TKT-${year}-${paddedNumber}`;
  }

  /**
   * Cria um novo ticket
   */
  async create(createTicketDto: CreateTicketDto, createdById?: string): Promise<Ticket> {
    const maxRetries = 3;
    let lastError: Error = new Error('Erro desconhecido');

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const ticketNumber = await this.generateTicketNumber();

        // Extrair followers do DTO para tratar separadamente
        const { followers, ...ticketData } = createTicketDto;

        const ticket = this.ticketsRepository.create({
          ...ticketData,
          ticket_number: ticketNumber,
          created_by_id: createdById,
        });

        const savedTicket = await this.ticketsRepository.save(ticket);

        // Registrar no histórico
        await this.ticketHistoryService.recordCreated(
          savedTicket.id,
          createdById || '',
          ticketNumber,
        );

        // Emitir evento de criação
        this.eventEmitter.emit('ticket.created', savedTicket);

        // Invalidar cache
        await this.invalidateTicketCache();

        this.logger.log(`Ticket criado: ${ticketNumber}`);

        return savedTicket;
      } catch (error) {
        lastError = error;

        // Se for erro de chave duplicada e ainda temos tentativas, retry
        if (error.message?.includes('duplicate key') && attempt < maxRetries) {
          this.logger.warn(`Conflito de número de ticket, tentativa ${attempt}/${maxRetries}. Retrying...`);
          continue;
        }

        this.logger.error('Erro ao criar ticket:');
        this.logger.error(error.message);
        if (error.detail) {
          this.logger.error('Detalhe do erro:', error.detail);
        }
        throw new BadRequestException(`Erro ao criar ticket: ${error.message}`);
      }
    }

    throw new BadRequestException(`Erro ao criar ticket após ${maxRetries} tentativas: ${lastError.message}`);
  }

  /**
   * Busca todos os tickets com filtros e paginação
   */
  async findAll(query: QueryTicketDto): Promise<PaginatedResult<Ticket>> {
    const {
      page = 1,
      perPage = 20,
      status,
      priority,
      type,
      client_id,
      service_desk_id,
      assigned_to_id,
      category,
      search,
      unassigned,
      sla_violated,
      can_invoice,
      invoiced,
      sortBy = 'created_at',
      sortOrder = 'DESC',
    } = query;

    const cacheKey = `tickets:list:${JSON.stringify(query)}`;

    try {
      // Verificar cache
      const cached = await this.cacheManager.get<PaginatedResult<Ticket>>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for ${cacheKey}`);
        return cached;
      }

      const queryBuilder = this.ticketsRepository
        .createQueryBuilder('ticket')
        .leftJoinAndSelect('ticket.service_desk', 'service_desk')
        .leftJoinAndSelect('ticket.assigned_to', 'assigned_to')
        .leftJoinAndSelect('ticket.created_by', 'created_by')
        .leftJoinAndSelect('ticket.parent_ticket', 'parent_ticket');

      // Aplicar filtros
      if (status) {
        queryBuilder.andWhere('ticket.status = :status', { status });
      }

      if (priority) {
        queryBuilder.andWhere('ticket.priority = :priority', { priority });
      }

      if (type) {
        queryBuilder.andWhere('ticket.type = :type', { type });
      }

      if (client_id) {
        queryBuilder.andWhere('ticket.client_id = :client_id', { client_id });
      }

      if (service_desk_id) {
        queryBuilder.andWhere('ticket.service_desk_id = :service_desk_id', {
          service_desk_id,
        });
      }

      if (assigned_to_id) {
        queryBuilder.andWhere('ticket.assigned_to_id = :assigned_to_id', {
          assigned_to_id,
        });
      }

      if (category) {
        queryBuilder.andWhere('ticket.category = :category', { category });
      }

      if (unassigned) {
        queryBuilder.andWhere('ticket.assigned_to_id IS NULL');
      }

      if (sla_violated !== undefined) {
        queryBuilder.andWhere('ticket.sla_violated = :sla_violated', { sla_violated });
      }

      if (can_invoice !== undefined) {
        queryBuilder.andWhere('ticket.can_invoice = :can_invoice', { can_invoice });
      }

      if (invoiced !== undefined) {
        queryBuilder.andWhere('ticket.invoiced = :invoiced', { invoiced });
      }

      if (search) {
        queryBuilder.andWhere(
          '(ticket.title ILIKE :search OR ticket.description ILIKE :search OR ticket.ticket_number ILIKE :search)',
          { search: `%${search}%` },
        );
      }

      // Paginação
      const skip = (page - 1) * perPage;
      queryBuilder.skip(skip).take(perPage);

      // Ordenação
      const orderColumn = `ticket.${sortBy}`;
      queryBuilder.orderBy(orderColumn, sortOrder);

      // Executar query
      const [data, total] = await queryBuilder.getManyAndCount();

      const result = {
        data,
        meta: {
          total,
          page,
          perPage,
          totalPages: Math.ceil(total / perPage),
        },
      };

      // Armazenar em cache por 2 minutos
      await this.cacheManager.set(cacheKey, result, 120);

      return result;
    } catch (error) {
      this.logger.error('Erro ao buscar tickets', error);
      throw error;
    }
  }

  /**
   * Busca um ticket por ID
   */
  async findOne(id: string): Promise<Ticket> {
    try {
      this.logger.log(`Buscando ticket com ID: ${id}`);

      const ticket = await this.ticketsRepository.findOne({
        where: { id },
        relations: [
          'service_desk',
          'assigned_to',
          'created_by',
          'parent_ticket',
          'children',
          'timesheets',
          'timesheets.user',
          'attachments',
          'followers',
          'followers.user',
          'contact',
          'service_catalog',
          'service_category',
        ],
      });

      if (!ticket) {
        this.logger.warn(`Ticket com ID ${id} não encontrado`);
        throw new NotFoundException(`Ticket com ID ${id} não encontrado`);
      }

      // Buscar informações do cliente se houver client_id
      if (ticket.client_id) {
        try {
          const client = await this.clientsService.findByUuid(ticket.client_id);
          if (client) {
            const clientName = client.nome || client.nome_fantasia || client.razao_social;
            (ticket as any).client = {
              id: client.id,
              name: clientName,
            };
          }
        } catch (error) {
          this.logger.warn(`Erro ao buscar cliente ${ticket.client_id}: ${error.message}`);
        }
      }

      this.logger.log(`Ticket ${id} encontrado com sucesso`);
      return ticket;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Erro ao buscar ticket ${id}:`);
      this.logger.error(error);
      this.logger.error(error.stack);
      throw new BadRequestException('Erro ao buscar ticket');
    }
  }

  /**
   * Busca um ticket por número
   */
  async findByNumber(ticketNumber: string): Promise<Ticket> {
    try {
      const ticket = await this.ticketsRepository.findOne({
        where: { ticket_number: ticketNumber },
        relations: [
          'service_desk',
          'assigned_to',
          'created_by',
          'parent_ticket',
          'children',
          'timesheets',
          'service_catalog',
          'service_category',
        ],
      });

      if (!ticket) {
        throw new NotFoundException(`Ticket ${ticketNumber} não encontrado`);
      }

      return ticket;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Erro ao buscar ticket ${ticketNumber}`, error);
      throw new BadRequestException('Erro ao buscar ticket');
    }
  }

  /**
   * Atualiza um ticket
   */
  async update(id: string, updateTicketDto: UpdateTicketDto, userId?: string): Promise<Ticket> {
    try {
      const ticket = await this.findOne(id);

      this.logger.log(`=== DEBUG UPDATE TICKET ===`);
      this.logger.log(`ID: ${id}`);
      this.logger.log(`DTO recebido: ${JSON.stringify(updateTicketDto)}`);
      this.logger.log(`Ticket antes: service_catalog_id=${ticket.service_catalog_id}, service_category_id=${ticket.service_category_id}`);

      // Guardar valores antigos para histórico
      const oldStatus = ticket.status;
      const oldPriority = ticket.priority;
      const oldAssignedToId = ticket.assigned_to_id;

      // Verificar mudanças de status importantes
      if (updateTicketDto.status && updateTicketDto.status !== ticket.status) {
        await this.handleStatusChange(ticket, updateTicketDto.status);
      }

      // Atualizar ticket
      Object.assign(ticket, updateTicketDto);

      this.logger.log(`Ticket depois do assign: service_catalog_id=${ticket.service_catalog_id}, service_category_id=${ticket.service_category_id}`);

      await this.ticketsRepository.save(ticket);

      this.logger.log(`Ticket salvo com sucesso`);

      // Registrar mudanças no histórico
      await this.recordTicketChanges(
        ticket.id,
        userId || null,
        oldStatus,
        oldPriority,
        oldAssignedToId,
        updateTicketDto,
      );

      // Invalidar cache
      await this.invalidateTicketCache();

      // Recarregar o ticket com todas as relações
      const updatedTicket = await this.findOne(id);

      // Emitir evento de atualização
      this.eventEmitter.emit('ticket.updated', {
        before: ticket,
        after: updatedTicket,
      });

      this.logger.log(`Ticket atualizado: ${ticket.ticket_number}`);

      return updatedTicket;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Erro ao atualizar ticket ${id}`, error);
      throw new BadRequestException('Erro ao atualizar ticket');
    }
  }

  /**
   * Registra mudanças do ticket no histórico
   */
  private async recordTicketChanges(
    ticketId: string,
    userId: string | null,
    oldStatus: string,
    oldPriority: string,
    oldAssignedToId: string | null,
    dto: UpdateTicketDto,
  ): Promise<void> {
    try {
      // Registrar mudança de status
      if (dto.status && dto.status !== oldStatus) {
        await this.ticketHistoryService.recordStatusChange(
          ticketId,
          userId,
          oldStatus,
          dto.status,
        );
      }

      // Registrar mudança de prioridade
      if (dto.priority && dto.priority !== oldPriority) {
        await this.ticketHistoryService.recordPriorityChange(
          ticketId,
          userId,
          oldPriority,
          dto.priority,
        );
      }

      // Registrar mudança de atribuição
      if (dto.assigned_to_id !== undefined && dto.assigned_to_id !== oldAssignedToId) {
        if (dto.assigned_to_id) {
          await this.ticketHistoryService.recordAssigned(
            ticketId,
            userId,
            dto.assigned_to_id,
            'Atendente', // TODO: buscar nome do atendente
          );
        } else if (oldAssignedToId) {
          await this.ticketHistoryService.recordUnassigned(ticketId, userId);
        }
      }
    } catch (error) {
      this.logger.warn(`Erro ao registrar histórico: ${error.message}`);
      // Não falhar a operação principal por erro no histórico
    }
  }

  /**
   * Manipula mudanças de status do ticket
   */
  private async handleStatusChange(ticket: Ticket, newStatus: TicketStatus) {
    const now = new Date();

    switch (newStatus) {
      case TicketStatus.IN_PROGRESS:
        if (!ticket.started_at) {
          ticket.started_at = now;
        }
        if (!ticket.first_response_at) {
          ticket.first_response_at = now;
        }
        break;

      case TicketStatus.PAUSED:
        ticket.paused_at = now;
        break;

      case TicketStatus.RESOLVED:
        ticket.resolved_at = now;
        ticket.closed_at = now; // RESOLVED agora também preenche closed_at
        break;
    }

    // Emitir evento específico de mudança de status
    this.eventEmitter.emit('ticket.status.changed', {
      ticket,
      oldStatus: ticket.status,
      newStatus,
    });
  }

  /**
   * Atribui um ticket a um atendente
   */
  async assign(id: string, assignedToId: string, userId?: string): Promise<Ticket> {
    try {
      const ticket = await this.findOne(id);
      const oldAssignedToId = ticket.assigned_to_id;

      ticket.assigned_to_id = assignedToId;

      const updatedTicket = await this.ticketsRepository.save(ticket);

      // Registrar no histórico
      if (oldAssignedToId !== assignedToId) {
        try {
          // Buscar nome do atendente se possível
          const assignedUser = updatedTicket.assigned_to;
          const assignedName = assignedUser?.name || 'Atendente';
          await this.ticketHistoryService.recordAssigned(
            id,
            userId || null,
            assignedToId,
            assignedName,
          );
        } catch (error) {
          this.logger.warn(`Erro ao registrar atribuição no histórico: ${error.message}`);
        }
      }

      // Emitir evento de atribuição
      this.eventEmitter.emit('ticket.assigned', {
        ticket: updatedTicket,
        assignedToId,
      });

      await this.invalidateTicketCache();

      this.logger.log(`Ticket ${ticket.ticket_number} atribuído para ${assignedToId}`);

      return updatedTicket;
    } catch (error) {
      this.logger.error(`Erro ao atribuir ticket ${id}`, error);
      throw error;
    }
  }

  /**
   * Remove a atribuição de um ticket
   */
  async unassign(id: string, userId?: string): Promise<Ticket> {
    try {
      const ticket = await this.findOne(id);
      const previousAssignedName = ticket.assigned_to?.name;

      ticket.assigned_to_id = null;

      const updatedTicket = await this.ticketsRepository.save(ticket);

      // Registrar no histórico
      try {
        await this.ticketHistoryService.recordUnassigned(
          id,
          userId || null,
          previousAssignedName,
        );
      } catch (error) {
        this.logger.warn(`Erro ao registrar remoção de atribuição no histórico: ${error.message}`);
      }

      await this.invalidateTicketCache();

      this.logger.log(`Atribuição removida do ticket ${ticket.ticket_number}`);

      return updatedTicket;
    } catch (error) {
      this.logger.error(`Erro ao remover atribuição do ticket ${id}`, error);
      throw error;
    }
  }

  /**
   * Busca tickets por cliente
   */
  async findByClient(clientId: string, query: QueryTicketDto = {}): Promise<PaginatedResult<Ticket>> {
    return this.findAll({ ...query, client_id: clientId });
  }

  /**
   * Busca tickets por atendente
   */
  async findByAssignee(assigneeId: string, query: QueryTicketDto = {}): Promise<PaginatedResult<Ticket>> {
    return this.findAll({ ...query, assigned_to_id: assigneeId });
  }

  /**
   * Busca tickets não atribuídos
   */
  async findUnassigned(query: QueryTicketDto = {}): Promise<PaginatedResult<Ticket>> {
    return this.findAll({ ...query, unassigned: true });
  }

  /**
   * Busca estatísticas de tickets
   */
  async getStats(serviceDeskId?: string) {
    const queryBuilder = this.ticketsRepository.createQueryBuilder('ticket');

    if (serviceDeskId) {
      queryBuilder.where('ticket.service_desk_id = :serviceDeskId', { serviceDeskId });
    }

    const total = await queryBuilder.getCount();

    const byStatus = await queryBuilder
      .select('ticket.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('ticket.status')
      .getRawMany();

    const byPriority = await queryBuilder
      .select('ticket.priority', 'priority')
      .addSelect('COUNT(*)', 'count')
      .groupBy('ticket.priority')
      .getRawMany();

    const unassigned = await queryBuilder
      .where('ticket.assigned_to_id IS NULL')
      .getCount();

    const slaViolated = await queryBuilder
      .where('ticket.sla_violated = :slaViolated', { slaViolated: true })
      .getCount();

    const canInvoice = await queryBuilder
      .where('ticket.can_invoice = :canInvoice', { canInvoice: true })
      .andWhere('ticket.invoiced = :invoiced', { invoiced: false })
      .getCount();

    return {
      total,
      byStatus,
      byPriority,
      unassigned,
      slaViolated,
      canInvoice,
    };
  }

  /**
   * Remove um ticket (soft delete)
   */
  async remove(id: string): Promise<void> {
    try {
      const ticket = await this.findOne(id);

      await this.ticketsRepository.remove(ticket);

      // Emitir evento de remoção
      this.eventEmitter.emit('ticket.deleted', ticket);

      await this.invalidateTicketCache();

      this.logger.log(`Ticket removido: ${ticket.ticket_number}`);
    } catch (error) {
      this.logger.error(`Erro ao remover ticket ${id}`, error);
      throw error;
    }
  }

  /**
   * Invalida o cache de tickets
   */
  private async invalidateTicketCache(): Promise<void> {
    // Limpar todo o cache de tickets
    await this.cacheManager.clear();
    this.logger.debug('Cache de tickets invalidado');
  }

  // ========================================
  // MÉTODOS DE FOLLOWERS (SEGUIDORES)
  // ========================================

  /**
   * Busca os seguidores de um ticket
   */
  async getFollowers(ticketId: string): Promise<TicketFollower[]> {
    try {
      const followers = await this.ticketFollowersRepository.find({
        where: { ticket_id: ticketId },
        relations: ['user'],
        order: { created_at: 'DESC' },
      });
      return followers;
    } catch (error) {
      this.logger.error(`Erro ao buscar seguidores do ticket ${ticketId}`, error);
      throw new BadRequestException('Erro ao buscar seguidores');
    }
  }

  /**
   * Adiciona um seguidor ao ticket
   */
  async addFollower(
    ticketId: string,
    data: { user_id?: string; email?: string; name?: string },
    addedById?: string,
  ): Promise<TicketFollower> {
    try {
      // Verificar se ticket existe
      await this.findOne(ticketId);

      // Verificar se já é seguidor
      const existingFollower = await this.ticketFollowersRepository.findOne({
        where: data.user_id
          ? { ticket_id: ticketId, user_id: data.user_id }
          : { ticket_id: ticketId, email: data.email },
      });

      if (existingFollower) {
        throw new BadRequestException('Este seguidor já está adicionado ao ticket');
      }

      const follower = this.ticketFollowersRepository.create({
        ticket_id: ticketId,
        user_id: data.user_id,
        email: data.email,
        name: data.name,
        added_by_id: addedById,
        notification_preferences: {
          on_status_change: true,
          on_new_comment: true,
          on_assigned: true,
          on_closed: true,
          on_reopened: true,
        },
      });

      const savedFollower = await this.ticketFollowersRepository.save(follower);

      // Buscar com relação de user para retornar completo
      const fullFollower = await this.ticketFollowersRepository.findOne({
        where: { id: savedFollower.id },
        relations: ['user'],
      });

      this.logger.log(`Seguidor adicionado ao ticket ${ticketId}: ${data.email || data.user_id}`);

      return fullFollower!;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Erro ao adicionar seguidor ao ticket ${ticketId}`, error);
      throw new BadRequestException('Erro ao adicionar seguidor');
    }
  }

  /**
   * Remove um seguidor do ticket
   */
  async removeFollower(ticketId: string, followerId: string): Promise<void> {
    try {
      const follower = await this.ticketFollowersRepository.findOne({
        where: { id: followerId, ticket_id: ticketId },
      });

      if (!follower) {
        throw new NotFoundException('Seguidor não encontrado');
      }

      await this.ticketFollowersRepository.remove(follower);

      this.logger.log(`Seguidor ${followerId} removido do ticket ${ticketId}`);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Erro ao remover seguidor ${followerId} do ticket ${ticketId}`, error);
      throw new BadRequestException('Erro ao remover seguidor');
    }
  }
}
