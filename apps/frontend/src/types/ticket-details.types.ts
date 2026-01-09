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

export enum ServiceType {
  INTERNAL = 'internal',
  REMOTE = 'remote',
  EXTERNAL = 'external',
}

export enum ServiceLevel {
  N1 = 'n1',
  N2 = 'n2',
}

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
  service_type?: ServiceType;
  service_level?: ServiceLevel;
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
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

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

export interface ChecklistItemTemplate {
  id: string;
  title: string;
  description?: string;
  order: number;
  required?: boolean;
}

export interface Checklist {
  id: string;
  name: string;
  description?: string;
  service_desk_id: string;
  items: ChecklistItemTemplate[];
  display_order: number;
  is_active: boolean;
  category?: string;
  created_at: Date;
  updated_at: Date;
  created_by_id: string;
}

export interface ChecklistItem {
  id: string;
  title: string;
  description?: string;
  order: number;
  required?: boolean;
  is_completed: boolean;
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
  items: ChecklistItem[];
  completed_items: number;
  total_items: number;
  completion_percent: number;
  is_completed: boolean;
  completed_at?: Date;
  created_at: Date;
  updated_at: Date;
  created_by_id: string;
}

// DTOs para criação

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
  service_type?: ServiceType;
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
  service_type?: ServiceType;
}

export interface StopTimerDto {
  appointment_id: string;
  service_type: ServiceType; // Interno, Remoto ou Externo
  coverage_type: ServiceCoverageType; // Contrato ou Avulso
  service_level?: ServiceLevel; // N1 ou N2
  is_warranty?: boolean; // Garantia (zera valor)
  manual_price_override?: boolean; // Permitir editar valor manualmente
  manual_unit_price?: number; // Valor por hora manual
  description?: string;
  send_as_response?: boolean;
  attachment_ids?: string[];
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
  is_completed: boolean;
  notes?: string;
}
