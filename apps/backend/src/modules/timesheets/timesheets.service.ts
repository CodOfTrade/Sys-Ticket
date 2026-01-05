import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Timesheet } from './entities/timesheet.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { PricingConfig } from '../service-desks/entities/pricing-config.entity';
import { CreateTimesheetDto } from './dto/create-timesheet.dto';
import { UpdateTimesheetDto } from './dto/update-timesheet.dto';
import { QueryTimesheetDto } from './dto/query-timesheet.dto';
import { CACHE_MANAGER } from '../../shared/shared.module';
import { SimpleCacheService } from '../../shared/services/simple-cache.service';
import { ContractsService } from '../contracts/contracts.service';
import { PaginatedResult } from '../tickets/interfaces/paginated-result.interface';

@Injectable()
export class TimesheetsService {
  private readonly logger = new Logger(TimesheetsService.name);

  constructor(
    @InjectRepository(Timesheet)
    private timesheetsRepository: Repository<Timesheet>,
    @InjectRepository(Ticket)
    private ticketsRepository: Repository<Ticket>,
    @InjectRepository(PricingConfig)
    private pricingConfigRepository: Repository<PricingConfig>,
    private eventEmitter: EventEmitter2,
    @Inject(CACHE_MANAGER) private cacheManager: SimpleCacheService,
    private contractsService: ContractsService,
  ) {}

  /**
   * Cria um novo timesheet
   */
  async create(createTimesheetDto: CreateTimesheetDto, userId: string): Promise<Timesheet> {
    try {
      // Verificar se o ticket existe
      const ticket = await this.ticketsRepository.findOne({
        where: { id: createTimesheetDto.ticket_id },
        relations: ['service_desk'],
      });

      if (!ticket) {
        throw new NotFoundException(`Ticket ${createTimesheetDto.ticket_id} não encontrado`);
      }

      // Calcular duração se não informada
      let duration = createTimesheetDto.duration;
      if (!duration && createTimesheetDto.end_time) {
        const start = new Date(createTimesheetDto.start_time);
        const end = new Date(createTimesheetDto.end_time);
        duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60)); // minutos
      }

      // Subtrair pausas da duração
      if (duration && createTimesheetDto.pause_duration) {
        duration -= createTimesheetDto.pause_duration;
      }

      // Calcular preço e valor total
      const { unit_price, total_amount } = await this.calculatePricing(
        ticket,
        duration || 0,
        createTimesheetDto.unit_price,
        createTimesheetDto.billable ?? true,
        createTimesheetDto.billing_type,
      );

      const timesheet = this.timesheetsRepository.create({
        ...createTimesheetDto,
        user_id: userId,
        duration,
        unit_price,
        total_amount,
      });

      const savedTimesheet = await this.timesheetsRepository.save(timesheet);

      // Emitir evento
      this.eventEmitter.emit('timesheet.created', savedTimesheet);

      // Atualizar valor total do ticket
      await this.updateTicketTotal(ticket.id);

      // Invalidar cache
      await this.invalidateCache();

      this.logger.log(`Timesheet criado para ticket ${ticket.ticket_number} - ${duration} min`);

