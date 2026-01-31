import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Ticket } from './ticket.entity';
import { User } from '../../users/entities/user.entity';

@Entity('ticket_attachments')
export class TicketAttachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  ticket_id: string;

  @ManyToOne(() => Ticket)
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  // Nome original do arquivo
  @Column({ type: 'varchar', length: 500 })
  filename: string;

  // Nome do arquivo no armazenamento
  @Column({ type: 'varchar', length: 500 })
  stored_filename: string;

  // Caminho completo no armazenamento
  @Column({ type: 'text' })
  file_path: string;

  // URL pública (se aplicável)
  @Column({ type: 'text', nullable: true })
  url: string;

  // Tipo MIME do arquivo
  @Column({ type: 'varchar', length: 255 })
  mime_type: string;

  // Tamanho em bytes
  @Column({ type: 'bigint' })
  file_size: number;

  // Hash MD5 para verificação de integridade
  @Column({ type: 'varchar', length: 32, nullable: true })
  md5_hash: string;

  // Tipo de anexo
  @Column({
    type: 'enum',
    enum: ['image', 'document', 'video', 'audio', 'other'],
    default: 'other',
  })
  attachment_type: string;

  // Indica se é uma imagem inline (para comentários)
  @Column({ type: 'boolean', default: false })
  is_inline: boolean;

  // ID do comentário associado (se aplicável)
  @Column({ type: 'uuid', nullable: true })
  comment_id: string;

  // Usuário que fez upload
  @Column({ type: 'uuid' })
  uploaded_by_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploaded_by_id' })
  uploaded_by: User;

  // Miniatura (para imagens)
  @Column({ type: 'text', nullable: true })
  thumbnail_url: string;

  // Metadados adicionais
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
