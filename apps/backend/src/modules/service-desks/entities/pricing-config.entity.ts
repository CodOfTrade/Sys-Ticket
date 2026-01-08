import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ServiceDesk } from './service-desk.entity';

export enum PricingType {
  HOURLY = 'hourly', // Por hora
  FIXED = 'fixed', // Valor fixo
  CONTRACT = 'contract', // Baseado no contrato
}

export enum ServiceType {
  INTERNAL = 'internal', // Atendimento interno
  REMOTE = 'remote', // Atendimento remoto
  EXTERNAL = 'external', // Atendimento presencial/externo
}

@Entity('pricing_configs')
export class PricingConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ServiceDesk, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_desk_id' })
  service_desk: ServiceDesk;

  @Column()
  service_desk_id: string;

  @Column({
    type: 'enum',
    enum: ServiceType,
  })
  service_type: ServiceType;

  @Column({
    type: 'enum',
    enum: PricingType,
    default: PricingType.HOURLY,
  })
  pricing_type: PricingType;

  // Preços por hora
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  hourly_rate_normal: number; // Hora normal

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  hourly_rate_extra: number; // Hora extra (fora contrato)

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  hourly_rate_weekend: number; // Fim de semana

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  hourly_rate_holiday: number; // Feriados

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  hourly_rate_night: number; // Noturno (após 18h)

  // Valor fixo
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  fixed_price: number;

  // Percentuais sobre contrato
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 100 })
  contract_percentage: number; // % do valor do contrato (100 = mesmo valor)

  // Mínimo cobrável
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  minimum_charge: number; // Valor mínimo a cobrar

  // Tempo mínimo para aplicar cobrança mínima (em minutos)
  @Column({ type: 'integer', default: 60 })
  minimum_charge_threshold_minutes: number; // Se < 60min, cobra o mínimo

  // Cobrança excedente - por minuto ou por hora
  @Column({ type: 'boolean', default: false })
  charge_excess_per_minute: boolean; // true = por minuto, false = por hora completa

  // Arredondamento de horas
  @Column({ type: 'integer', default: 30 })
  round_to_minutes: number; // Arredondar para X minutos (15, 30, 60)

  // Ativo
  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
