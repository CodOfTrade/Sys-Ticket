import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum PermissionAuditAction {
  ROLE_CHANGED = 'role_changed',
  CUSTOM_ROLE_ASSIGNED = 'custom_role_assigned',
  CUSTOM_ROLE_REMOVED = 'custom_role_removed',
  PERMISSIONS_ADDED = 'permissions_added',
  PERMISSIONS_REMOVED = 'permissions_removed',
  PERMISSIONS_UPDATED = 'permissions_updated',
  USER_CREATED = 'user_created',
  USER_STATUS_CHANGED = 'user_status_changed',
}

@Entity('permission_audit_logs')
export class PermissionAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  target_user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'target_user_id' })
  target_user: User;

  @Column({ type: 'uuid' })
  changed_by_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'changed_by_id' })
  changed_by: User;

  @Column({ type: 'varchar', length: 50 })
  action: PermissionAuditAction;

  @Column({ type: 'jsonb', nullable: true })
  old_value: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  new_value: Record<string, any>;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip_address: string;

  @Column({ type: 'text', nullable: true })
  user_agent: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
