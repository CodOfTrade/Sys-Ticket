import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Ticket } from '../../tickets/entities/ticket.entity';

export enum ChatSenderType {
  AGENT_USER = 'agent_user',
  SUPPORT_AGENT = 'support_agent',
  SYSTEM = 'system',
}

export enum ChatMessageType {
  TEXT = 'text',
  FILE = 'file',
  IMAGE = 'image',
  SYSTEM_NOTIFICATION = 'system_notification',
}

@Entity('agent_chat_messages')
export class AgentChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Ticket, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  @Column()
  ticket_id: string;

  @Column({
    type: 'enum',
    enum: ChatSenderType,
  })
  sender_type: ChatSenderType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  sender_id: string;

  @Column({ type: 'varchar', length: 255 })
  sender_name: string;

  @Column({
    type: 'enum',
    enum: ChatMessageType,
    default: ChatMessageType.TEXT,
  })
  message_type: ChatMessageType;

  @Column({ type: 'text' })
  content: string;

  // Arquivo anexado
  @Column({ type: 'varchar', length: 500, nullable: true })
  attachment_url: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  attachment_filename: string;

  @Column({ type: 'integer', nullable: true })
  attachment_size: number;

  // Status de leitura
  @Column({ type: 'boolean', default: false })
  is_read: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  read_at: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
