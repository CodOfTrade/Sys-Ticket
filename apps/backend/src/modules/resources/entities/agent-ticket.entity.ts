import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Ticket } from '../../tickets/entities/ticket.entity';
import { Resource } from './resource.entity';

@Entity('agent_tickets')
export class AgentTicket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Ticket, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  @Column()
  ticket_id: string;

  @ManyToOne(() => Resource, resource => resource.agent_tickets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'resource_id' })
  resource: Resource;

  @Column()
  resource_id: string;

  @Column({ type: 'varchar', length: 100 })
  agent_id: string;

  // Dados do usuário
  @Column({ type: 'varchar', length: 255, nullable: true })
  machine_name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  user_name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  user_email: string;

  // Screenshot
  @Column({ type: 'boolean', default: false })
  has_screenshot: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  screenshot_path: string;

  // Informações técnicas no momento da abertura
  @Column({ type: 'jsonb', nullable: true })
  system_info: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;
}
