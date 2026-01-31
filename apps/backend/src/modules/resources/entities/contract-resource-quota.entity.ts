import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('contract_resource_quotas')
export class ContractResourceQuota {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  contract_id: string;

  @Column({ type: 'varchar', length: 100 })
  client_id: string;

  // Cotas de recursos físicos
  @Column({ type: 'integer', default: 0 })
  computers_quota: number;

  @Column({ type: 'integer', default: 0 })
  computers_used: number;

  @Column({ type: 'integer', default: 0 })
  printers_quota: number;

  @Column({ type: 'integer', default: 0 })
  printers_used: number;

  @Column({ type: 'integer', default: 0 })
  monitors_quota: number;

  @Column({ type: 'integer', default: 0 })
  monitors_used: number;

  @Column({ type: 'integer', default: 0 })
  servers_quota: number;

  @Column({ type: 'integer', default: 0 })
  servers_used: number;

  // Cotas de licenças
  @Column({ type: 'integer', default: 0 })
  windows_licenses_quota: number;

  @Column({ type: 'integer', default: 0 })
  windows_licenses_used: number;

  @Column({ type: 'integer', default: 0 })
  office_licenses_quota: number;

  @Column({ type: 'integer', default: 0 })
  office_licenses_used: number;

  @Column({ type: 'integer', default: 0 })
  antivirus_licenses_quota: number;

  @Column({ type: 'integer', default: 0 })
  antivirus_licenses_used: number;

  // Cotas customizadas (JSON flexível)
  @Column({ type: 'jsonb', nullable: true })
  custom_quotas: Record<string, any>;

  // Controles
  @Column({ type: 'boolean', default: false })
  allow_exceed: boolean;

  @Column({ type: 'integer', default: 90 })
  alert_threshold: number;

  // Timestamps
  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
