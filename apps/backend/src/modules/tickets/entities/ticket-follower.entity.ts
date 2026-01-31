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

@Entity('ticket_followers')
export class TicketFollower {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  ticket_id: string;

  @ManyToOne(() => Ticket)
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  // Pode ser um usuário do sistema ou um email externo
  @Column({ type: 'uuid', nullable: true })
  user_id: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Email para seguidores externos (não usuários do sistema)
  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  // Nome do seguidor (para exibição)
  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string;

  // Tipo de notificações que o seguidor deseja receber
  @Column({ type: 'jsonb', nullable: true, default: '{}' })
  notification_preferences: {
    on_status_change?: boolean;
    on_new_comment?: boolean;
    on_assigned?: boolean;
    on_closed?: boolean;
    on_reopened?: boolean;
  };

  // Quem adicionou este seguidor
  @Column({ type: 'uuid', nullable: true })
  added_by_id: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'added_by_id' })
  added_by: User;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
