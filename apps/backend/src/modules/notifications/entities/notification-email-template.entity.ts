import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('notification_email_templates')
export class NotificationEmailTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Tipo de alerta: license_expiring_30, license_expiring_15, license_expiring_7, license_expired
  @Column({ type: 'varchar', length: 50 })
  alert_type: string;

  // Público-alvo: 'admin' ou 'client'
  @Column({ type: 'varchar', length: 20 })
  target_audience: 'admin' | 'client';

  // Assunto do email (pode usar variáveis como {clientName}, {productName})
  @Column({ type: 'varchar', length: 255 })
  subject: string;

  // Corpo HTML do email (template completo)
  @Column({ type: 'text' })
  html_body: string;

  // Corpo de texto plano (fallback)
  @Column({ type: 'text' })
  text_body: string;

  // Variáveis disponíveis para este template (JSON)
  @Column({ type: 'jsonb', default: '[]' })
  available_variables: string[];

  // Flag para identificar se é template padrão do sistema
  @Column({ type: 'boolean', default: false })
  is_default: boolean;

  // Constraint unique composta: alert_type + target_audience
  @Column({ type: 'varchar', length: 100, unique: true })
  unique_key: string; // Ex: "license_expiring_30_admin"

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
