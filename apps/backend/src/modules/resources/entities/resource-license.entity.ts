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
import { Resource } from './resource.entity';
import { LicenseDeviceAssignment } from './license-device-assignment.entity';
import { SigeClient } from '../../clients/entities/sige-client.entity';

export enum LicenseType {
  WINDOWS = 'windows',
  OFFICE = 'office',
  ANTIVIRUS = 'antivirus',
  CUSTOM = 'custom',
}

export enum LicenseStatus {
  AVAILABLE = 'available',
  ASSIGNED = 'assigned',
  EXPIRED = 'expired',
  SUSPENDED = 'suspended',
}

export enum ActivationType {
  SERIAL = 'serial',      // Apenas chave serial (Windows, Antivirus)
  ACCOUNT = 'account',    // Apenas conta/email (Microsoft 365)
  HYBRID = 'hybrid',      // Serial + Conta (Office perpetuo)
}

@Entity('resource_licenses')
export class ResourceLicense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Identificação
  @Column({ type: 'varchar', length: 255, nullable: true })
  license_key: string;

  @Column({
    type: 'enum',
    enum: ActivationType,
    default: ActivationType.SERIAL,
  })
  activation_type: ActivationType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  linked_email: string;

  @Column({
    type: 'enum',
    enum: LicenseType,
  })
  license_type: LicenseType;

  @Column({ type: 'varchar', length: 255 })
  product_name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  product_version: string;

  // Cliente/Contrato
  @ManyToOne(() => SigeClient, { nullable: true })
  @JoinColumn({ name: 'client_id', referencedColumnName: 'id' })
  client: SigeClient;

  @Column({ type: 'varchar', length: 100 })
  client_id: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  contract_id: string;

  // Alocação
  @ManyToOne(() => Resource, resource => resource.licenses, { nullable: true })
  @JoinColumn({ name: 'resource_id' })
  resource: Resource;

  @Column({ nullable: true })
  resource_id: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  assigned_to_user: string;

  // Status
  @Column({
    type: 'enum',
    enum: LicenseStatus,
    default: LicenseStatus.AVAILABLE,
  })
  license_status: LicenseStatus;

  @Column({ type: 'date', nullable: true })
  purchase_date: Date;

  @Column({ type: 'date', nullable: true })
  expiry_date: Date;

  @Column({ type: 'boolean', default: false })
  is_perpetual: boolean;

  // Cotas
  @Column({ type: 'integer', nullable: true })
  max_activations: number;

  @Column({ type: 'integer', default: 0 })
  current_activations: number;

  // Fornecedor
  @Column({ type: 'varchar', length: 100, nullable: true })
  vendor: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  purchase_order: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  cost: number;

  // Metadados
  @Column({ type: 'jsonb', nullable: true })
  custom_fields: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  notes: string;

  // Timestamps
  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  activated_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  deactivated_at: Date;

  // Dispositivos atribuidos (para licencas multi-dispositivo)
  @OneToMany(() => LicenseDeviceAssignment, assignment => assignment.license)
  device_assignments: LicenseDeviceAssignment[];
}
