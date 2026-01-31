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
import { Checklist, ChecklistFieldType, ChecklistFieldOption } from './checklist.entity';
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

  // Se o checklist é obrigatório (snapshot do template)
  @Column({ type: 'boolean', default: false })
  is_mandatory: boolean;

  // Items/Campos com valores preenchidos
  @Column({ type: 'jsonb' })
  items: ChecklistFieldInstance[];

  // Progresso (campos obrigatórios preenchidos / total de campos obrigatórios)
  @Column({ type: 'int', default: 0 })
  completed_items: number;

  @Column({ type: 'int', default: 0 })
  total_items: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  completion_percent: number;

  @Column({ type: 'boolean', default: false })
  is_completed: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  completed_at: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @Column({ type: 'uuid' })
  created_by_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by_id' })
  created_by: User;
}

/**
 * Instância de um campo do checklist com seu valor preenchido
 */
export interface ChecklistFieldInstance {
  id: string;
  label: string;
  description?: string;
  type: ChecklistFieldType;
  order: number;
  required: boolean;
  options?: ChecklistFieldOption[];  // Opções disponíveis (para campos de escolha)
  placeholder?: string;

  // Valor preenchido
  value?: ChecklistFieldValue;

  // Metadados de preenchimento
  is_filled: boolean;           // Se o campo foi preenchido
  filled_at?: Date;             // Quando foi preenchido
  filled_by_id?: string;        // Quem preencheu
  filled_by_name?: string;      // Nome de quem preencheu

  // Campos legados para compatibilidade
  is_completed?: boolean;       // Alias para is_filled (checkbox)
  completed_at?: Date;
  completed_by_id?: string;
  completed_by_name?: string;
  notes?: string;
}

/**
 * Valor de um campo do checklist (varia por tipo)
 */
export type ChecklistFieldValue =
  | string           // text, paragraph
  | boolean          // checkbox
  | number           // number, currency
  | string[]         // multiple_choice (array de IDs selecionados)
  | string           // single_choice (ID selecionado)
  | Date             // date
  | FileValue;       // file

/**
 * Valor para campo de arquivo
 */
export interface FileValue {
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_at: Date;
}

/**
 * Tipo legado para compatibilidade (alias)
 * @deprecated Use ChecklistFieldInstance
 */
export type ChecklistItem = ChecklistFieldInstance;
