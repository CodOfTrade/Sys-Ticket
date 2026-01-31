import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Ticket } from '../../tickets/entities/ticket.entity';
import { User } from '../../users/entities/user.entity';

export enum TimesheetType {
  INTERNAL = 'internal',
  REMOTE = 'remote',
  EXTERNAL = 'external',
}

export enum BillingType {
  CONTRACT = 'contract',
  EXTRA = 'extra',
  WARRANTY = 'warranty',
  MANUAL = 'manual',
}

export enum SyncStatus {
  PENDING = 'pending',
  SYNCED = 'synced',
  ERROR = 'error',
}

@Entity('timesheets')
export class Timesheet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Ticket, ticket => ticket.timesheets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  @Column()
  ticket_id: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  user_id: string;

  // Tempo
  @Column({ type: 'timestamptz' })
  start_time: Date;

  @Column({ type: 'timestamptz', nullable: true })
  end_time: Date;

  @Column({ type: 'integer', nullable: true })
  duration: number; // em minutos

  // Tipo
  @Column({
    type: 'enum',
    enum: TimesheetType,
    default: TimesheetType.REMOTE,
  })
  type: TimesheetType;

  // Valorização
  @Column({ type: 'boolean', default: true })
  billable: boolean;

  @Column({
    type: 'enum',
    enum: BillingType,
    default: BillingType.EXTRA,
  })
  billing_type: BillingType;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  unit_price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_amount: number;

  // Descrição
  @Column({ type: 'text', nullable: true })
  description: string;

  // GPS (atendimentos externos)
  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  start_latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  start_longitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  end_latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  end_longitude: number;

  // Sincronização offline
  @Column({
    type: 'enum',
    enum: SyncStatus,
    default: SyncStatus.SYNCED,
  })
  sync_status: SyncStatus;

  @Column({ type: 'timestamptz', nullable: true })
  synced_at: Date;

  // Aprovação
  @Column({ type: 'boolean', default: false })
  approved: boolean;

  @Column({ type: 'uuid', nullable: true })
  approved_by_id: string;

  @Column({ type: 'timestamptz', nullable: true })
  approved_at: Date;

  // Faturamento
  @Column({ type: 'boolean', default: false })
  invoiced: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  invoice_id: string; // ID da OS no SIGE Cloud

  // Pausas
  @Column({ type: 'integer', default: 0 })
  pause_duration: number; // em minutos

  // Metadados
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
