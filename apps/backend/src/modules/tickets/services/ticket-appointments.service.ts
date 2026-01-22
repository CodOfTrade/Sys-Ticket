import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In } from 'typeorm';
import { TicketAppointment, ServiceCoverageType } from '../entities/ticket-appointment.entity';
import { TicketComment, CommentType, CommentVisibility } from '../entities/ticket-comment.entity';
import { Ticket, TicketStatus } from '../entities/ticket.entity';
import { TicketAttachment } from '../entities/ticket-attachment.entity';
import {
  CreateAppointmentDto,
  StartTimerDto,
  StopTimerDto,
  UpdateAppointmentDto,
} from '../dto/create-appointment.dto';
import { PricingConfigService } from '../../service-desks/services/pricing-config.service';
import { ServiceType, PricingConfig } from '../../service-desks/entities/pricing-config.entity';
import { TicketHistoryService } from './ticket-history.service';
import { HistoryAction } from '../entities/ticket-history.entity';

@Injectable()
export class TicketAppointmentsService {
  private readonly logger = new Logger(TicketAppointmentsService.name);

  constructor(
    @InjectRepository(TicketAppointment)
    private appointmentRepository: Repository<TicketAppointment>,
    @InjectRepository(TicketComment)
    private commentRepository: Repository<TicketComment>,
    @InjectRepository(Ticket)
    private ticketsRepository: Repository<Ticket>,
    @InjectRepository(PricingConfig)
    private pricingRepository: Repository<PricingConfig>,
    @InjectRepository(TicketAttachment)
    private attachmentRepository: Repository<TicketAttachment>,
    private pricingConfigService: PricingConfigService,
    private ticketHistoryService: TicketHistoryService,
  ) {}

  /**
   * Criar apontamento manual
   */
  async create(userId: string, dto: CreateAppointmentDto) {
    // Calcular duração em minutos
    const duration = this.calculateDuration(dto.start_time, dto.end_time);

    const appointment = this.appointmentRepository.create({
      ...dto,
      user_id: userId,
      created_by_id: userId,
      duration_minutes: duration,
      is_timer_based: false,
    });

    // Calcular valor total
    if (dto.unit_price) {
      const hours = duration / 60;
      appointment.total_amount = hours * dto.unit_price;
    }

    const savedAppointment = await this.appointmentRepository.save(appointment);

    // Registrar no histórico
    try {
      const hours = Math.floor(duration / 60);
      const minutes = duration % 60;
      const durationText = `${hours}h ${minutes.toString().padStart(2, '0')}m`;
      await this.ticketHistoryService.recordHistory({
        ticket_id: dto.ticket_id,
        user_id: userId,
        action: HistoryAction.APPOINTMENT_ADDED,
        description: `Apontamento manual registrado: ${durationText}`,
      });
    } catch (error) {
      this.logger.warn(`Erro ao registrar apontamento no histórico: ${error.message}`);
    }

    return savedAppointment;
  }

  /**
   * Iniciar timer de apontamento
   */
  async startTimer(userId: string, dto: StartTimerDto) {
    this.logger.log(`Tentando iniciar timer para userId: ${userId}, ticketId: ${dto.ticket_id}`);

    // Verificar se já existe timer ativo para este usuário NESTE TICKET
    const activeTimerInTicket = await this.appointmentRepository.findOne({
      where: {
        user_id: userId,
        ticket_id: dto.ticket_id,
        is_timer_based: true,
        timer_stopped_at: IsNull(),
      },
    });

    this.logger.log(`Timer ativo neste ticket: ${activeTimerInTicket ? 'SIM (ID: ' + activeTimerInTicket.id + ')' : 'NÃO'}`);

    if (activeTimerInTicket) {
      throw new BadRequestException(
        'Você já possui um timer ativo neste ticket. Pare o timer atual antes de iniciar um novo.',
      );
    }

    const appointment = this.appointmentRepository.create({
      ticket_id: dto.ticket_id,
      user_id: userId,
      created_by_id: userId,
      type: dto.type,
      coverage_type: dto.coverage_type,
      service_type: dto.service_type || ServiceType.REMOTE,
      appointment_date: new Date().toISOString().split('T')[0],
      start_time: new Date().toTimeString().slice(0, 5),
      end_time: new Date().toTimeString().slice(0, 5),
      duration_minutes: 0,
      is_timer_based: true,
      timer_started_at: new Date(),
      unit_price: 0,
      total_amount: 0,
    });

    const savedAppointment = await this.appointmentRepository.save(appointment);
    this.logger.log(`Timer salvo com sucesso: ${savedAppointment.id}`);

    // Atualizar status do ticket para "Em Andamento" quando timer iniciar
    try {
      this.logger.log(`Atualizando status do ticket ${dto.ticket_id} para IN_PROGRESS...`);
      const updateResult = await this.ticketsRepository.update(dto.ticket_id, {
        status: TicketStatus.IN_PROGRESS,
      });
      this.logger.log(`Resultado da atualização: ${JSON.stringify(updateResult)}`);
    } catch (error) {
      this.logger.error(`Erro ao atualizar status do ticket: ${error.message}`, error.stack);
    }

    return savedAppointment;
  }

