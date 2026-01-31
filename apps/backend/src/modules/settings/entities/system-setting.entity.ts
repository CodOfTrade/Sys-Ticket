import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum SettingKey {
  LOGO_REPORT = 'logo_report',         // Logo para relatórios/PDFs
  LOGO_SYSTEM = 'logo_system',         // Logo do sistema (sidebar/header)
  LOGO_LOGIN = 'logo_login',           // Logo para página de login
  COMPANY_NAME = 'company_name',       // Nome da empresa
}

@Entity('system_settings')
export class SystemSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: SettingKey,
    unique: true,
  })
  key: SettingKey;

  @Column({ type: 'text', nullable: true })
  value: string | null;

  @Column({ nullable: true })
  description: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
