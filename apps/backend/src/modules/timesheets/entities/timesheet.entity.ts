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
  @Column({ type: 'timestamp' })
  start_time: Date;

  @Column({ type: 'timestamp', nullable: true })
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

  @Column({ type: 'timestamp', nullable: true })
  synced_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
