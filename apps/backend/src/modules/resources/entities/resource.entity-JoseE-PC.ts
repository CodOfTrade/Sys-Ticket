import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ResourceLicense } from './resource-license.entity';
import { ResourceHistory } from './resource-history.entity';
import { AgentTicket } from './agent-ticket.entity';
import { ClientContact } from '../../clients/entities/client-contact.entity';

export enum ResourceType {
  COMPUTER = 'computer',
  PRINTER = 'printer',
  MONITOR = 'monitor',
  NETWORK_DEVICE = 'network_device',
  SERVER = 'server',
}

export enum ResourceStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
  RETIRED = 'retired',
}

export enum AntivirusStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  OUTDATED = 'outdated',
}

@Entity('resources')
export class Resource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Identificação
  @Column({ type: 'varchar', length: 50, unique: true })
  resource_code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({
    type: 'enum',
    enum: ResourceType,
  })
  resource_type: ResourceType;

  // Cliente/Contrato (referência lógica ao SIGE Cloud)
  @Column({ type: 'varchar', length: 100 })
  client_id: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  contract_id: string;

  // Agrupamento
  @Column({ type: 'varchar', length: 100, nullable: true })
  resource_group: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  department: string;

  // Status
  @Column({
    type: 'enum',
    enum: ResourceStatus,
    default: ResourceStatus.ACTIVE,
  })
  status: ResourceStatus;

  @Column({ type: 'boolean', default: false })
  is_online: boolean;

  @Column({ type: 'timestamp', nullable: true })
  last_seen_at: Date;

  // Usuário responsável
  @Column({ type: 'varchar', length: 255, nullable: true })
  assigned_user_name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  assigned_user_email: string;

  @Column({ type: 'uuid', nullable: true })
  assigned_contact_id: string;

  @ManyToOne(() => ClientContact, { nullable: true })
  @JoinColumn({ name: 'assigned_contact_id' })
  assigned_contact: ClientContact;

  // Comandos remotos (para desinstalação, etc)
  @Column({ type: 'varchar', length: 50, nullable: true })
  pending_command?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  pending_command_at?: Date | null;

  // Informações básicas
  @Column({ type: 'varchar', length: 100, nullable: true })
  manufacturer: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  model: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  serial_number: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  asset_tag: string;

  @Column({ type: 'date', nullable: true })
  purchase_date: Date;

  @Column({ type: 'date', nullable: true })
  warranty_expiry_date: Date;

  // Agente (para computadores)
  @Column({ type: 'varchar', length: 100, unique: true, nullable: true })
  agent_id?: string | null;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  agent_token?: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  agent_version?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  agent_installed_at?: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  agent_last_heartbeat?: Date | null;

  // Dados técnicos (JSON flexível)
  @Column({ type: 'jsonb', nullable: true })
  specifications: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  installed_software: Record<string, any>;

  // Sistema operacional
  @Column({ type: 'varchar', length: 100, nullable: true })
  os_name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  os_version: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  os_architecture: string;

  @Column({ type: 'timestamp', nullable: true })
  os_last_updated: Date;

  // Antivírus
  @Column({ type: 'varchar', length: 100, nullable: true })
  antivirus_name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  antivirus_version: string;

  @Column({ type: 'timestamp', nullable: true })
  antivirus_last_updated: Date;

  @Column({
    type: 'enum',
    enum: AntivirusStatus,
    nullable: true,
  })
  antivirus_status: AntivirusStatus;

  // Rede
  @Column({ type: 'varchar', length: 50, nullable: true })
  ip_address: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  mac_address: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  hostname: string;

  // Metadados
  @Column({ type: 'jsonb', nullable: true })
  custom_fields: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  notes: string;

  // Timestamps
  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  retired_at: Date;

  // Relacionamentos
  @OneToMany(() => ResourceLicense, license => license.resource)
  licenses: ResourceLicense[];

  @OneToMany(() => ResourceHistory, history => history.resource)
  history: ResourceHistory[];

  @OneToMany(() => AgentTicket, agentTicket => agentTicket.resource)
  agent_tickets: AgentTicket[];
}
