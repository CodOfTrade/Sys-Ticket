import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Ticket } from './ticket.entity';
import { User } from '../../users/entities/user.entity';

export enum HistoryAction {
  CREATED = 'created',
  UPDATED = 'updated',
  DELETED = 'deleted',
  COMMENTED = 'commented',
  STATUS_CHANGED = 'status_changed',
  ASSIGNED = 'assigned',
  UNASSIGNED = 'unassigned',
  PRIORITY_CHANGED = 'priority_changed',
  CLIENT_CHANGED = 'client_changed',
  REQUESTER_CHANGED = 'requester_changed',
  APPOINTMENT_ADDED = 'appointment_added',
  VALUATION_ADDED = 'valuation_added',
  VALUATION_APPROVED = 'valuation_approved',
  VALUATION_REJECTED = 'valuation_rejected',
  CHECKLIST_ADDED = 'checklist_added',
  CHECKLIST_COMPLETED = 'checklist_completed',
  APPROVAL_REQUESTED = 'approval_requested',
  APPROVAL_APPROVED = 'approval_approved',
  APPROVAL_REJECTED = 'approval_rejected',
  APPROVAL_CANCELLED = 'approval_cancelled',
}

@Entity('ticket_history')
export class TicketHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  ticket_id: string;

  @ManyToOne(() => Ticket, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  @Column({ type: 'uuid', nullable: true })
  user_id: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({
    type: 'enum',
    enum: HistoryAction,
  })
  action: HistoryAction;

  @Column({ type: 'varchar', length: 255, nullable: true })
  field: string | null;

  @Column({ type: 'text', nullable: true })
  old_value: string | null;

  @Column({ type: 'text', nullable: true })
  new_value: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
