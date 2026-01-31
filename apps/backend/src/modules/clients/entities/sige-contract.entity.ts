import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { SigeClient } from './sige-client.entity';

@Entity('sige_contracts')
export class SigeContract {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'sige_id', unique: true, length: 100 })
  sigeId: string;

  @Column({ name: 'sige_client_id', type: 'uuid', nullable: true })
  sigeClientId?: string;

  @ManyToOne(() => SigeClient, client => client.contracts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sige_client_id' })
  client?: SigeClient;

  @Column({ name: 'numero_contrato', length: 100, nullable: true })
  numeroContrato?: string;

  @Column({ type: 'text', nullable: true })
  descricao?: string;

  @Column({ name: 'valor_mensal', type: 'decimal', precision: 10, scale: 2, nullable: true })
  valorMensal?: number;

  @Column({ name: 'data_inicio', type: 'date', nullable: true })
  dataInicio?: Date;

  @Column({ name: 'data_fim', type: 'date', nullable: true })
  dataFim?: Date;

  @Column({ length: 50, nullable: true })
  status?: string;

  @Column({ length: 50, nullable: true })
  tipo?: string;

  @Column({ type: 'text', nullable: true })
  observacoes?: string;

  @Column({ default: true })
  ativo: boolean;

  @Column({ name: 'last_synced_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  lastSyncedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
