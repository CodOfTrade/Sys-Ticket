import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('agent_activation_codes')
export class AgentActivationCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string;

  @Column({ type: 'timestamptz' })
  expires_at: Date;

  @Column({ type: 'int', default: 0 })
  max_uses: number; // 0 = ilimitado

  @Column({ type: 'int', default: 0 })
  times_used: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  created_by_user_id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  created_by_user_name: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  /**
   * Verifica se o código é válido para uso
   */
  isValid(): boolean {
    if (!this.is_active) return false;
    if (new Date() > this.expires_at) return false;
    if (this.max_uses > 0 && this.times_used >= this.max_uses) return false;
    return true;
  }
}
