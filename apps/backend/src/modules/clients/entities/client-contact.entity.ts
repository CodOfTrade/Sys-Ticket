import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('client_contacts')
export class ClientContact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ID do cliente no SIGE Cloud
  @Column({ type: 'varchar', length: 255 })
  client_id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  department: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  position: string;

  // Indica se este contato é o principal
  @Column({ type: 'boolean', default: false })
  is_primary: boolean;

  // Indica se pode abrir tickets
  @Column({ type: 'boolean', default: true })
  can_request_tickets: boolean;

  // Indica se deve receber notificações por padrão
  @Column({ type: 'boolean', default: true })
  receive_notifications: boolean;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  // Observações sobre o contato
  @Column({ type: 'text', nullable: true })
  notes: string;

  // Metadados adicionais
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
