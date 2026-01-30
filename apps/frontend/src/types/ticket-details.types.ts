// Tipos para detalhes do ticket (comentários, apontamentos, valorização, checklists)

export enum CommentType {
  CLIENT = 'client',
  INTERNAL = 'internal',
  CHAT = 'chat',
}

export enum CommentVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  user_id: string;
  user?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  content: string;
  type: CommentType;
  visibility: CommentVisibility;
  sent_to_client: boolean;
  sent_at?: Date;
  attachment_ids?: string[];
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
  is_edited: boolean;
  edited_at?: Date;
}

export enum AppointmentType {
  SERVICE = 'service',
  TRAVEL = 'travel',
  MEETING = 'meeting',
  ANALYSIS = 'analysis',
}

export enum ServiceCoverageType {
  CONTRACT = 'contract',
  WARRANTY = 'warranty',
  BILLABLE = 'billable',
  INTERNAL = 'internal',
}

// ===== NOVA ESTRUTURA DE PRECIFICAÇÃO =====

/**
 * Modalidades de atendimento (FIXAS)
 */
export enum ServiceModality {
  INTERNAL = 'internal',
  REMOTE = 'remote',
  EXTERNAL = 'external',
}

/**
 * Labels para exibição das modalidades
 */
export const SERVICE_MODALITY_LABELS: Record<ServiceModality, string> = {
  [ServiceModality.INTERNAL]: 'Interno',
  [ServiceModality.REMOTE]: 'Remoto',
  [ServiceModality.EXTERNAL]: 'Presencial externo',
};

/**
 * Configuração de precificação para uma modalidade específica
 */
export interface PricingModalityConfig {
  id: string;
  pricing_config_id: string;
  modality: ServiceModality;
  hourly_rate: number;
  minimum_charge: number;
  minimum_charge_threshold_minutes: number;
  charge_excess_per_minute: boolean;
  round_to_minutes: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Classificação de atendimento (CADASTRÁVEL)
 * Ex: "Atendimento avulso N1", "Suporte DBA", etc
 */
export interface PricingConfig {
  id: string;
  service_desk_id: string;
  name: string;
  description: string | null;
  active: boolean;
  modality_configs: PricingModalityConfig[]; // Sempre 3 itens (internal, remote, external)
  created_at: string;
  updated_at: string;
}

/**
 * Helper para obter config de uma modalidade específica
 */
export function getModalityConfig(
  pricingConfig: PricingConfig,
  modality: ServiceModality,
): PricingModalityConfig | undefined {
  return pricingConfig.modality_configs.find((m) => m.modality === modality);
}

// ===== APONTAMENTOS =====

export interface TicketAppointment {
  id: string;
  ticket_id: string;
  user_id: string;
  user?: {
    id: string;
    name: string;
  };
  appointment_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  type: AppointmentType;
  coverage_type: ServiceCoverageType;

  // NOVA ESTRUTURA
  pricing_config_id?: string;
  pricing_config?: PricingConfig;
  service_modality?: ServiceModality;

