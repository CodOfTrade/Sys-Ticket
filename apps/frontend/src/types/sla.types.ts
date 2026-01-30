/**
 * Configuração de SLA por prioridade
 */
export interface SlaPriorityConfig {
  first_response: number; // Tempo em minutos
  resolution: number; // Tempo em minutos
}

/**
 * Período de expediente (horário de início e fim)
 */
export interface BusinessHoursPeriod {
  start: string; // Formato: "HH:mm"
  end: string; // Formato: "HH:mm"
}

/**
 * Schedule de um dia da semana com múltiplos períodos
 */
export interface BusinessHoursSchedule {
  day_of_week: number; // 0=Domingo, 1=Segunda, ..., 6=Sábado
  periods: BusinessHoursPeriod[]; // Array de períodos de expediente no dia
}

/**
 * Configuração de horário comercial (flexível com múltiplos períodos por dia)
 */
export interface BusinessHoursConfig {
  timezone: string; // Ex: "America/Sao_Paulo"
  schedules: BusinessHoursSchedule[]; // Configuração por dia da semana
}

/**
 * Configuração completa de SLA
 */
export interface SlaConfig {
  priorities: {
    low: SlaPriorityConfig;
    medium: SlaPriorityConfig;
    high: SlaPriorityConfig;
    urgent: SlaPriorityConfig;
  };
  business_hours: BusinessHoursConfig;
  working_days?: number[]; // Deprecated: agora usamos business_hours.schedules
}

/**
 * DTO para atualizar configuração de SLA
 */
export interface UpdateSlaConfigDto {
  priorities: {
    low: SlaPriorityConfig;
    medium: SlaPriorityConfig;
    high: SlaPriorityConfig;
    urgent: SlaPriorityConfig;
  };
  business_hours: BusinessHoursConfig;
  working_days?: number[]; // Deprecated: agora usamos business_hours.schedules
}

/**
 * Estatísticas de SLA de um ticket
 */
export interface SlaTicketStats {
  ticket_id: string;
  ticket_number: string;
  priority: string;
  created_at: string;
  first_response_due: string | null;
  resolution_due: string | null;
  first_response_at: string | null;
  resolved_at: string | null;
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
  first_response_compliance_rate: number; // Percentual 0-100
  resolution_compliance_rate: number; // Percentual 0-100
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

/**
 * Response da API para configuração de SLA
 */
export interface SlaConfigResponse {
  service_desk_id: string;
  service_desk_name: string;
  sla_config: SlaConfig;
}

/**
 * Response da API para métricas de SLA
 */
export interface SlaMetricsResponse {
  service_desk_id: string;
  service_desk_name: string;
  period: {
    start: string | 'all_time';
    end: string | 'now';
  };
  metrics: SlaMetrics;
}

/**
 * Labels dos dias da semana
 */
export const WEEKDAY_LABELS: Record<number, string> = {
  0: 'Domingo',
  1: 'Segunda-feira',
  2: 'Terça-feira',
  3: 'Quarta-feira',
  4: 'Quinta-feira',
  5: 'Sexta-feira',
  6: 'Sábado',
};

/**
 * Labels curtos dos dias
 */
export const WEEKDAY_SHORT_LABELS: Record<number, string> = {
  0: 'Dom',
  1: 'Seg',
  2: 'Ter',
  3: 'Qua',
  4: 'Qui',
  5: 'Sex',
  6: 'Sáb',
};

/**
 * Helper: Converte minutos para formato legível
 */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}min`;
}

/**
 * Helper: Formata taxa de conformidade
 */
export function formatComplianceRate(rate: number): string {
  return `${rate.toFixed(1)}%`;
}
