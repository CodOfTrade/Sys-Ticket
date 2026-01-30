import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Ticket } from './ticket.entity';
import { User } from '../../users/entities/user.entity';
import { PricingConfig } from '../../service-desks/entities/pricing-config.entity';
import { ServiceModality } from '../../service-desks/enums/service-modality.enum';

export enum AppointmentType {
  SERVICE = 'service', // Atendimento
  TRAVEL = 'travel', // Deslocamento
  MEETING = 'meeting', // Reunião
  ANALYSIS = 'analysis', // Análise
}

export enum ServiceCoverageType {
  CONTRACT = 'contract', // Coberto por contrato
  WARRANTY = 'warranty', // Garantia
  BILLABLE = 'billable', // Faturável
  INTERNAL = 'internal', // Interno (não faturável)
}

// ServiceLevel removido - N1/N2 agora faz parte do nome da classificação
// Ex: "Atendimento avulso N1", "Atendimento avulso N2", etc

@Entity('ticket_appointments')
export class TicketAppointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  ticket_id: string;

  @ManyToOne(() => Ticket, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  // Atendente responsável
  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Data e hora do apontamento
  @Column({ type: 'date' })
  appointment_date: Date;

  @Column({ type: 'time' })
  start_time: string;

  @Column({ type: 'time' })
  end_time: string;

  // Duração calculada em minutos
  @Column({ type: 'int' })
  duration_minutes: number;

  // Tipo de apontamento
  @Column({
    type: 'enum',
    enum: AppointmentType,
    default: AppointmentType.SERVICE,
  })
  type: AppointmentType;

  // Tipo de cobertura/faturamento
  @Column({
    type: 'enum',
    enum: ServiceCoverageType,
    default: ServiceCoverageType.CONTRACT,
  })
  coverage_type: ServiceCoverageType;

  // ===== NOVA ESTRUTURA DE PRECIFICAÇÃO =====

  /**
   * ID da classificação de atendimento escolhida
   * FK para pricing_configs
   * Ex: "Atendimento avulso N1", "Suporte DBA", etc
   */
  @Column({ type: 'uuid', nullable: true })
  pricing_config_id: string;

  @ManyToOne(() => PricingConfig)
  @JoinColumn({ name: 'pricing_config_id' })
  pricing_config: PricingConfig;

  /**
   * Modalidade do atendimento (INTERNO, REMOTO ou EXTERNO)
   * Usado para buscar a configuração de preço específica
   * dentro do pricing_config
   */
  @Column({
    type: 'enum',
    enum: ServiceModality,
    nullable: true,
  })
  service_modality: ServiceModality;

  // Descrição do trabalho realizado
  @Column({ type: 'text', nullable: true })
  description: string;

  // Valores
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  unit_price: number; // Preço por hora

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_amount: number; // Valor total do apontamento

  // Override manual de preço (permite editar valor manualmente)
  @Column({ type: 'boolean', default: false })
  manual_price_override: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  manual_unit_price: number; // Preço por hora definido manualmente

  // Garantia (zera o valor)
  @Column({ type: 'boolean', default: false })
  is_warranty: boolean;

  // Deslocamento (para apontamentos externos)
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  travel_distance_km: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  travel_cost: number;

  // Timer (para apontamentos com play/pause)
  @Column({ type: 'boolean', default: false })
  is_timer_based: boolean;

  @Column({ type: 'timestamp', nullable: true })
  timer_started_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  timer_stopped_at: Date;

  // Contrato/Serviço avulso associado
  @Column({ type: 'varchar', length: 100, nullable: true })
  contract_id: string; // ID do contrato no SIGE Cloud

  @Column({ type: 'varchar', length: 100, nullable: true })
  service_order_id: string; // ID da OS no SIGE Cloud

  // Aprovação (para serviços que necessitam)
  @Column({ type: 'boolean', default: false })
  requires_approval: boolean;

  @Column({ type: 'boolean', default: false })
  is_approved: boolean;

  @Column({ type: 'uuid', nullable: true })
  approved_by_id: string;

  @Column({ type: 'timestamp', nullable: true })
  approved_at: Date;

  // Anexos (fotos, documentos)
  @Column({ type: 'simple-array', nullable: true })
  attachment_ids: string[];

  // Enviar como resposta ao cliente (criar comentário público)
  @Column({ type: 'boolean', default: false, nullable: true })
  send_as_response: boolean;

  // Metadados
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: 'uuid', nullable: true })
  created_by_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by_id' })
  created_by: User;
}