  description?: string;
  unit_price: number;
  total_amount: number;
  manual_price_override?: boolean;
  manual_unit_price?: number;
  is_warranty?: boolean;
  travel_distance_km?: number;
  travel_cost?: number;
  is_timer_based: boolean;
  timer_started_at?: Date;
  timer_stopped_at?: Date;
  send_as_response?: boolean;
  contract_id?: string;
  service_order_id?: string;
  requires_approval: boolean;
  is_approved: boolean;
  approved_by_id?: string;
  approved_at?: Date;
  attachment_ids?: string[];
  attachments?: Array<{
    id: string;
    filename?: string;
    name?: string;
    url: string;
  }>;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

// ===== VALORIZAÇÃO =====

export enum ValuationType {
  PRODUCT = 'product',
  SERVICE = 'service',
  EXTRA = 'extra',
  DISCOUNT = 'discount',
}

export enum ValuationCategory {
  CLIENT_CHARGE = 'client_charge',
  INTERNAL_COST = 'internal_cost',
}

export interface TicketValuation {
  id: string;
  ticket_id: string;
  type: ValuationType;
  category: ValuationCategory;
  sige_product_id?: string;
  sige_product_name?: string;
  sige_product_code?: string;
  description: string;
  valuation_date: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_amount: number;
  discount_percent: number;
  discount_amount: number;
  tax_percent: number;
  tax_amount: number;
  final_amount: number;
  attachment_ids?: string[];
  notes?: string;
  requires_approval: boolean;
  is_approved: boolean;
  approved_by_id?: string;
  approved_at?: Date;
  service_order_id?: string;
  synced_to_sige: boolean;
  synced_at?: Date;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
  created_by_id: string;
}

// ===== CHECKLISTS =====

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

export interface ChecklistItemTemplate {
  id: string;
  label?: string;
  title?: string;
  description?: string;
  type?: ChecklistFieldType;
  order: number;
  required?: boolean;
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
  items: ChecklistItemTemplate[];
  display_order: number;
  is_active: boolean;
  is_mandatory: boolean;
  category?: string;
  client_restrictions?: string[];
  catalog_restrictions?: string[];
  created_at: Date;
  updated_at: Date;
  created_by_id: string;
  created_by?: {
    id: string;
    name: string;
  };
}

export interface ChecklistItem {
  id: string;
  label?: string;
  title?: string;
  description?: string;
  type?: ChecklistFieldType;
  order: number;
  required?: boolean;
  options?: ChecklistFieldOption[];
  placeholder?: string;
  value?: any;
  is_filled?: boolean;
  is_completed?: boolean;
  filled_at?: Date;
  filled_by_id?: string;
  filled_by_name?: string;
  completed_at?: Date;
  completed_by_id?: string;
  completed_by_name?: string;
  notes?: string;
}

export interface TicketChecklist {
  id: string;
  ticket_id: string;
  checklist_id: string;
  checklist_name: string;
  is_mandatory: boolean;
  items: ChecklistItem[];
  completed_items: number;
  total_items: number;
  completion_percent: number;
  is_completed: boolean;
  completed_at?: Date;
  created_at: Date;
  updated_at: Date;
  created_by_id: string;
  created_by?: {
    id: string;
    name: string;
  };
}

// ===== DTOs =====

export interface CreateCommentDto {
  content: string;
  type?: CommentType;
  visibility?: CommentVisibility;
  sent_to_client?: boolean;
  attachment_ids?: string[];
}

export interface CreateAppointmentDto {
  ticket_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  type?: AppointmentType;
  coverage_type?: ServiceCoverageType;
  pricing_config_id?: string;
  service_modality?: ServiceModality;
  description?: string;
  unit_price?: number;
  travel_distance_km?: number;
  travel_cost?: number;
  contract_id?: string;
  send_as_response?: boolean;
  attachment_ids?: string[];
}

export interface StartTimerDto {
  ticket_id: string;
  type?: AppointmentType;
  coverage_type?: ServiceCoverageType;
}

export interface StopTimerDto {
  appointment_id: string;
  pricing_config_id: string; // OBRIGATÓRIO
  service_modality: ServiceModality; // OBRIGATÓRIO
  coverage_type: ServiceCoverageType;
  is_warranty?: boolean;
  manual_price_override?: boolean;
  manual_unit_price?: number;
  description?: string;
  send_as_response?: boolean;
  attachment_ids?: string[];
}

export interface CalculatePriceDto {
  ticket_id: string;
  start_time: string;
  end_time: string;
  pricing_config_id: string;
  service_modality: ServiceModality;
  coverage_type: ServiceCoverageType;
  is_warranty?: boolean;
  manual_price_override?: boolean;
  manual_unit_price?: number;
}

export interface CreateValuationDto {
  ticket_id: string;
  type?: ValuationType;
  category?: ValuationCategory;
  sige_product_id?: string;
  sige_product_code?: string;
  sige_product_name?: string;
  description: string;
  valuation_date: string;
  quantity?: number;
  unit?: string;
  unit_price: number;
  discount_percent?: number;
  tax_percent?: number;
  notes?: string;
  attachment_ids?: string[];
}

export interface AddChecklistToTicketDto {
  checklist_id: string;
}

export interface UpdateChecklistItemDto {
  item_id: string;
  is_completed?: boolean;
  value?: any;
  notes?: string;
}

// ===== DTOs de Pricing Config =====

export interface CreatePricingModalityConfigDto {
  modality: ServiceModality;
  hourly_rate: number;
  minimum_charge?: number;
  minimum_charge_threshold_minutes?: number;
  charge_excess_per_minute?: boolean;
  round_to_minutes?: number;
}

export interface UpdatePricingModalityConfigDto {
  modality?: ServiceModality;
  hourly_rate?: number;
  minimum_charge?: number;
  minimum_charge_threshold_minutes?: number;
  charge_excess_per_minute?: boolean;
  round_to_minutes?: number;
}

export interface CreatePricingConfigDto {
  service_desk_id: string;
  name: string;
  description?: string;
  active?: boolean;
  modality_configs: CreatePricingModalityConfigDto[]; // Deve ter 3 itens
}

export interface UpdatePricingConfigDto {
  name?: string;
  description?: string;
  active?: boolean;
  modality_configs?: UpdatePricingModalityConfigDto[];
}
