import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { ServiceDesk } from '../../service-desks/entities/service-desk.entity';
import { ServiceCategory } from './service-category.entity';

@Entity('service_catalogs')
export class ServiceCatalog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  code: string;

  // Mesa de serviço associada
  @Column({ type: 'uuid' })
  service_desk_id: string;

  @ManyToOne(() => ServiceDesk)
  @JoinColumn({ name: 'service_desk_id' })
  service_desk: ServiceDesk;

  // Categorias vinculadas a este catálogo
  @OneToMany(() => ServiceCategory, (category) => category.service_catalog)
  categories: ServiceCategory[];

  // SLA padrão para este serviço (em minutos)
  @Column({ type: 'jsonb', nullable: true })
  sla_config: {
    low: { first_response: number; resolution: number };
    medium: { first_response: number; resolution: number };
    high: { first_response: number; resolution: number };
    urgent: { first_response: number; resolution: number };
  };

  // Indica se o serviço requer aprovação antes de iniciar
  @Column({ type: 'boolean', default: false })
  requires_approval: boolean;

  // Indica se o serviço é cobrado
  @Column({ type: 'boolean', default: true })
  is_billable: boolean;

  // Valor padrão do serviço (pode ser sobrescrito)
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  default_price: number;

  // Tempo estimado de resolução (em minutos)
  @Column({ type: 'integer', nullable: true })
  estimated_time: number;

  // Ordem de exibição
  @Column({ type: 'integer', default: 0 })
  display_order: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  // Metadados adicionais
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