  /**
   * Parar timer e finalizar apontamento
   */
  async stopTimer(userId: string, dto: StopTimerDto) {
    const appointment = await this.appointmentRepository.findOne({
      where: { id: dto.appointment_id, user_id: userId },
      relations: ['ticket', 'ticket.service_desk'],
    });

    if (!appointment) {
      throw new NotFoundException('Apontamento não encontrado');
    }

    if (!appointment.is_timer_based) {
      throw new BadRequestException('Este apontamento não possui timer');
    }

    if (appointment.timer_stopped_at) {
      throw new BadRequestException('Este timer já foi parado');
    }

    const now = new Date();
    appointment.timer_stopped_at = now;
    appointment.end_time = now.toTimeString().slice(0, 5);

    // Calcular duração total em minutos
    const startTime = new Date(appointment.timer_started_at);
    const duration = Math.round((now.getTime() - startTime.getTime()) / (1000 * 60));
    appointment.duration_minutes = duration;

    // Atualizar campos do formulário (obrigatórios)
    appointment.service_type = dto.service_type;
    appointment.coverage_type = dto.coverage_type;
    appointment.send_as_response = dto.send_as_response || false;

    // Novos campos opcionais
    if (dto.service_level) {
      appointment.service_level = dto.service_level;
    }
    if (dto.is_warranty !== undefined) {
      appointment.is_warranty = dto.is_warranty;
    }
    if (dto.manual_price_override !== undefined) {
      appointment.manual_price_override = dto.manual_price_override;
    }
    if (dto.manual_unit_price !== undefined) {
      appointment.manual_unit_price = dto.manual_unit_price;
    }

    // Atualizar descrição e anexos se fornecidos
    if (dto.description) {
      appointment.description = dto.description;
    }
    if (dto.attachment_ids) {
      appointment.attachment_ids = dto.attachment_ids;
    }

    // Calcular preço automaticamente (considera garantia e override manual)
    await this.calculateAndApplyPrice(appointment);

    const savedAppointment = await this.appointmentRepository.save(appointment);

    // Registrar no histórico
    try {
      const hours = Math.floor(duration / 60);
      const minutes = duration % 60;
      const durationText = `${hours}h ${minutes.toString().padStart(2, '0')}m`;
      await this.ticketHistoryService.recordHistory({
        ticket_id: appointment.ticket_id,
        user_id: userId,
        action: HistoryAction.APPOINTMENT_ADDED,
        description: `Apontamento registrado: ${durationText}`,
      });
    } catch (error) {
      this.logger.warn(`Erro ao registrar apontamento no histórico: ${error.message}`);
    }

    // Criar comentário se send_as_response = true
    if (dto.send_as_response) {
      await this.createAppointmentComment(savedAppointment, userId);
    }

    return savedAppointment;
  }

  /**
   * Calcular e aplicar preço automaticamente ao apontamento
   */
  private async calculateAndApplyPrice(appointment: TicketAppointment): Promise<void> {
    try {
      // Se é garantia, zerar valores
      if (appointment.is_warranty) {
        appointment.unit_price = 0;
        appointment.total_amount = 0;
        this.logger.log(`Apontamento ${appointment.id} marcado como garantia - valores zerados`);
        return;
      }

      // Se tem override manual de preço, usar o valor manual
      if (appointment.manual_price_override && appointment.manual_unit_price !== null) {
        const hours = appointment.duration_minutes / 60;
        appointment.unit_price = appointment.manual_unit_price;
        appointment.total_amount = hours * appointment.manual_unit_price;
        this.logger.log(
          `Apontamento ${appointment.id} usando preço manual: R$ ${appointment.total_amount.toFixed(2)}`,
        );
        return;
      }

      // Buscar configuração de pricing para o service_desk e service_type
      const serviceDeskId = appointment.ticket?.service_desk_id;
      if (!serviceDeskId) {
        this.logger.warn(`Ticket ${appointment.ticket_id} não possui service_desk_id`);
        return;
      }

      const serviceType = appointment.service_type || ServiceType.REMOTE;
      const pricingConfig = await this.pricingConfigService.findByServiceDeskAndType(
        serviceDeskId,
        serviceType,
      );

      if (!pricingConfig) {
        this.logger.warn(
          `Nenhuma configuração de preço encontrada para service_desk ${serviceDeskId} e tipo ${serviceType}`,
        );
        return;
      }

      // Calcular preço
      const pricing = this.pricingConfigService.calculatePrice(
        pricingConfig,
        appointment.duration_minutes,
      );

      // Aplicar no apontamento
      appointment.unit_price = pricing.appliedRate;
      appointment.total_amount = pricing.totalPrice;

      // TODO: Aplicar multiplicador de nível (N1, N2) se necessário
      // Isso dependerá de configuração adicional no pricing_config

      this.logger.log(
        `Preço calculado para apontamento ${appointment.id}: R$ ${pricing.totalPrice.toFixed(2)} (${pricing.description})`,
      );
    } catch (error) {
      this.logger.error(`Erro ao calcular preço do apontamento ${appointment.id}`, error);
      // Não lançar erro, apenas logar e continuar
    }
  }

