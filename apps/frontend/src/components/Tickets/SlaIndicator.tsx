import { Clock, CheckCircle, AlertTriangle, XCircle, Minus } from 'lucide-react';
import { formatDistanceToNow, isPast, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type SlaStatus = 'on_track' | 'warning' | 'breached' | 'completed' | 'none';

interface SlaIndicatorProps {
  dueDate?: string | null;
  completedAt?: string | null;
  type: 'first_response' | 'resolution';
  showLabel?: boolean;
  compact?: boolean;
}

function getSlaStatus(
  dueDate?: string | null,
  completedAt?: string | null
): { status: SlaStatus; remainingMinutes: number | null } {
  if (!dueDate) {
    return { status: 'none', remainingMinutes: null };
  }

  const due = new Date(dueDate);
  const now = new Date();

  // Se já foi completado
  if (completedAt) {
    const completed = new Date(completedAt);
    const wasOnTime = completed <= due;
    return {
      status: wasOnTime ? 'completed' : 'breached',
      remainingMinutes: null,
    };
  }

  // Se ainda não foi completado
  if (isPast(due)) {
    return { status: 'breached', remainingMinutes: differenceInMinutes(now, due) * -1 };
  }

  const remainingMinutes = differenceInMinutes(due, now);

  // Warning: menos de 2 horas restantes
  if (remainingMinutes <= 120) {
    return { status: 'warning', remainingMinutes };
  }

  return { status: 'on_track', remainingMinutes };
}

function formatTimeRemaining(minutes: number | null): string {
  if (minutes === null) return '';

  const absMinutes = Math.abs(minutes);
  const hours = Math.floor(absMinutes / 60);
  const mins = absMinutes % 60;

  if (minutes < 0) {
    // Vencido
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `Vencido há ${days}d`;
    }
    if (hours > 0) {
      return `Vencido há ${hours}h ${mins}m`;
    }
    return `Vencido há ${mins}m`;
  }

  // Restante
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

const statusConfig: Record<
  SlaStatus,
  {
    icon: typeof Clock;
    className: string;
    bgClassName: string;
    label: string;
  }
> = {
  on_track: {
    icon: Clock,
    className: 'text-green-600 dark:text-green-400',
    bgClassName: 'bg-green-100 dark:bg-green-900/30',
    label: 'No prazo',
  },
  warning: {
    icon: AlertTriangle,
    className: 'text-yellow-600 dark:text-yellow-400',
    bgClassName: 'bg-yellow-100 dark:bg-yellow-900/30',
    label: 'Atenção',
  },
  breached: {
    icon: XCircle,
    className: 'text-red-600 dark:text-red-400',
    bgClassName: 'bg-red-100 dark:bg-red-900/30',
    label: 'Vencido',
  },
  completed: {
    icon: CheckCircle,
    className: 'text-green-600 dark:text-green-400',
    bgClassName: 'bg-green-100 dark:bg-green-900/30',
    label: 'Cumprido',
  },
  none: {
    icon: Minus,
    className: 'text-gray-400 dark:text-gray-500',
    bgClassName: 'bg-gray-100 dark:bg-gray-800',
    label: 'Sem SLA',
  },
};

const typeLabels = {
  first_response: '1ª Resposta',
  resolution: 'Resolução',
};

export function SlaIndicator({
  dueDate,
  completedAt,
  type,
  showLabel = true,
  compact = false,
}: SlaIndicatorProps) {
  const { status, remainingMinutes } = getSlaStatus(dueDate, completedAt);
  const config = statusConfig[status];
  const Icon = config.icon;

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md ${config.bgClassName}`}
        title={`${typeLabels[type]}: ${config.label}`}
      >
        <Icon size={14} className={config.className} />
        {status !== 'none' && status !== 'completed' && remainingMinutes !== null && (
          <span className={`text-xs font-medium ${config.className}`}>
            {formatTimeRemaining(remainingMinutes)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {showLabel && (
        <span className="text-xs text-gray-500 dark:text-gray-400">{typeLabels[type]}</span>
      )}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${config.bgClassName}`}>
        <Icon size={16} className={config.className} />
        <div className="flex flex-col">
          <span className={`text-sm font-medium ${config.className}`}>{config.label}</span>
          {dueDate && status !== 'none' && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {status === 'completed' && completedAt
                ? `Concluído ${formatDistanceToNow(new Date(completedAt), {
                    addSuffix: true,
                    locale: ptBR,
                  })}`
                : remainingMinutes !== null
                  ? formatTimeRemaining(remainingMinutes)
                  : formatDistanceToNow(new Date(dueDate), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default SlaIndicator;
