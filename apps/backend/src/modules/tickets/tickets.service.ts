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
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { QueryTicketDto } from './dto/query-ticket.dto';
import { CACHE_MANAGER } from '../../shared/shared.module';
import { SimpleCacheService } from '../../shared/services/simple-cache.service';
import { PaginatedResult } from './interfaces/paginated-result.interface';
import { ClientsService } from '../clients/clients.service';

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);
  private ticketCounter = 0;

  constructor(
    @InjectRepository(Ticket)
    private ticketsRepository: Repository<Ticket>,
    private eventEmitter: EventEmitter2,
    @Inject(CACHE_MANAGER) private cacheManager: SimpleCacheService,
    @Inject(forwardRef(() => ClientsService))
    private clientsService: ClientsService,
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
   * Gera o próximo número de ticket sequencial
   */
  private generateTicketNumber(): string {
    this.ticketCounter++;
    const year = new Date().getFullYear();
    const paddedNumber = String(this.ticketCounter).padStart(6, '0');
    return `TKT-${year}-${paddedNumber}`;
  }

  /**
   * Cria um novo ticket
   */
  async create(createTicketDto: CreateTicketDto, createdById?: string): Promise<Ticket> {
    try {
      const ticketNumber = this.generateTicketNumber();

      // Extrair followers do DTO para tratar separadamente
      const { followers, ...ticketData } = createTicketDto;

      const ticket = this.ticketsRepository.create({
        ...ticketData,
        ticket_number: ticketNumber,
        created_by_id: createdById,
      });

      const savedTicket = await this.ticketsRepository.save(ticket);

      // TODO: Implementar criação de followers se necessário
      // if (followers && followers.length > 0) {
      //   await this.ticketFollowersRepository.save(
      //     followers.map(userId => ({ ticket_id: savedTicket.id, user_id: userId }))
      //   );
      // }

      // Emitir evento de criação
      this.eventEmitter.emit('ticket.created', savedTicket);

      // Invalidar cache
      await this.invalidateTicketCache();

      this.logger.log(`Ticket criado: ${ticketNumber}`);

      return savedTicket;
    } catch (error) {
      this.logger.error('Erro ao criar ticket', error);
      throw new BadRequestException('Erro ao criar ticket');
    }
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
  async update(id: string, updateTicketDto: UpdateTicketDto): Promise<Ticket> {
    try {
      const ticket = await this.findOne(id);

      // Verificar mudanças de status importantes
      if (updateTicketDto.status && updateTicketDto.status !== ticket.status) {
        await this.handleStatusChange(ticket, updateTicketDto.status);
      }

      // Atualizar ticket
      Object.assign(ticket, updateTicketDto);

      const updatedTicket = await this.ticketsRepository.save(ticket);

      // Emitir evento de atualização
      this.eventEmitter.emit('ticket.updated', {
        before: ticket,
        after: updatedTicket,
      });

      // Invalidar cache
      await this.invalidateTicketCache();

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
        break;

      case TicketStatus.CLOSED:
        ticket.closed_at = now;
        if (!ticket.resolved_at) {
          ticket.resolved_at = now;
        }
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
  async assign(id: string, assignedToId: string): Promise<Ticket> {
    try {
      const ticket = await this.findOne(id);

      ticket.assigned_to_id = assignedToId;

      const updatedTicket = await this.ticketsRepository.save(ticket);

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
  async unassign(id: string): Promise<Ticket> {
    try {
      const ticket = await this.findOne(id);

      ticket.assigned_to_id = null;

      const updatedTicket = await this.ticketsRepository.save(ticket);

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
    // Por simplicidade, vamos limpar apenas por padrão
    this.logger.debug('Cache de tickets invalidado');
  }
}
