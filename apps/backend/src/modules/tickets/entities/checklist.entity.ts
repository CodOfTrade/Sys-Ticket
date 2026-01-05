import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { ServiceDesk } from '../../service-desks/entities/service-desk.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Template de checklist que pode ser reutilizado em múltiplos tickets
 */
@Entity('checklists')
export class Checklist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'uuid' })
  service_desk_id: string;

  @ManyToOne(() => ServiceDesk)
  @JoinColumn({ name: 'service_desk_id' })
  service_desk: ServiceDesk;

  // Items do checklist (JSON array)
  @Column({ type: 'jsonb' })
  items: ChecklistItemTemplate[];

  // Ordem de exibição
  @Column({ type: 'int', default: 0 })
  display_order: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  // Categoria para organização
  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string;

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

export interface ChecklistItemTemplate {
  id: string;
  title: string;
  description?: string;
  order: number;
  required?: boolean;
}
