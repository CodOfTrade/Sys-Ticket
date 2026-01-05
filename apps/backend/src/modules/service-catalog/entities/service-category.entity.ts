import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ServiceCatalog } from './service-catalog.entity';

@Entity('service_categories')
export class ServiceCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  code: string;

  // Catálogo de serviço associado
  @Column({ type: 'uuid' })
  service_catalog_id: string;

  @ManyToOne(() => ServiceCatalog, (catalog) => catalog.categories)
  @JoinColumn({ name: 'service_catalog_id' })
  service_catalog: ServiceCatalog;

  // Ícone ou cor para identificação visual
  @Column({ type: 'varchar', length: 50, nullable: true })
  icon: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  color: string;

  // Ordem de exibição
  @Column({ type: 'integer', default: 0 })
  display_order: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