  /**
   * Criar comentário público a partir de um apontamento
   */
  private async createAppointmentComment(
    appointment: TicketAppointment,
    userId: string,
  ): Promise<void> {
    try {
      // Formatar labels
      const serviceTypeLabels = {
        [ServiceType.INTERNAL]: 'Interno',
        [ServiceType.REMOTE]: 'Remoto',
        [ServiceType.EXTERNAL]: 'Externo/Presencial',
      };

      const coverageTypeLabels = {
        [ServiceCoverageType.CONTRACT]: 'Contrato',
        [ServiceCoverageType.WARRANTY]: 'Garantia',
        [ServiceCoverageType.BILLABLE]: 'Avulso',
        [ServiceCoverageType.INTERNAL]: 'Interno',
      };

      // Formatar duração
      const hours = Math.floor(appointment.duration_minutes / 60);
      const minutes = appointment.duration_minutes % 60;
      const durationText = `${hours}h ${minutes.toString().padStart(2, '0')}m`;

      // Formatar data
      const dateFormatted = new Date(appointment.appointment_date).toLocaleDateString('pt-BR');

      // Montar conteúdo do comentário
      let content = `**Apontamento registrado:**\n\n`;
      content += `📅 **Data:** ${dateFormatted}\n`;
      content += `⏰ **Horário:** ${appointment.start_time} às ${appointment.end_time} (${durationText})\n`;
      content += `📍 **Classificação:** ${serviceTypeLabels[appointment.service_type]}\n`;
      content += `📋 **Tipo:** ${coverageTypeLabels[appointment.coverage_type]}\n`;

      if (appointment.description) {
        content += `\n📝 **Descrição:**\n${appointment.description}`;
      }

      // Criar comentário
      const comment = this.commentRepository.create({
        ticket_id: appointment.ticket_id,
        user_id: userId,
        content,
        type: CommentType.CLIENT,
        visibility: CommentVisibility.PUBLIC,
      });

      await this.commentRepository.save(comment);

      this.logger.log(
        `Comentário público criado para apontamento ${appointment.id} no ticket ${appointment.ticket_id}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao criar comentário para apontamento ${appointment.id}`,
        error,
      );
      // Não lançar erro, apenas logar
    }
  }

  /**
   * Buscar timer ativo do usuário (opcionalmente filtrado por ticket)
   */
  async getActiveTimer(userId: string, ticketId?: string) {
    const whereCondition: any = {
      user_id: userId,
      is_timer_based: true,
      timer_stopped_at: IsNull(),
    };

    // Se ticketId fornecido, filtrar por ticket específico
    if (ticketId) {
      whereCondition.ticket_id = ticketId;
    }

    return this.appointmentRepository.findOne({
      where: whereCondition,
      relations: ['ticket'],
    });
  }

  /**
   * Listar apontamentos de um ticket
   */
  async findAll(ticketId: string) {
    const appointments = await this.appointmentRepository.find({
      where: { ticket_id: ticketId },
      relations: ['user', 'created_by'],
      order: { appointment_date: 'DESC', start_time: 'DESC' },
    });

    // Carregar anexos para cada apontamento que possui attachment_ids
    for (const appointment of appointments) {
      if (appointment.attachment_ids && appointment.attachment_ids.length > 0) {
        const attachments = await this.attachmentRepository.find({
          where: { id: In(appointment.attachment_ids) },
        });
        (appointment as any).attachments = attachments;
      } else {
        (appointment as any).attachments = [];
      }
    }

    return appointments;
  }

  /**
   * Buscar apontamento por ID
   */
  async findOne(id: string) {
    const appointment = await this.appointmentRepository.findOne({
      where: { id },
      relations: ['user', 'ticket'],
    });

    if (!appointment) {
      throw new NotFoundException('Apontamento não encontrado');
    }

    // Carregar anexos se existirem
    if (appointment.attachment_ids && appointment.attachment_ids.length > 0) {
      const attachments = await this.attachmentRepository.find({
        where: { id: In(appointment.attachment_ids) },
      });
      (appointment as any).attachments = attachments;
    } else {
      (appointment as any).attachments = [];
    }

    return appointment;
  }

