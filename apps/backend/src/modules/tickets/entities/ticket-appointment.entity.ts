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

  // Descrição do trabalho realizado
  @Column({ type: 'text', nullable: true })
  description: string;

  // Valores
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  unit_price: number; // Preço por hora

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_amount: number; // Valor total do apontamento

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
