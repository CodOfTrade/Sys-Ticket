export enum TicketStatus {
  NEW = 'new',
  IN_PROGRESS = 'in_progress',
  WAITING_CLIENT = 'waiting_client',
  WAITING_THIRD_PARTY = 'waiting_third_party',
  PAUSED = 'paused',
  WAITING_APPROVAL = 'waiting_approval',
  RESOLVED = 'resolved',
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
}