  /**
   * Atualizar apontamento
   */
  async update(id: string, userId: string, dto: UpdateAppointmentDto) {
    const appointment = await this.findOne(id);

    // Atualizar campos
    Object.assign(appointment, dto);

    // Recalcular duração se mudou horários
    if (dto.start_time || dto.end_time) {
      const startTime = dto.start_time || appointment.start_time;
      const endTime = dto.end_time || appointment.end_time;
      appointment.duration_minutes = this.calculateDuration(startTime, endTime);
    }

    // Recalcular valor total
    if (dto.unit_price || (dto.start_time || dto.end_time)) {
      const hours = appointment.duration_minutes / 60;
      appointment.total_amount = hours * (dto.unit_price || appointment.unit_price);
    }

    return this.appointmentRepository.save(appointment);
  }

  /**
   * Remover apontamento
   */
  async remove(id: string, userId: string) {
    const appointment = await this.findOne(id);
    await this.appointmentRepository.remove(appointment);
    return { success: true, message: 'Apontamento removido com sucesso' };
  }

  /**
   * Calcular duração em minutos entre dois horários (HH:MM)
   */
  private calculateDuration(startTime: string, endTime: string): number {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    return endMinutes - startMinutes;
  }

  /**
   * Calcular preço estimado de um apontamento (para preview no frontend)
   */
  async calculatePriceEstimate(dto: {
    ticket_id: string;
    start_time: string;
    end_time: string;
    service_type: ServiceType;
    coverage_type: ServiceCoverageType;
    is_warranty?: boolean;
    manual_price_override?: boolean;
    manual_unit_price?: number;
  }): Promise<{
    duration_minutes: number;
    duration_hours: number;
    unit_price: number;
    total_amount: number;
    description: string;
  }> {
    // Calcular duração
    const durationMinutes = this.calculateDuration(dto.start_time, dto.end_time);
    const durationHours = durationMinutes / 60;

    // Se é garantia, zerar valores
    if (dto.is_warranty) {
      return {
        duration_minutes: durationMinutes,
        duration_hours: durationHours,
        unit_price: 0,
        total_amount: 0,
        description: 'Garantia - Valor zerado',
      };
    }

    // Se tem override manual de preço, usar o valor manual
    if (dto.manual_price_override && dto.manual_unit_price !== null && dto.manual_unit_price !== undefined) {
      return {
        duration_minutes: durationMinutes,
        duration_hours: durationHours,
        unit_price: dto.manual_unit_price,
        total_amount: durationHours * dto.manual_unit_price,
        description: 'Valor manual definido',
      };
    }

    // Buscar ticket para pegar service_desk_id
    const ticket = await this.ticketsRepository.findOne({
      where: { id: dto.ticket_id },
      relations: ['service_desk'],
    });

    if (!ticket || !ticket.service_desk_id) {
      this.logger.warn(`Ticket ${dto.ticket_id} não encontrado ou sem service_desk_id`);
      return {
        duration_minutes: durationMinutes,
        duration_hours: durationHours,
        unit_price: 0,
        total_amount: 0,
        description: 'Configuração de preços não encontrada',
      };
    }

    // Buscar configuração de pricing
    const serviceType = dto.service_type || ServiceType.REMOTE;
    const pricingConfig = await this.pricingRepository.findOne({
      where: {
        service_desk_id: ticket.service_desk_id,
        service_type: serviceType,
      },
    });

    if (!pricingConfig) {
      this.logger.warn(
        `Configuração de preços não encontrada para service_desk ${ticket.service_desk_id} e service_type ${serviceType}`,
      );
      return {
        duration_minutes: durationMinutes,
        duration_hours: durationHours,
        unit_price: 0,
        total_amount: 0,
        description: 'Configuração de preços não encontrada',
      };
    }

    // Calcular preço usando a mesma lógica de calculatePrice
    const pricing = this.pricingConfigService.calculatePrice(
      pricingConfig,
      durationMinutes,
    );

    return {
      duration_minutes: durationMinutes,
      duration_hours: durationHours,
      unit_price: pricing.appliedRate,
      total_amount: pricing.totalPrice,
      description: pricing.description,
    };
  }

  /**
   * Calcular total de horas trabalhadas em um ticket
   */
  async getTotalHours(ticketId: string): Promise<number> {
    const appointments = await this.findAll(ticketId);
    const totalMinutes = appointments.reduce((sum, app) => sum + app.duration_minutes, 0);
    return totalMinutes / 60;
  }

  /**
   * Calcular total de custos de um ticket
   */
  async getTotalCost(ticketId: string): Promise<number> {
    const appointments = await this.findAll(ticketId);
    return appointments.reduce((sum, app) => sum + Number(app.total_amount), 0);
  }
}
