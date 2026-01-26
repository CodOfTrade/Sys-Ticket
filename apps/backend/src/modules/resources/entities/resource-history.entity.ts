import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Resource } from './resource.entity';

export enum ResourceEventType {
  CREATED = 'created',
  UPDATED = 'updated',
  ASSIGNED = 'assigned',
  STATUS_CHANGED = 'status_changed',
  AGENT_INSTALLED = 'agent_installed',
  AGENT_REMOVED = 'agent_removed',
  LICENSE_ASSIGNED = 'license_assigned',
  LICENSE_REMOVED = 'license_removed',
  RETIRED = 'retired',
  COMMAND_SENT = 'command_sent',
  COMMAND_EXECUTED = 'command_executed',
}

@Entity('resource_history')
export class ResourceHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Resource, resource => resource.history, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'resource_id' })
  resource: Resource;

  @Column()
  resource_id: string;

  @Column({
    type: 'enum',
    enum: ResourceEventType,
  })
  event_type: ResourceEventType;

  @Column({ type: 'text', nullable: true })
  event_description: string;

  @Column({ type: 'jsonb', nullable: true })
  old_data: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  new_data: Record<string, any>;

  @Column({ type: 'uuid', nullable: true })
  changed_by_user_id: string;

  @Column({ type: 'boolean', default: false })
  changed_by_agent: boolean;

  @CreateDateColumn()
  created_at: Date;
}
