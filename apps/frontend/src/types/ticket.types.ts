export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  PENDING = 'pending',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
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
  number: number;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  service_type: ServiceType;
  client_id?: string;
  client?: {
    id: string;
    name: string;
    email: string;
  };
  assignee_id?: string;
  assignee?: {
    id: string;
    name: string;
    email: string;
  };
  service_desk_id: string;
  service_desk?: {
    id: string;
    name: string;
  };
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  closed_at?: string;
}

export interface CreateTicketDto {
  title: string;
  description: string;
  priority: TicketPriority;
  service_type: ServiceType;
  client_id?: string;
  service_desk_id: string;
}

export interface UpdateTicketDto {
  title?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  service_type?: ServiceType;
}
