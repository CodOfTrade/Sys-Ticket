import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { SigeClient } from '../../clients/entities/sige-client.entity';

export enum NotificationType {
  LICENSE_EXPIRING_30 = 'license_expiring_30',
  LICENSE_EXPIRING_15 = 'license_expiring_15',
  LICENSE_EXPIRING_7 = 'license_expiring_7',
  LICENSE_EXPIRED = 'license_expired',
  RESOURCE_OFFLINE_1H = 'resource_offline_1h',
  RESOURCE_OFFLINE_24H = 'resource_offline_24h',
}

@Entity('notifications')
@Index(['target_user_id', 'is_read'])
@Index(['client_id', 'is_read'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 50,
  })
  type: NotificationType;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  // Admin que deve receber a notificação
  @Column({ type: 'uuid', nullable: true })
  target_user_id: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'target_user_id' })
  target_user: User;

  // Cliente (para portal cliente futuro / email)
  @Column({ type: 'uuid', nullable: true })
  client_id: string;

  @ManyToOne(() => SigeClient, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client: SigeClient;

  // Referência ao item que gerou a notificação
  @Column({ type: 'uuid', nullable: true })
  reference_id: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  reference_type: string; // 'license', 'resource'

  @Column({ type: 'boolean', default: false })
  is_read: boolean;

  @Column({ type: 'boolean', default: false })
  is_email_sent: boolean;

  @Column({ type: 'timestamp', nullable: true })
  email_sent_at: Date;

  @CreateDateColumn()
  created_at: Date;
}
