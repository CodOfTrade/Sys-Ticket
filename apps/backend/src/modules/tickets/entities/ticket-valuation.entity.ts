import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Ticket } from './ticket.entity';
import { User } from '../../users/entities/user.entity';

export enum ValuationType {
  PRODUCT = 'product', // Produto do SIGE Cloud
  SERVICE = 'service', // Serviço adicional
  EXTRA = 'extra', // Valor extra
  DISCOUNT = 'discount', // Desconto
}

export enum ValuationCategory {
  CLIENT_CHARGE = 'client_charge', // Repassado ao cliente
  INTERNAL_COST = 'internal_cost', // Custo interno (não repassado)
}

@Entity('ticket_valuations')
export class TicketValuation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  ticket_id: string;

  @ManyToOne(() => Ticket, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  // Tipo de valorização
  @Column({
    type: 'enum',
    enum: ValuationType,
    default: ValuationType.PRODUCT,
  })
  type: ValuationType;

  // Categoria (cliente ou custo interno)
  @Column({
    type: 'enum',
    enum: ValuationCategory,
    default: ValuationCategory.CLIENT_CHARGE,
  })
  category: ValuationCategory;

  // Produto do SIGE Cloud (quando aplicável)
  @Column({ type: 'varchar', length: 100, nullable: true })
  sige_product_id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  sige_product_name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sige_product_code: string;

  // Descrição customizada
  @Column({ type: 'varchar', length: 500 })
  description: string;

  // Data da valorização
  @Column({ type: 'date' })
  valuation_date: Date;

  // Quantidade e valores
  @Column({ type: 'decimal', precision: 10, scale: 3, default: 1 })
  quantity: number;

  @Column({ type: 'varchar', length: 50, default: 'UN' })
  unit: string; // UN, H, KG, M, etc.

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unit_price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total_amount: number;

  // Desconto
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  discount_percent: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discount_amount: number;

  // Impostos
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  tax_percent: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  tax_amount: number;

  // Valor final
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  final_amount: number;

  // Anexos (nota fiscal, comprovantes, fotos)
  @Column({ type: 'simple-array', nullable: true })
  attachment_ids: string[];

  // Observações
  @Column({ type: 'text', nullable: true })
  notes: string;

  // Aprovação (para valores que necessitam)
  @Column({ type: 'boolean', default: false })
  requires_approval: boolean;

  @Column({ type: 'boolean', default: false })
  is_approved: boolean;

  @Column({ type: 'uuid', nullable: true })
  approved_by_id: string;

  @Column({ type: 'timestamptz', nullable: true })
  approved_at: Date;

  // Vínculo com OS do SIGE Cloud
  @Column({ type: 'varchar', length: 100, nullable: true })
  service_order_id: string;

  @Column({ type: 'boolean', default: false })
  synced_to_sige: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  synced_at: Date;

  // Metadados
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @Column({ type: 'uuid' })
  created_by_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by_id' })
  created_by: User;
}
