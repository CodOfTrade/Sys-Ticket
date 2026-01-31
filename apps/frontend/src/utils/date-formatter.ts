/**
 * Utilitário centralizado para formatação de datas com timezone correto
 * Timezone: America/Sao_Paulo (Horário de Brasília)
 */

const TIMEZONE = 'America/Sao_Paulo';

/**
 * Formata uma data com opções personalizadas
 * @param date - Data a ser formatada (Date, string ou null/undefined)
 * @param options - Opções de formatação (opcional)
 * @returns Data formatada como string ou '-' se a data for nula
 */
export const formatDate = (
  date: Date | string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string => {
  if (!date) return '-';

  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIMEZONE,
    ...options,
  };

  return new Intl.DateTimeFormat('pt-BR', defaultOptions).format(new Date(date));
};

/**
 * Formata data sem hora (apenas dia/mês/ano)
 * @param date - Data a ser formatada
 * @returns Data formatada (ex: "30/01/2026")
 */
export const formatDateShort = (date: Date | string | null | undefined): string => {
  return formatDate(date, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: TIMEZONE,
  });
};

/**
 * Formata data com hora e minuto
 * @param date - Data a ser formatada
 * @returns Data formatada (ex: "30/01/2026, 22:16")
 */
export const formatDateTime = (date: Date | string | null | undefined): string => {
  return formatDate(date, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIMEZONE,
  });
};

/**
 * Formata data com hora, minuto e segundo
 * @param date - Data a ser formatada
 * @returns Data formatada (ex: "30/01/2026, 22:16:45")
 */
export const formatDateTimeFull = (date: Date | string | null | undefined): string => {
  return formatDate(date, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: TIMEZONE,
  });
};

/**
 * Formata apenas a hora
 * @param date - Data a ser formatada
 * @returns Hora formatada (ex: "22:16")
 */
export const formatTime = (date: Date | string | null | undefined): string => {
  if (!date) return '-';

  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIMEZONE,
  }).format(new Date(date));
};

/**
 * Formata data de forma relativa (ex: "há 2 horas", "ontem")
 * @param date - Data a ser formatada
 * @returns Data formatada de forma relativa
 */
export const formatDateRelative = (date: Date | string | null | undefined): string => {
  if (!date) return '-';

  const now = new Date();
  const targetDate = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - targetDate.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'agora mesmo';
  }

  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `há ${minutes} minuto${minutes > 1 ? 's' : ''}`;
  }

  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `há ${hours} hora${hours > 1 ? 's' : ''}`;
  }

  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `há ${days} dia${days > 1 ? 's' : ''}`;
  }

  // Se for mais de uma semana, retorna a data formatada
  return formatDateTime(date);
};
