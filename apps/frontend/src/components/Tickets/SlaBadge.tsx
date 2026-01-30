import { Clock, CheckCircle, AlertTriangle, XCircle, Minus } from 'lucide-react';
import { isPast, differenceInMinutes } from 'date-fns';

export type SlaBadgeStatus = 'on_track' | 'warning' | 'critical' | 'breached' | 'completed' | 'none';

interface SlaBadgeProps {
  firstResponseDue?: string | null;
  resolutionDue?: string | null;
  firstResponseAt?: string | null;
  resolvedAt?: string | null;
  slaViolated?: boolean;
}

function getWorstStatus(
  firstResponseDue?: string | null,
  resolutionDue?: string | null,
  firstResponseAt?: string | null,
  resolvedAt?: string | null,
  slaViolated?: boolean
): { status: SlaBadgeStatus; timeText: string; tooltip: string } {
  // Se não tem SLA definido
  if (!firstResponseDue && !resolutionDue) {
    return { status: 'none', timeText: '-', tooltip: 'Sem SLA definido' };
  }

  // Se já foi resolvido
  if (resolvedAt) {
    const wasViolated = slaViolated || false;
    return {
      status: wasViolated ? 'breached' : 'completed',
      timeText: wasViolated ? 'Violado' : 'OK',
      tooltip: wasViolated ? 'SLA foi violado' : 'SLA cumprido',
    };
  }

  const now = new Date();
  let worstStatus: SlaBadgeStatus = 'on_track';
  let mostUrgentMinutes: number | null = null;
  let mostUrgentType: 'first_response' | 'resolution' = 'first_response';

  // Verificar primeira resposta (se ainda não foi feita)
  if (firstResponseDue && !firstResponseAt) {
    const due = new Date(firstResponseDue);
    if (isPast(due)) {
      return {
        status: 'breached',
        timeText: 'Vencido',
        tooltip: '1ª Resposta: SLA vencido',
      };
    }
    const remaining = differenceInMinutes(due, now);
    if (remaining <= 30) {
      worstStatus = 'critical';
      mostUrgentMinutes = remaining;
      mostUrgentType = 'first_response';
    } else if (remaining <= 120) {
      worstStatus = 'warning';
      mostUrgentMinutes = remaining;
      mostUrgentType = 'first_response';
    } else {
      mostUrgentMinutes = remaining;
      mostUrgentType = 'first_response';
    }
  }

  // Verificar resolução
  if (resolutionDue) {
    const due = new Date(resolutionDue);
    if (isPast(due)) {
      return {
        status: 'breached',
        timeText: 'Vencido',
        tooltip: 'Resolução: SLA vencido',
      };
    }
    const remaining = differenceInMinutes(due, now);

    // Só atualiza se for mais urgente que a primeira resposta
    if (
      mostUrgentMinutes === null ||
      remaining < mostUrgentMinutes ||
      (firstResponseAt && remaining <= mostUrgentMinutes)
    ) {
      if (remaining <= 30) {
        worstStatus = 'critical';
        mostUrgentMinutes = remaining;
        mostUrgentType = 'resolution';
      } else if (remaining <= 120 && worstStatus !== 'critical') {
        worstStatus = 'warning';
        mostUrgentMinutes = remaining;
        mostUrgentType = 'resolution';
      } else if (worstStatus === 'on_track') {
        mostUrgentMinutes = remaining;
        mostUrgentType = 'resolution';
      }
    }
  }

  // Formatar texto de tempo
  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  const typeLabel = mostUrgentType === 'first_response' ? '1ª Resp' : 'Resolução';
  const timeText = mostUrgentMinutes !== null ? formatTime(mostUrgentMinutes) : '-';
  const tooltip = `${typeLabel}: ${mostUrgentMinutes !== null ? `${formatTime(mostUrgentMinutes)} restantes` : 'Sem prazo'}`;

  return { status: worstStatus, timeText, tooltip };
}

const statusConfig: Record<
  SlaBadgeStatus,
  {
    icon: typeof Clock;
    className: string;
    animate?: boolean;
  }
> = {
  on_track: {
    icon: Clock,
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
  warning: {
    icon: AlertTriangle,
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  critical: {
    icon: AlertTriangle,
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    animate: true,
  },
  breached: {
    icon: XCircle,
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    animate: true,
  },
  completed: {
    icon: CheckCircle,
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
  none: {
    icon: Minus,
    className: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  },
};

export function SlaBadge({
  firstResponseDue,
  resolutionDue,
  firstResponseAt,
  resolvedAt,
  slaViolated,
}: SlaBadgeProps) {
  const { status, timeText, tooltip } = getWorstStatus(
    firstResponseDue,
    resolutionDue,
    firstResponseAt,
    resolvedAt,
    slaViolated
  );
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
      title={tooltip}
    >
      <Icon size={12} className={config.animate ? 'animate-pulse' : ''} />
      {timeText}
    </span>
  );
}

export default SlaBadge;
