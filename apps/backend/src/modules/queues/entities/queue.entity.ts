import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { ServiceDesk } from '../../service-desks/entities/service-desk.entity';
import { User } from '../../users/entities/user.entity';
import { DistributionStrategy } from '../enums/distribution-strategy.enum';

/**
 * Fila (Queue) - Representa um grupo de atendentes que podem receber tickets
 *
 * Cada fila pertence a uma mesa de serviço e tem N membros (usuários)
 * Tickets podem ser atribuídos a uma fila e então distribuídos entre seus membros
 */
@Entity('queues')
export class Queue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Nome da fila
  @Column({ type: 'varchar', length: 255 })
  name: string;

  // Descrição da fila
  @Column({ type: 'text', nullable: true })
  description: string;

  // Mesa de serviço à qual esta fila pertence
  @Column({ type: 'uuid' })
  service_desk_id: string;

  @ManyToOne(() => ServiceDesk, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_desk_id' })
  service_desk: ServiceDesk;

  // Estratégia de distribuição de tickets
  @Column({
    type: 'enum',
    enum: DistributionStrategy,
    default: DistributionStrategy.MANUAL,
  })
  distribution_strategy: DistributionStrategy;

  // Configuração de atribuição automática
  @Column({ type: 'jsonb', nullable: true })
  auto_assignment_config: {
    enabled: boolean; // Se auto-atribuição está habilitada
    on_ticket_create: boolean; // Atribuir automaticamente ao criar ticket
    on_ticket_status_change: boolean; // Reatribuir quando status mudar
    max_tickets_per_member: number | null; // Limite de tickets por membro (null = sem limite)
    priority_weight: boolean; // Considerar prioridade do ticket na distribuição
    skills_matching: boolean; // Considerar skills/tags (futuro)
  };

  // Membros da fila (relacionamento N:N com Users)
  @ManyToMany(() => User, { eager: false })
  @JoinTable({
    name: 'queue_members',
    joinColumn: { name: 'queue_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  members: User[];

  // Estado interno para round-robin (índice do último membro que recebeu ticket)
  // Este campo não deve ser exposto na API, apenas usado internamente
  @Column({ type: 'int', default: 0 })
  round_robin_index: number;

  // Ativa/Inativa
  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  // Cor para identificação visual (hex color)
  @Column({ type: 'varchar', length: 7, nullable: true, default: '#3B82F6' })
  color: string;

  // Ordem de exibição
  @Column({ type: 'int', default: 0 })
  display_order: number;

  // Timestamps
  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
