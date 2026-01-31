import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { SigeContract } from './sige-contract.entity';

@Entity('sige_clients')
export class SigeClient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'sige_id', unique: true, length: 100 })
  sigeId: string;

  @Column({ length: 255 })
  nome: string;

  @Column({ name: 'razao_social', length: 255, nullable: true })
  razaoSocial?: string;

  @Column({ name: 'nome_fantasia', length: 255, nullable: true })
  nomeFantasia?: string;

  @Column({ name: 'cpf_cnpj', length: 20, nullable: true })
  cpfCnpj?: string;

  @Column({ name: 'tipo_pessoa', length: 10, nullable: true })
  tipoPessoa?: string;

  @Column({ length: 255, nullable: true })
  email?: string;

  @Column({ length: 50, nullable: true })
  telefone?: string;

  @Column({ length: 50, nullable: true })
  celular?: string;

  @Column({ type: 'text', nullable: true })
  endereco?: string;

  @Column({ length: 100, nullable: true })
  cidade?: string;

  @Column({ length: 2, nullable: true })
  estado?: string;

  @Column({ length: 10, nullable: true })
  cep?: string;

  @Column({ default: true })
  ativo: boolean;

  @Column({ name: 'allow_unlimited_agents', type: 'boolean', default: false })
  allowUnlimitedAgents: boolean;

  @Column({ name: 'last_synced_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  lastSyncedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => SigeContract, contract => contract.client)
  contracts: SigeContract[];
}
