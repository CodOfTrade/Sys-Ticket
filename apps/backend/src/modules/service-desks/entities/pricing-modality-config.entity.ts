import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { PricingConfig } from './pricing-config.entity';
import { ServiceModality } from '../enums/service-modality.enum';

/**
 * Entity que armazena a configuração de precificação de uma modalidade específica
 *
 * Cada PricingConfig (classificação) tem 3 PricingModalityConfig:
 * - Uma para modalidade INTERNAL (Interno)
 * - Uma para modalidade REMOTE (Remoto)
 * - Uma para modalidade EXTERNAL (Presencial externo)
 *
 * Cada modalidade pode ter seus próprios valores e regras de cobrança.
 */
@Entity('pricing_modality_configs')
@Unique(['pricing_config_id', 'modality']) // Garante que cada classificação só tenha UMA config por modalidade
export class PricingModalityConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  pricing_config_id: string;

  @ManyToOne(() => PricingConfig, (pricingConfig) => pricingConfig.modality_configs, {
    onDelete: 'CASCADE', // Ao deletar PricingConfig, deleta todas as ModalityConfigs vinculadas
  })
  @JoinColumn({ name: 'pricing_config_id' })
  pricing_config: PricingConfig;

  /**
   * Modalidade (INTERNO, REMOTO ou EXTERNO)
   */
  @Column({
    type: 'enum',
    enum: ServiceModality,
  })
  modality: ServiceModality;

  /**
   * Valor por hora desta modalidade
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  hourly_rate: number;

  /**
   * Valor mínimo de cobrança
   * Se o tempo de atendimento for menor que o threshold,
   * será cobrado este valor mínimo
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  minimum_charge: number;

  /**
   * Tempo mínimo em minutos
   * Atendimentos com duração menor ou igual a este valor
   * cobrarão o minimum_charge
   */
  @Column({ type: 'int', default: 60 })
  minimum_charge_threshold_minutes: number;

  /**
   * Define como será cobrado o tempo excedente
   * - true: Cobrança proporcional por minuto
   * - false: Cobrança por hora completa (arredondamento para cima)
   */
  @Column({ type: 'boolean', default: false })
  charge_excess_per_minute: boolean;

  /**
   * Arredondamento de tempo (em minutos)
   * Ex: 15, 30, 60
   * Opcional - pode ser null
   */
  @Column({ type: 'int', nullable: true })
  round_to_minutes: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
