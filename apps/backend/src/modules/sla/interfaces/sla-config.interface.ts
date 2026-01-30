/**
 * Configuração de SLA por prioridade
 */
export interface SlaPriorityConfig {
  first_response: number; // Tempo em minutos para primeira resposta
  resolution: number; // Tempo em minutos para resolução
}

/**
 * Período de expediente (horário de início e fim)
 */
export interface BusinessHoursPeriod {
  start: string; // Hora de início (formato: "HH:mm")
  end: string; // Hora de fim (formato: "HH:mm")
}

/**
 * Schedule de um dia da semana com múltiplos períodos
 */
export interface BusinessHoursSchedule {
  day_of_week: number; // Dia da semana (0=Domingo, 1=Segunda, ..., 6=Sábado)
  periods: BusinessHoursPeriod[]; // Array de períodos de expediente no dia
}

/**
 * Configuração de horário comercial (flexível com múltiplos períodos por dia)
 */
export interface BusinessHoursConfig {
  timezone: string; // Timezone (ex: "America/Sao_Paulo")
  schedules: BusinessHoursSchedule[]; // Configuração por dia da semana
}

/**
 * Configuração completa de SLA de uma mesa de serviço
 */
export interface SlaConfig {
  priorities: {
    low: SlaPriorityConfig;
    medium: SlaPriorityConfig;
    high: SlaPriorityConfig;
    urgent: SlaPriorityConfig;
  };
  business_hours: BusinessHoursConfig;
  working_days?: number[]; // Deprecated: agora usamos business_hours.schedules[].day_of_week
}

/**
 * Resultado do cálculo de SLA
 */
export interface SlaCalculationResult {
  first_response_due: Date | null;
  resolution_due: Date | null;
  first_response_minutes: number;
  resolution_minutes: number;
}

/**
 * Estatísticas de SLA de um ticket
 */
export interface SlaTicketStats {
  ticket_id: string;
  ticket_number: string;
  priority: string;
  created_at: Date;
  first_response_due: Date | null;
  resolution_due: Date | null;
  first_response_at: Date | null;
  resolved_at: Date | null;
  sla_violated: boolean;
  first_response_remaining_minutes: number | null;
  resolution_remaining_minutes: number | null;
  first_response_breach: boolean;
  resolution_breach: boolean;
}

/**
 * Métricas agregadas de SLA
 */
export interface SlaMetrics {
  total_tickets: number;
  tickets_with_sla: number;
  first_response_breached: number;
  resolution_breached: number;
  first_response_compliance_rate: number; // Percentual (0-100)
  resolution_compliance_rate: number; // Percentual (0-100)
  average_first_response_time_minutes: number;
  average_resolution_time_minutes: number;
  by_priority: {
    [priority: string]: {
      total: number;
      breached: number;
      compliance_rate: number;
    };
  };
}
