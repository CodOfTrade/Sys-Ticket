/**
 * Estratégias de distribuição de tickets entre membros da fila
 */
export enum DistributionStrategy {
  /**
   * Distribuição manual - Admin/supervisor atribui manualmente
   */
  MANUAL = 'manual',

  /**
   * Round-robin - Distribui em ordem rotativa entre membros ativos
   */
  ROUND_ROBIN = 'round_robin',

  /**
   * Load balance - Distribui para o membro com menor número de tickets ativos
   */
  LOAD_BALANCE = 'load_balance',

  /**
   * Baseado em habilidades - Distribui baseado em skills/tags dos membros
   * (implementação futura)
   */
  SKILL_BASED = 'skill_based',
}

/**
 * Labels em português para as estratégias
 */
export const DISTRIBUTION_STRATEGY_LABELS: Record<DistributionStrategy, string> = {
  [DistributionStrategy.MANUAL]: 'Manual',
  [DistributionStrategy.ROUND_ROBIN]: 'Round-robin (Rodízio)',
  [DistributionStrategy.LOAD_BALANCE]: 'Balanceamento de Carga',
  [DistributionStrategy.SKILL_BASED]: 'Baseado em Habilidades',
};

/**
 * Descrições detalhadas das estratégias
 */
export const DISTRIBUTION_STRATEGY_DESCRIPTIONS: Record<DistributionStrategy, string> = {
  [DistributionStrategy.MANUAL]:
    'Tickets não são atribuídos automaticamente. Um supervisor deve atribuir manualmente.',
  [DistributionStrategy.ROUND_ROBIN]:
    'Tickets são distribuídos em ordem rotativa entre os membros da fila.',
  [DistributionStrategy.LOAD_BALANCE]:
    'Tickets são atribuídos ao membro com menor número de tickets em aberto.',
  [DistributionStrategy.SKILL_BASED]:
    'Tickets são atribuídos baseado nas habilidades e especialidades dos membros (futuro).',
};
