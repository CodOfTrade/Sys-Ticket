import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('service_desks')
export class ServiceDesk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  // Configuração de SLA
  @Column({ type: 'jsonb', nullable: true })
  sla_config: {
    priorities: {
      low: { first_response: number; resolution: number };
      medium: { first_response: number; resolution: number };
      high: { first_response: number; resolution: number };
      urgent: { first_response: number; resolution: number };
    };
    business_hours: {
      start: string;
      end: string;
      timezone: string;
    };
    working_days: number[];
  };

  // Workflow de status
  @Column({ type: 'jsonb', nullable: true })
  workflow_config: {
    statuses: string[];
    transitions: Record<string, string[]>;
  };

  // Campos personalizados
  @Column({ type: 'jsonb', nullable: true })
  custom_fields: Array<{
    name: string;
    type: string;
    required: boolean;
    options?: string[];
  }>;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
