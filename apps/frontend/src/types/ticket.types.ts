export enum TicketStatus {
  NEW = 'new',
  IN_PROGRESS = 'in_progress',
  WAITING_CLIENT = 'waiting_client',
  WAITING_THIRD_PARTY = 'waiting_third_party',
  PAUSED = 'paused',
  WAITING_APPROVAL = 'waiting_approval',
  REJECTED_BY_APPROVER = 'rejected_by_approver', // Reprovado pelo aprovador
  WAITING_EVALUATION = 'waiting_evaluation', // Fechado - Em Avaliação
  APPROVED = 'approved',                      // Aprovado - Enviado para Faturamento
  REOPENED = 'reopened',                      // Reaberto
  RESOLVED = 'resolved',                      // Legado
  CANCELLED = 'cancelled',
}

export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum ServiceType {
  INTERNAL = 'internal',
  REMOTE = 'remote',
  EXTERNAL = 'external',
  OUTSOURCED_N1 = 'outsourced_n1',
  OUTSOURCED_N2 = 'outsourced_n2',
}

export interface Ticket {
  id: string;
  ticket_number: string;
  client_id: string;
  client_name: string;
  requester_name: string;
  requester_email?: string;
  requester_phone?: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  type: ServiceType;
  category?: string;
  tags?: string;
  service_desk_id: string;
  queue_id?: string;
  queue?: {
    id: string;
    name: string;
    color?: string;
  };
  assigned_to_id?: string;
  assigned_to?: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
  };
  created_by_id: string;
  created_by?: {
    id: string;
    name: string;
    email: string;
  };
  service_desk?: {
    id: string;
    name: string;
    description?: string;
  };
  // Catalogo de Servico
  service_catalog_id?: string;
  service_catalog?: {
    id: string;
    name: string;
    description?: string;
  };
  service_category_id?: string;
  service_category?: {
    id: string;
    name: string;
    description?: string;
  };
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  closed_at?: string;
  started_at?: string;
  client?: {
    id: string;
    name: string;
  };
  attachments?: Array<{
    id: string;
    filename?: string;
    name?: string;
    url: string;
  }>;
  paused_at?: string;
}

export interface CreateTicketDto {
  client_id: string;
  client_name: string;
  requester_name: string;
  requester_email?: string;
  requester_phone?: string;
  title: string;
  description: string;
  priority?: TicketPriority;
  type?: ServiceType;
  category?: string;
  tags?: string[];
  service_desk_id: string;
  queue_id?: string;
  assigned_to_id?: string;
  contract_id?: string;
  parent_ticket_id?: string;
  contact_id?: string;
  followers?: string[];
  service_catalog_id?: string;
  custom_fields?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface UpdateTicketDto {
  title?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  service_type?: ServiceType;
  client_id?: string;
  client_name?: string;
  requester_name?: string;
  assigned_to_id?: string;
  queue_id?: string | null;
  service_catalog_id?: string | null;
  service_category_id?: string | null;
}

// ========================================
// TIPOS PARA APROVAÇÃO DE TICKETS
// ========================================

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export interface TicketApproval {
  id: string;
  ticket_id: string;
  status: ApprovalStatus;
  contact_id?: string;
  approver_email: string;
  approver_name?: string;
  expires_at: string;
  comment?: string;
  responded_at?: string;
  response_ip?: string;
  requested_by_id: string;
  requested_by?: {
    id: string;
    name: string;
    email: string;
  };
  email_sent: boolean;
  email_sent_at?: string;
  email_retry_count: number;
  custom_message?: string;
  created_at: string;
  updated_at: string;
}

export interface RequestApprovalDto {
  contact_id?: string;
  approver_email?: string;
  approver_name?: string;
  message?: string;
}

export interface UpdateApproverDto {
  approver_email: string;
  approver_name?: string;
}
