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
import { Checklist } from './checklist.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Instância de um checklist aplicado a um ticket específico
 */
@Entity('ticket_checklists')
export class TicketChecklist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  ticket_id: string;

  @ManyToOne(() => Ticket, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  @Column({ type: 'uuid' })
  checklist_id: string;

  @ManyToOne(() => Checklist)
  @JoinColumn({ name: 'checklist_id' })
  checklist: Checklist;

  // Nome do checklist (snapshot do template)
  @Column({ type: 'varchar', length: 255 })
  checklist_name: string;

  // Items com status de conclusão
  @Column({ type: 'jsonb' })
  items: ChecklistItem[];

  // Progresso
  @Column({ type: 'int', default: 0 })
  completed_items: number;

  @Column({ type: 'int', default: 0 })
  total_items: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  completion_percent: number;

  @Column({ type: 'boolean', default: false })
  is_completed: boolean;

  @Column({ type: 'timestamp', nullable: true })
  completed_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: 'uuid' })
  created_by_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by_id' })
  created_by: User;
}

export interface ChecklistItem {
  id: string;
  title: string;
  description?: string;
  order: number;
  required?: boolean;
  is_completed: boolean;
  completed_at?: Date;
  completed_by_id?: string;
  completed_by_name?: string;
  notes?: string;
}
