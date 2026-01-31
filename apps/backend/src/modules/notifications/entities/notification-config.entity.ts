import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('notification_configs')
export class NotificationConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  alert_type: string; // 'license_expiring_30', 'license_expiring_15', etc.

  @Column({ type: 'varchar', length: 100 })
  alert_name: string; // Nome amigável: "Licenças expirando em 30 dias"

  @Column({ type: 'text', nullable: true })
  description: string;

  // Configuração para Administradores
  @Column({ type: 'boolean', default: true })
  notify_admins: boolean;

  @Column({ type: 'boolean', default: false })
  email_admins: boolean;

  // IDs dos admins específicos (JSON array). Se vazio, notifica todos os admins.
  @Column({ type: 'jsonb', nullable: true, default: [] })
  admin_user_ids: string[];

  // Configuração para Clientes
  @Column({ type: 'boolean', default: false })
  notify_clients: boolean;

  @Column({ type: 'boolean', default: false })
  email_clients: boolean;

  // Para alertas de expiração, quantos dias antes
  @Column({ type: 'int', default: 0 })
  days_before: number;

  // Categoria do alerta
  @Column({ type: 'varchar', length: 50, default: 'license' })
  category: string; // 'license', 'resource'

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
