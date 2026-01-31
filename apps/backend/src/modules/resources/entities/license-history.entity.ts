import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ResourceLicense } from './resource-license.entity';
import { Resource } from './resource.entity';

export enum LicenseHistoryEventType {
  CREATED = 'created',
  UPDATED = 'updated',
  DELETED = 'deleted',
  STATUS_CHANGED = 'status_changed',
  ASSIGNED = 'assigned',
  UNASSIGNED = 'unassigned',
  EXPIRED = 'expired',
  RENEWED = 'renewed',
  SUSPENDED = 'suspended',
  REACTIVATED = 'reactivated',
}

@Entity('license_history')
export class LicenseHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  license_id: string;

  @ManyToOne(() => ResourceLicense, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'license_id' })
  license: ResourceLicense;

  @Column({
    type: 'enum',
    enum: LicenseHistoryEventType,
  })
  event_type: LicenseHistoryEventType;

  @Column({ type: 'text', nullable: true })
  event_description: string;

  // Dados antes da alteração (JSON)
  @Column({ type: 'jsonb', nullable: true })
  old_data: Record<string, any>;

  // Dados depois da alteração (JSON)
  @Column({ type: 'jsonb', nullable: true })
  new_data: Record<string, any>;

  // Recurso relacionado (para eventos de assign/unassign)
  @Column({ type: 'uuid', nullable: true })
  resource_id: string;

  @ManyToOne(() => Resource, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'resource_id' })
  resource: Resource;

  // Usuário que realizou a ação
  @Column({ type: 'varchar', length: 100, nullable: true })
  changed_by_user_id: string;

  // Indica se a alteração foi automática (ex: expiração por cron)
  @Column({ type: 'boolean', default: false })
  is_automatic: boolean;

  // IP de origem (se aplicável)
  @Column({ type: 'varchar', length: 45, nullable: true })
  ip_address: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
