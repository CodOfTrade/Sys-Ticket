import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { TicketAppointment, ServiceCoverageType } from '../entities/ticket-appointment.entity';
import { TicketComment, CommentType, CommentVisibility } from '../entities/ticket-comment.entity';
import {
  CreateAppointmentDto,
  StartTimerDto,
  StopTimerDto,
  UpdateAppointmentDto,
} from '../dto/create-appointment.dto';
import { PricingConfigService } from '../../service-desks/services/pricing-config.service';
import { ServiceType } from '../../service-desks/entities/pricing-config.entity';

@Injectable()
export class TicketAppointmentsService {
  private readonly logger = new Logger(TicketAppointmentsService.name);

  constructor(
    @InjectRepository(TicketAppointment)
    private appointmentRepository: Repository<TicketAppointment>,
    @InjectRepository(TicketComment)
    private commentRepository: Repository<TicketComment>,
    private pricingConfigService: PricingConfigService,
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

    return this.appointmentRepository.save(appointment);
  }

  /**
   * Iniciar timer de apontamento
   */
  async startTimer(userId: string, dto: StartTimerDto) {
    this.logger.log(`Tentando iniciar timer para userId: ${userId}`);

    // Verificar se já existe timer ativo para este usuário
    const activeTimer = await this.appointmentRepository.findOne({
      where: {
        user_id: userId,
        is_timer_based: true,
        timer_stopped_at: IsNull(),
      },
    });

    this.logger.log(`Timer ativo encontrado: ${activeTimer ? 'SIM (ID: ' + activeTimer.id + ')' : 'NÃO'}`);

    if (activeTimer) {
      throw new BadRequestException(
        'Você já possui um timer ativo. Pare o timer atual antes de iniciar um novo.',
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

    return this.appointmentRepository.save(appointment);
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

    // Atualizar descrição e anexos se fornecidos
    if (dto.description) {
      appointment.description = dto.description;
    }
    if (dto.attachment_ids) {
      appointment.attachment_ids = dto.attachment_ids;
    }

    // Calcular preço automaticamente baseado no pricing_config
    await this.calculateAndApplyPrice(appointment);

    const savedAppointment = await this.appointmentRepository.save(appointment);

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
   * Buscar timer ativo do usuário
   */
  async getActiveTimer(userId: string) {
    return this.appointmentRepository.findOne({
      where: {
        user_id: userId,
        is_timer_based: true,
        timer_stopped_at: null as any,
      },
      relations: ['ticket'],
    });
  }

  /**
   * Listar apontamentos de um ticket
   */
  async findAll(ticketId: string) {
    return this.appointmentRepository.find({
      where: { ticket_id: ticketId },
      relations: ['user', 'created_by'],
      order: { appointment_date: 'DESC', start_time: 'DESC' },
    });
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
