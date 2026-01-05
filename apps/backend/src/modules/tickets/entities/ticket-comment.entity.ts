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

export enum CommentType {
  CLIENT = 'client', // Visível para o cliente
  INTERNAL = 'internal', // Apenas equipe interna
  CHAT = 'chat', // Chat interno da equipe
}

export enum CommentVisibility {
  PUBLIC = 'public', // Visível no portal do cliente
  PRIVATE = 'private', // Apenas equipe interna
}

@Entity('ticket_comments')
export class TicketComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  ticket_id: string;

  @ManyToOne(() => Ticket, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: CommentType,
    default: CommentType.INTERNAL,
  })
  type: CommentType;

  @Column({
    type: 'enum',
    enum: CommentVisibility,
    default: CommentVisibility.PRIVATE,
  })
  visibility: CommentVisibility;

  // Indica se foi enviado como resposta ao cliente
  @Column({ type: 'boolean', default: false })
  sent_to_client: boolean;

  @Column({ type: 'timestamp', nullable: true })
  sent_at: Date;

  // Anexos associados ao comentário
  @Column({ type: 'simple-array', nullable: true })
  attachment_ids: string[];

  // Metadados (ex: menções, formatação rica)
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: 'boolean', default: false })
  is_edited: boolean;

  @Column({ type: 'timestamp', nullable: true })
  edited_at: Date;
}
