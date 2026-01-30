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
import { ServiceDesk } from './service-desk.entity';
import { PricingModalityConfig } from './pricing-modality-config.entity';

/**
 * Entity que representa uma Classificação de Atendimento (CADASTRÁVEL)
 *
 * Exemplos de classificações:
 * - "Atendimento avulso N1"
 * - "Atendimento avulso N2"
 * - "Demanda interna"
 * - "Terceirizado N1"
 * - "Terceirizado N2"
 * - "Suporte DBA"
 * - etc...
 *
 * Cada classificação tem 3 configurações de modalidade (interno, remoto, externo)
 * armazenadas na tabela pricing_modality_configs.
 */
@Entity('pricing_configs')
export class PricingConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  service_desk_id: string;

  @ManyToOne(() => ServiceDesk, (serviceDesk) => serviceDesk.pricing_configs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'service_desk_id' })
  service_desk: ServiceDesk;

  /**
   * Nome da classificação (cadastrável pelo usuário)
   * Ex: "Atendimento avulso N1", "Suporte DBA", "Demanda interna", etc
   */
  @Column({ type: 'varchar', length: 100 })
  name: string;

  /**
   * Descrição opcional da classificação
   */
  @Column({ type: 'text', nullable: true })
  description: string;

  /**
   * Se a classificação está ativa
   */
  @Column({ type: 'boolean', default: true })
  active: boolean;

  /**
   * Relacionamento com configurações de modalidades (1 para 3)
   * Uma classificação tem 3 modality_configs:
   * - Uma para INTERNAL (Interno)
   * - Uma para REMOTE (Remoto)
   * - Uma para EXTERNAL (Presencial externo)
   *
   * Eager loading ativado para sempre carregar as configs de modalidade
   * junto com a classificação.
   */
  @OneToMany(() => PricingModalityConfig, (modalityConfig) => modalityConfig.pricing_config, {
    cascade: true, // Ao criar/atualizar PricingConfig, cria/atualiza as ModalityConfigs também
    eager: true, // Sempre carrega as modalidades junto
  })
  modality_configs: PricingModalityConfig[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
