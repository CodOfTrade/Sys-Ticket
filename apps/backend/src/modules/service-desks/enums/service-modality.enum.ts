/**
 * Enum de Modalidades de Atendimento (FIXAS)
 *
 * Define as 3 modalidades fixas de prestação de serviço.
 * Cada classificação de atendimento terá configurações específicas
 * para cada uma dessas modalidades.
 */
export enum ServiceModality {
  /**
   * Atendimento Interno
   * Serviço realizado internamente na empresa
   */
  INTERNAL = 'internal',

  /**
   * Atendimento Remoto
   * Serviço realizado remotamente (suporte à distância)
   */
  REMOTE = 'remote',

  /**
   * Atendimento Presencial Externo
   * Serviço realizado presencialmente no cliente
   */
  EXTERNAL = 'external',
}
