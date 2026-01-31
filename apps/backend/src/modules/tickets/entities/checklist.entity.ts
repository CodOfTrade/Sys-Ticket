import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { ServiceDesk } from '../../service-desks/entities/service-desk.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Tipos de campos suportados pelo checklist (inspirado no Tiflux)
 */
export enum ChecklistFieldType {
  TEXT = 'text',              // Campo de texto curto
  PARAGRAPH = 'paragraph',    // Texto longo/parágrafo
  CHECKBOX = 'checkbox',      // Checkbox simples (marcado/desmarcado)
  MULTIPLE_CHOICE = 'multiple_choice',  // Múltipla escolha (vários podem ser selecionados)
  SINGLE_CHOICE = 'single_choice',      // Escolha única (radio buttons)
  CURRENCY = 'currency',      // Valor monetário
  NUMBER = 'number',          // Número
  DATE = 'date',              // Data
  FILE = 'file',              // Upload de arquivo
}

/**
 * Template de checklist que pode ser reutilizado em múltiplos tickets
 */
@Entity('checklists')
export class Checklist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'uuid', nullable: true })
  service_desk_id: string;

  @ManyToOne(() => ServiceDesk, { nullable: true })
  @JoinColumn({ name: 'service_desk_id' })
  service_desk: ServiceDesk;

  // Items/Campos do checklist (JSON array)
  @Column({ type: 'jsonb', default: '[]' })
  items: ChecklistFieldTemplate[];

  // Ordem de exibição
  @Column({ type: 'int', default: 0 })
  display_order: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  // Se o checklist é obrigatório para concluir o ticket
  @Column({ type: 'boolean', default: false })
  is_mandatory: boolean;

  // Categoria para organização
  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string;

  // Restrições de acesso (JSON array de IDs)
  // Se vazio, aplica-se a todos
  @Column({ type: 'jsonb', default: '[]' })
  client_restrictions: string[];  // IDs de clientes específicos

  @Column({ type: 'jsonb', default: '[]' })
  catalog_restrictions: string[];  // IDs de catálogos de serviço específicos

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

/**
 * Template de campo do checklist
 */
export interface ChecklistFieldTemplate {
  id: string;
  label: string;              // Título/Label do campo
  description?: string;       // Descrição/ajuda do campo
  type: ChecklistFieldType;   // Tipo do campo
  order: number;              // Ordem de exibição
  required: boolean;          // Campo obrigatório
  options?: ChecklistFieldOption[];  // Opções para campos de escolha
  placeholder?: string;       // Placeholder para campos de texto
  min_value?: number;         // Valor mínimo (para number/currency)
  max_value?: number;         // Valor máximo (para number/currency)
  max_length?: number;        // Tamanho máximo (para text/paragraph)
  allowed_extensions?: string[];  // Extensões permitidas (para file)
}

/**
 * Opção para campos de múltipla/única escolha
 */
export interface ChecklistFieldOption {
  id: string;
  label: string;
  order: number;
}

/**
 * Tipo legado para compatibilidade (alias)
 * @deprecated Use ChecklistFieldTemplate
 */
export type ChecklistItemTemplate = ChecklistFieldTemplate;
