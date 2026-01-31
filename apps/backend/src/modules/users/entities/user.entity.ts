import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import * as bcrypt from 'bcrypt';

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  AGENT = 'agent',
  CLIENT = 'client',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, select: false })
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.AGENT,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  avatar_url: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  department: string;

  // Cliente SIGE Cloud (se for usuário do tipo CLIENT)
  @Column({ type: 'varchar', length: 100, nullable: true })
  client_id: string;

  // Permissões específicas
  @Column({ type: 'simple-array', nullable: true })
  permissions: string[];

  // Mesas de serviço que o usuário pode acessar
  @Column({ type: 'simple-array', nullable: true })
  service_desk_ids: string[];

  // 2FA
  @Column({ type: 'boolean', default: false })
  two_factor_enabled: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true, select: false })
  two_factor_secret: string;

  // Refresh token
  @Column({ type: 'text', nullable: true, select: false })
  refresh_token: string;

  // Últimos acessos
  @Column({ type: 'timestamptz', nullable: true })
  last_login_at: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  last_login_ip: string;

  // Timestamps
  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  // Preferências do usuário
  @Column({ type: 'jsonb', nullable: true })
  preferences: Record<string, any>;

  // Hash da senha antes de salvar
  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password && !this.password.startsWith('$2')) {
      this.password = await bcrypt.hash(this.password, 10);
    }
  }

  // Método para validar senha
  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }
}
