// Tipos compartilhados para Checklists

export enum ChecklistFieldType {
  TEXT = 'text',
  PARAGRAPH = 'paragraph',
  CHECKBOX = 'checkbox',
  MULTIPLE_CHOICE = 'multiple_choice',
  SINGLE_CHOICE = 'single_choice',
  CURRENCY = 'currency',
  NUMBER = 'number',
  DATE = 'date',
  FILE = 'file',
}

export interface ChecklistFieldOption {
  id: string;
  label: string;
  order: number;
}

export interface ChecklistField {
  id: string;
  label: string;
  description?: string;
  type: ChecklistFieldType;
  order: number;
  required: boolean;
  options?: ChecklistFieldOption[];
  placeholder?: string;
  min_value?: number;
  max_value?: number;
  max_length?: number;
  allowed_extensions?: string[];
}

export interface Checklist {
  id: string;
  name: string;
  description?: string;
  service_desk_id?: string;
  service_desk?: {
    id: string;
    name: string;
  };
  items: ChecklistField[];
  display_order: number;
  is_active: boolean;
  is_mandatory: boolean;
  category?: string;
  client_restrictions: string[];
  catalog_restrictions: string[];
  created_at: string;
  updated_at: string;
  created_by?: {
    id: string;
    name: string;
  };
}

export const FIELD_TYPE_LABELS: Record<ChecklistFieldType, string> = {
  [ChecklistFieldType.TEXT]: 'Texto',
  [ChecklistFieldType.PARAGRAPH]: 'Parágrafo',
  [ChecklistFieldType.CHECKBOX]: 'Checkbox',
  [ChecklistFieldType.MULTIPLE_CHOICE]: 'Múltipla Escolha',
  [ChecklistFieldType.SINGLE_CHOICE]: 'Escolha Única',
  [ChecklistFieldType.CURRENCY]: 'Valor Monetário',
  [ChecklistFieldType.NUMBER]: 'Número',
  [ChecklistFieldType.DATE]: 'Data',
  [ChecklistFieldType.FILE]: 'Arquivo',
};