      return savedTimesheet;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Erro ao criar timesheet', error);
      throw new BadRequestException('Erro ao criar timesheet');
    }
  }

  /**
   * Calcula preço unitário e valor total baseado nas configurações
   */
  private async calculatePricing(
    ticket: Ticket,
    durationMinutes: number,
    customUnitPrice?: number,
    billable: boolean = true,
    serviceType?: string,
  ): Promise<{ unit_price: number; total_amount: number }> {
    if (!billable) {
      return { unit_price: 0, total_amount: 0 };
    }

    let unit_price = customUnitPrice || 0;

    // Se não foi informado preço customizado, buscar nas configurações
    if (!customUnitPrice && ticket.service_desk_id) {
      try {
        // Buscar configuração de preço para o tipo de serviço
        const pricingConfig = await this.pricingConfigRepository.findOne({
          where: {
            service_desk_id: ticket.service_desk_id,
            service_type: serviceType as any,
            active: true,
          },
        });

        if (pricingConfig) {
          unit_price = await this.calculateHourlyRate(pricingConfig, new Date());
        } else {
          this.logger.warn(
            `Configuração de preço não encontrada para ${ticket.service_desk_id} - ${serviceType}`,
          );
        }
      } catch (error) {
        this.logger.warn(`Erro ao buscar configuração de preço: ${error.message}`);
      }
    }

    // Arredondar minutos se configurado
    let roundedMinutes = durationMinutes;
    // TODO: Implementar arredondamento baseado em pricingConfig.round_to_minutes

    const hours = roundedMinutes / 60;
    const total_amount = unit_price * hours;

    return {
      unit_price: Number(unit_price.toFixed(2)),
      total_amount: Number(total_amount.toFixed(2)),
    };
  }

  /**
   * Calcula a taxa horária baseada no horário (normal, extra, noturno, etc)
   */
  private async calculateHourlyRate(
    pricingConfig: PricingConfig,
    dateTime: Date,
  ): Promise<number> {
    const hour = dateTime.getHours();
    const dayOfWeek = dateTime.getDay(); // 0 = Domingo, 6 = Sábado

    // TODO: Verificar se é feriado (necessário integração com API de feriados ou tabela)
    const isHoliday = false;

    // Fim de semana
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return Number(pricingConfig.hourly_rate_weekend);
    }

    // Horário noturno (após 18h)
    if (hour >= 18 || hour < 6) {
      return Number(pricingConfig.hourly_rate_night);
    }

    // Hora normal
    return Number(pricingConfig.hourly_rate_normal);
  }

  /**
   * Atualiza o valor total do ticket baseado nos timesheets
   */
  private async updateTicketTotal(ticketId: string): Promise<void> {
    try {
      const timesheets = await this.timesheetsRepository.find({
        where: { ticket_id: ticketId, billable: true },
      });

      const total = timesheets.reduce((sum, ts) => sum + Number(ts.total_amount), 0);

      await this.ticketsRepository.update(ticketId, {
        total_amount: Number(total.toFixed(2)),
      });
    } catch (error) {
      this.logger.error(`Erro ao atualizar total do ticket ${ticketId}`, error);
    }
  }

  /**
   * Busca todos os timesheets com filtros e paginação
   */
  async findAll(query: QueryTimesheetDto): Promise<PaginatedResult<Timesheet>> {
    const {
      page = 1,
      perPage = 20,
      ticket_id,
      user_id,
      type,
      billing_type,
      billable,
      approved,
      invoiced,
      sync_status,
      start_date,
      end_date,
      sortBy = 'start_time',
      sortOrder = 'DESC',
    } = query;

    const cacheKey = `timesheets:list:${JSON.stringify(query)}`;

    try {
      const cached = await this.cacheManager.get<PaginatedResult<Timesheet>>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for ${cacheKey}`);
        return cached;
      }

      const queryBuilder = this.timesheetsRepository
        .createQueryBuilder('timesheet')
        .leftJoinAndSelect('timesheet.ticket', 'ticket')
        .leftJoinAndSelect('timesheet.user', 'user');

      // Aplicar filtros
      if (ticket_id) {
        queryBuilder.andWhere('timesheet.ticket_id = :ticket_id', { ticket_id });
      }

      if (user_id) {
        queryBuilder.andWhere('timesheet.user_id = :user_id', { user_id });
      }

      if (type) {
        queryBuilder.andWhere('timesheet.type = :type', { type });
      }

      if (billing_type) {
        queryBuilder.andWhere('timesheet.billing_type = :billing_type', { billing_type });
      }

      if (billable !== undefined) {
        queryBuilder.andWhere('timesheet.billable = :billable', { billable });
      }

      if (approved !== undefined) {
        queryBuilder.andWhere('timesheet.approved = :approved', { approved });
      }

      if (invoiced !== undefined) {
        queryBuilder.andWhere('timesheet.invoiced = :invoiced', { invoiced });
      }

      if (sync_status) {
        queryBuilder.andWhere('timesheet.sync_status = :sync_status', { sync_status });
      }

      if (start_date && end_date) {
        queryBuilder.andWhere('timesheet.start_time BETWEEN :start_date AND :end_date', {
          start_date,
          end_date,
        });
      } else if (start_date) {
        queryBuilder.andWhere('timesheet.start_time >= :start_date', { start_date });
      } else if (end_date) {
        queryBuilder.andWhere('timesheet.start_time <= :end_date', { end_date });
      }

      // Paginação
      const skip = (page - 1) * perPage;
      queryBuilder.skip(skip).take(perPage);

      // Ordenação
      const orderColumn = `timesheet.${sortBy}`;
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

      // Cache por 1 minuto
      await this.cacheManager.set(cacheKey, result, 60);

      return result;
    } catch (error) {
      this.logger.error('Erro ao buscar timesheets', error);
      throw error;
    }
  }

  /**
   * Busca um timesheet por ID
   */
  async findOne(id: string): Promise<Timesheet> {
    try {
      const timesheet = await this.timesheetsRepository.findOne({
        where: { id },
        relations: ['ticket', 'user'],
      });

      if (!timesheet) {
        throw new NotFoundException(`Timesheet ${id} não encontrado`);
      }

      return timesheet;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Erro ao buscar timesheet ${id}`, error);
      throw new BadRequestException('Erro ao buscar timesheet');
    }
  }

  /**
   * Atualiza um timesheet
   */
  async update(id: string, updateTimesheetDto: UpdateTimesheetDto): Promise<Timesheet> {
    try {
      const timesheet = await this.findOne(id);

      // Se já foi faturado, não pode alterar
      if (timesheet.invoiced) {
        throw new BadRequestException('Timesheet já faturado não pode ser alterado');
      }

      // Recalcular duração se necessário
      if (updateTimesheetDto.start_time || updateTimesheetDto.end_time) {
        const start = new Date(updateTimesheetDto.start_time || timesheet.start_time);
        const end = new Date(updateTimesheetDto.end_time || timesheet.end_time);

        if (end) {
          let duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));

          // Subtrair pausas
          const pauseDuration = updateTimesheetDto.pause_duration ?? timesheet.pause_duration;
          if (pauseDuration) {
            duration -= pauseDuration;
          }

          updateTimesheetDto.duration = duration;
        }
      }

      // Recalcular valores se necessário
      if (updateTimesheetDto.duration || updateTimesheetDto.unit_price) {
        const duration = updateTimesheetDto.duration ?? timesheet.duration ?? 0;
        const unit_price = updateTimesheetDto.unit_price ?? timesheet.unit_price;
        const hours = duration / 60;
        updateTimesheetDto.total_amount = Number((unit_price * hours).toFixed(2));
      }

      Object.assign(timesheet, updateTimesheetDto);

      const updatedTimesheet = await this.timesheetsRepository.save(timesheet);

      // Emitir evento
      this.eventEmitter.emit('timesheet.updated', updatedTimesheet);

      // Atualizar total do ticket
      await this.updateTicketTotal(timesheet.ticket_id);

      // Invalidar cache
      await this.invalidateCache();

      this.logger.log(`Timesheet ${id} atualizado`);

      return updatedTimesheet;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Erro ao atualizar timesheet ${id}`, error);
      throw new BadRequestException('Erro ao atualizar timesheet');
    }
  }

  /**
   * Aprovar timesheet
   */
  async approve(id: string, approvedById: string): Promise<Timesheet> {
    try {
      const timesheet = await this.findOne(id);

      timesheet.approved = true;
      timesheet.approved_by_id = approvedById;
      timesheet.approved_at = new Date();

      const updatedTimesheet = await this.timesheetsRepository.save(timesheet);

      this.eventEmitter.emit('timesheet.approved', updatedTimesheet);

      await this.invalidateCache();

      this.logger.log(`Timesheet ${id} aprovado por ${approvedById}`);

      return updatedTimesheet;
    } catch (error) {
      this.logger.error(`Erro ao aprovar timesheet ${id}`, error);
      throw error;
    }
  }

  /**
   * Finalizar timesheet em andamento
   */
  async stop(id: string): Promise<Timesheet> {
    try {
      const timesheet = await this.findOne(id);

      if (timesheet.end_time) {
        throw new BadRequestException('Timesheet já foi finalizado');
      }

      const end_time = new Date();
      const start = new Date(timesheet.start_time);
      let duration = Math.round((end_time.getTime() - start.getTime()) / (1000 * 60));

      // Subtrair pausas
      if (timesheet.pause_duration) {
        duration -= timesheet.pause_duration;
      }

      // Recalcular valores
      const hours = duration / 60;
      const total_amount = Number((timesheet.unit_price * hours).toFixed(2));

      timesheet.end_time = end_time;
      timesheet.duration = duration;
      timesheet.total_amount = total_amount;

      const updatedTimesheet = await this.timesheetsRepository.save(timesheet);

      this.eventEmitter.emit('timesheet.stopped', updatedTimesheet);

      await this.updateTicketTotal(timesheet.ticket_id);
      await this.invalidateCache();

      this.logger.log(`Timesheet ${id} finalizado - ${duration} minutos`);

      return updatedTimesheet;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Erro ao finalizar timesheet ${id}`, error);
      throw new BadRequestException('Erro ao finalizar timesheet');
    }
  }

  /**
   * Busca timesheets por ticket
   */
  async findByTicket(ticketId: string, query: QueryTimesheetDto = {}): Promise<PaginatedResult<Timesheet>> {
    return this.findAll({ ...query, ticket_id: ticketId });
  }

  /**
   * Busca timesheets por usuário
   */
  async findByUser(userId: string, query: QueryTimesheetDto = {}): Promise<PaginatedResult<Timesheet>> {
    return this.findAll({ ...query, user_id: userId });
  }

  /**
   * Busca timesheets não aprovados
   */
  async findUnapproved(query: QueryTimesheetDto = {}): Promise<PaginatedResult<Timesheet>> {
    return this.findAll({ ...query, approved: false });
  }

  /**
   * Busca timesheets não faturados
   */
  async findUninvoiced(query: QueryTimesheetDto = {}): Promise<PaginatedResult<Timesheet>> {
    return this.findAll({ ...query, invoiced: false, billable: true });
  }

  /**
   * Estatísticas de timesheets
   */
  async getStats(userId?: string, startDate?: string, endDate?: string) {
    const queryBuilder = this.timesheetsRepository.createQueryBuilder('timesheet');

    if (userId) {
      queryBuilder.where('timesheet.user_id = :userId', { userId });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere('timesheet.start_time BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const total = await queryBuilder.getCount();

    const totalMinutes = await queryBuilder
      .select('SUM(timesheet.duration)', 'total')
      .getRawOne();

    const totalAmount = await queryBuilder
      .select('SUM(timesheet.total_amount)', 'total')
      .getRawOne();

    const byType = await queryBuilder
      .select('timesheet.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(timesheet.duration)', 'minutes')
      .groupBy('timesheet.type')
      .getRawMany();

    const byBillingType = await queryBuilder
      .select('timesheet.billing_type', 'billing_type')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(timesheet.total_amount)', 'amount')
      .groupBy('timesheet.billing_type')
      .getRawMany();

    const unapproved = await queryBuilder
      .where('timesheet.approved = :approved', { approved: false })
      .getCount();

    const uninvoiced = await queryBuilder
      .where('timesheet.invoiced = :invoiced', { invoiced: false })
      .andWhere('timesheet.billable = :billable', { billable: true })
      .getCount();

    return {
      total,
      totalMinutes: Number(totalMinutes?.total || 0),
      totalHours: Number((Number(totalMinutes?.total || 0) / 60).toFixed(2)),
      totalAmount: Number(totalAmount?.total || 0),
      byType,
      byBillingType,
      unapproved,
      uninvoiced,
    };
  }

  /**
   * Remove um timesheet
   */
  async remove(id: string): Promise<void> {
    try {
      const timesheet = await this.findOne(id);

      if (timesheet.invoiced) {
        throw new BadRequestException('Timesheet já faturado não pode ser removido');
      }

      const ticketId = timesheet.ticket_id;

      await this.timesheetsRepository.remove(timesheet);

      this.eventEmitter.emit('timesheet.deleted', timesheet);

      // Atualizar total do ticket
      await this.updateTicketTotal(ticketId);

      await this.invalidateCache();

      this.logger.log(`Timesheet ${id} removido`);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Erro ao remover timesheet ${id}`, error);
      throw error;
    }
  }

  /**
   * Invalida o cache
   */
  private async invalidateCache(): Promise<void> {
    this.logger.debug('Cache de timesheets invalidado');
  }
}
