import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { ResourceLicense } from './resource-license.entity';
import { Resource } from './resource.entity';

@Entity('license_device_assignments')
@Unique(['license_id', 'resource_id']) // Evita duplicatas
export class LicenseDeviceAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Licenca
  @ManyToOne(() => ResourceLicense, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'license_id' })
  license: ResourceLicense;

  @Column()
  license_id: string;

  // Dispositivo/Recurso
  @ManyToOne(() => Resource, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'resource_id' })
  resource: Resource;

  @Column()
  resource_id: string;

  // Metadados
  @Column({ type: 'varchar', length: 100, nullable: true })
  assigned_by: string; // User ID que fez a atribuicao

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  assigned_at: Date;
}
