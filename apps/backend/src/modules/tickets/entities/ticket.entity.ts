import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ServiceDesk } from '../../service-desks/entities/service-desk.entity';
import { Timesheet } from '../../timesheets/entities/timesheet.entity';

export enum TicketStatus {
  NEW = 'new',
  IN_PROGRESS = 'in_progress',
  WAITING_CLIENT = 'waiting_client',
  WAITING_THIRD_PARTY = 'waiting_third_party',
  PAUSED = 'paused',
  WAITING_APPROVAL = 'waiting_approval',
  RESOLVED = 'resolved',
  READY_TO_INVOICE = 'ready_to_invoice',
  CLOSED = 'closed',
  CANCELLED = 'cancelled',
}

export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum TicketType {
  INTERNAL = 'internal',
  REMOTE = 'remote',
  EXTERNAL = 'external',
}

export enum ContractCoverage {
  COVERED = 'covered',
  PARTIAL = 'partial',
  NOT_COVERED = 'not_covered',
  NO_CONTRACT = 'no_contract',
}

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  ticket_number: string;

  // Cliente (ID do SIGE Cloud)
  @Column({ type: 'varchar', length: 100 })
  client_id: string;

  @Column({ type: 'varchar', length: 255 })
  client_name: string;

  // Solicitante
  @Column({ type: 'varchar', length: 255 })
  requester_name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  requester_email: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  requester_phone: string;

  // Detalhes do ticket
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: TicketStatus,
    default: TicketStatus.NEW,
  })
  status: TicketStatus;

  @Column({
    type: 'enum',
    enum: TicketPriority,
    default: TicketPriority.MEDIUM,
  })
  priority: TicketPriority;

  @Column({
    type: 'enum',
    enum: TicketType,
    default: TicketType.REMOTE,
  })
  type: TicketType;

  // Categoria e tags
  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  // Mesa de serviço
  @ManyToOne(() => ServiceDesk, { nullable: false })
  @JoinColumn({ name: 'service_desk_id' })
  service_desk: ServiceDesk;

  @Column()
  service_desk_id: string;

  // Atendente responsável
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigned_to_id' })
  assigned_to: User;

  @Column({ nullable: true })
  assigned_to_id: string | null;

  // Criador do ticket
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  created_by: User;

  @Column({ nullable: true })
  created_by_id: string;

  // Contrato (ID do SIGE Cloud)
  @Column({ type: 'varchar', length: 100, nullable: true })
  contract_id: string;

  @Column({
    type: 'enum',
    enum: ContractCoverage,
    default: ContractCoverage.NO_CONTRACT,
  })
  contract_coverage: ContractCoverage;

  // SLA
  @Column({ type: 'timestamp', nullable: true })
  sla_first_response_due: Date;

  @Column({ type: 'timestamp', nullable: true })
  sla_resolution_due: Date;

  @Column({ type: 'timestamp', nullable: true })
  first_response_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  resolved_at: Date;

  @Column({ type: 'boolean', default: false })
  sla_violated: boolean;

  // Faturamento
  @Column({ type: 'boolean', default: false })
  can_invoice: boolean;

  @Column({ type: 'boolean', default: false })
  invoiced: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  invoice_id: string; // OS ID do SIGE Cloud

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_amount: number;

  // Localização (atendimentos externos)
  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  location_address: string;

  // Ticket pai (vinculação)
  @ManyToOne(() => Ticket, ticket => ticket.children, { nullable: true })
  @JoinColumn({ name: 'parent_ticket_id' })
  parent_ticket: Ticket;

  @Column({ nullable: true })
  parent_ticket_id: string;

  @OneToMany(() => Ticket, ticket => ticket.parent_ticket)
  children: Ticket[];

  // Relacionamentos
  @OneToMany(() => Timesheet, timesheet => timesheet.ticket)
  timesheets: Timesheet[];

  // Timestamps
  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  closed_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  started_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  paused_at: Date;

  // Campos customizados (JSON)
  @Column({ type: 'jsonb', nullable: true })
  custom_fields: Record<string, any>;

  // Metadados
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}
