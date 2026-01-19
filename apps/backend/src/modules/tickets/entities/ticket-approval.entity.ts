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
import { ClientContact } from '../../clients/entities/client-contact.entity';

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

@Entity('ticket_approvals')
export class TicketApproval {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Ticket sendo aprovado
  @Column({ type: 'uuid' })
  ticket_id: string;

  @ManyToOne(() => Ticket, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  // Status da aprovação
  @Column({
    type: 'enum',
    enum: ApprovalStatus,
    default: ApprovalStatus.PENDING,
  })
  status: ApprovalStatus;

  // Contato do cliente (solicitante registrado) - opcional
  @Column({ type: 'uuid', nullable: true })
  contact_id: string | null;

  @ManyToOne(() => ClientContact, { nullable: true })
  @JoinColumn({ name: 'contact_id' })
  contact: ClientContact | null;

  // Email do aprovador (sempre preenchido)
  @Column({ type: 'varchar', length: 255 })
  approver_email: string;

  // Nome do aprovador (opcional para email manual)
  @Column({ type: 'varchar', length: 255, nullable: true })
  approver_name: string | null;

  // Token seguro para link de aprovação
  @Column({ type: 'varchar', length: 128, unique: true })
  approval_token: string;

  // Hash do token para verificação adicional
  @Column({ type: 'varchar', length: 64 })
  token_hash: string;

  // Data de expiração do token (48h)
  @Column({ type: 'timestamp' })
  expires_at: Date;

  // Comentário do aprovador
  @Column({ type: 'text', nullable: true })
  comment: string | null;

  // Data da resposta
  @Column({ type: 'timestamp', nullable: true })
  responded_at: Date | null;

  // IP do aprovador (auditoria)
  @Column({ type: 'varchar', length: 45, nullable: true })
  response_ip: string | null;

  // Usuário que solicitou a aprovação
  @Column({ type: 'uuid' })
  requested_by_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'requested_by_id' })
  requested_by: User;

  // Controle de envio de email
  @Column({ type: 'boolean', default: false })
  email_sent: boolean;

  @Column({ type: 'timestamp', nullable: true })
  email_sent_at: Date | null;

  @Column({ type: 'integer', default: 0 })
  email_retry_count: number;

  // Mensagem personalizada enviada no email
  @Column({ type: 'text', nullable: true })
  custom_message: string | null;

  // Metadata adicional (JSON)
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
