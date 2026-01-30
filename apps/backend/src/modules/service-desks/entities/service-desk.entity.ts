import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { PricingConfig } from './pricing-config.entity';
import { SlaConfig } from '../../sla/interfaces/sla-config.interface';

@Entity('service_desks')
export class ServiceDesk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  // Informações da Empresa
  @Column({ type: 'varchar', length: 255, nullable: true })
  company_trade_name: string;

  @Column({ type: 'varchar', length: 18, nullable: true })
  company_cnpj: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  company_legal_name: string;

  @Column({ type: 'text', nullable: true })
  company_address: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  company_phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  company_email: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  company_website: string;

  // Configuração de SLA
  @Column({ type: 'jsonb', nullable: true })
  sla_config: SlaConfig;

  // Workflow de status
  @Column({ type: 'jsonb', nullable: true })
  workflow_config: {
    statuses: string[];
    transitions: Record<string, string[]>;
  };

  // Campos personalizados
  @Column({ type: 'jsonb', nullable: true })
  custom_fields: Array<{
    name: string;
    type: string;
    required: boolean;
    options?: string[];
  }>;

  // Relacionamento com configurações de precificação
  @OneToMany(() => PricingConfig, (pricingConfig) => pricingConfig.service_desk)
  pricing_configs: PricingConfig[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
