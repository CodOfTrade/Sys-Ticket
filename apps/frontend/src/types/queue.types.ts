/**
 * Estratégias de distribuição de tickets
 */
export enum DistributionStrategy {
  MANUAL = 'manual',
  ROUND_ROBIN = 'round_robin',
  LOAD_BALANCE = 'load_balance',
  SKILL_BASED = 'skill_based',
}

/**
 * Labels das estratégias de distribuição
 */
export const DISTRIBUTION_STRATEGY_LABELS: Record<DistributionStrategy, string> = {
  [DistributionStrategy.MANUAL]: 'Manual',
  [DistributionStrategy.ROUND_ROBIN]: 'Round-robin (Rodízio)',
  [DistributionStrategy.LOAD_BALANCE]: 'Balanceamento de Carga',
  [DistributionStrategy.SKILL_BASED]: 'Baseado em Habilidades',
};

/**
 * Descrições das estratégias
 */
export const DISTRIBUTION_STRATEGY_DESCRIPTIONS: Record<DistributionStrategy, string> = {
  [DistributionStrategy.MANUAL]:
    'Tickets não são atribuídos automaticamente. Um supervisor deve atribuir manualmente.',
  [DistributionStrategy.ROUND_ROBIN]:
    'Tickets são distribuídos em ordem rotativa entre os membros da fila.',
  [DistributionStrategy.LOAD_BALANCE]:
    'Tickets são atribuídos ao membro com menor número de tickets em aberto.',
  [DistributionStrategy.SKILL_BASED]:
    'Tickets são atribuídos baseado nas habilidades dos membros (em desenvolvimento).',
};

/**
 * Configuração de atribuição automática
 */
export interface AutoAssignmentConfig {
  enabled: boolean;
  on_ticket_create: boolean;
  on_ticket_status_change: boolean;
  max_tickets_per_member: number | null;
  priority_weight: boolean;
  skills_matching: boolean;
}

/**
 * Membro da fila (usuário)
 */
export interface QueueMember {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  role: string;
  status: string;
}

/**
 * Fila (Queue)
 */
export interface Queue {
  id: string;
  name: string;
  description: string | null;
  service_desk_id: string;
  distribution_strategy: DistributionStrategy;
  auto_assignment_config: AutoAssignmentConfig | null;
  members: QueueMember[];
  is_active: boolean;
  color: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * DTO para criar fila
 */
export interface CreateQueueDto {
  name: string;
  description?: string;
  service_desk_id: string;
  distribution_strategy?: DistributionStrategy;
  auto_assignment_config?: AutoAssignmentConfig;
  member_ids?: string[];
  is_active?: boolean;
  color?: string;
  display_order?: number;
}

/**
 * DTO para atualizar fila
 */
export interface UpdateQueueDto {
  name?: string;
  description?: string;
  distribution_strategy?: DistributionStrategy;
  auto_assignment_config?: AutoAssignmentConfig;
  member_ids?: string[];
  is_active?: boolean;
  color?: string;
  display_order?: number;
}

/**
 * DTO para atribuir ticket à fila
 */
export interface AssignToQueueDto {
  queue_id: string;
  auto_assign_to_member?: boolean;
}

/**
 * Estatísticas de fila
 */
export interface QueueStats {
  total_tickets: number;
  tickets_by_status: Record<string, number>;
  tickets_by_member: Record<string, { name: string; count: number }>;
}
