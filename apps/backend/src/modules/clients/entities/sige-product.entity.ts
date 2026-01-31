import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('sige_products')
export class SigeProduct {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'sige_id', unique: true, length: 100 })
  sigeId: string;

  @Column({ length: 255 })
  nome: string;

  @Column({ type: 'text', nullable: true })
  descricao?: string;

  @Column({ length: 100, nullable: true })
  codigo?: string;

  @Column({ name: 'preco_venda', type: 'decimal', precision: 10, scale: 2, nullable: true })
  precoVenda?: number;

  @Column({ name: 'preco_custo', type: 'decimal', precision: 10, scale: 2, nullable: true })
  precoCusto?: number;

  @Column({ length: 50, nullable: true })
  unidade?: string;

  @Column({ length: 50, nullable: true })
  tipo?: string;

  @Column({ default: true })
  ativo: boolean;

  @Column({ name: 'last_synced_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  lastSyncedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
