import { useState } from 'react';
import { Clock, CheckCircle, AlertTriangle, XCircle, Minus } from 'lucide-react';
import { isPast, differenceInMinutes } from 'date-fns';

type SlaStatus = 'on_track' | 'warning' | 'breached' | 'completed' | 'none';

interface SlaHeaderBadgeProps {
  firstResponseDue?: string | null;
  resolutionDue?: string | null;
  firstResponseAt?: string | null;
  resolvedAt?: string | null;
  slaViolated?: boolean;
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

  if (completedAt) {
    const completed = new Date(completedAt);
    const wasOnTime = completed <= due;
    return {
      status: wasOnTime ? 'completed' : 'breached',
      remainingMinutes: null,
    };
  }

  if (isPast(due)) {
    return { status: 'breached', remainingMinutes: differenceInMinutes(now, due) * -1 };
  }

  const remainingMinutes = differenceInMinutes(due, now);

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
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `Vencido ha ${days}d`;
    }
    if (hours > 0) {
      return `Vencido ha ${hours}h ${mins}m`;
    }
    return `Vencido ha ${mins}m`;
  }

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

const statusPriority: Record<SlaStatus, number> = {
  breached: 4,
  warning: 3,
  on_track: 2,
  completed: 1,
  none: 0,
};

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
    bgClassName: 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800',
    label: 'No prazo',
  },
  warning: {
    icon: AlertTriangle,
    className: 'text-yellow-600 dark:text-yellow-400',
    bgClassName: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800',
    label: 'Atencao',
  },
  breached: {
    icon: XCircle,
    className: 'text-red-600 dark:text-red-400',
    bgClassName: 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800',
    label: 'Vencido',
  },
  completed: {
    icon: CheckCircle,
    className: 'text-green-600 dark:text-green-400',
    bgClassName: 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800',
    label: 'Cumprido',
  },
  none: {
    icon: Minus,
    className: 'text-gray-400 dark:text-gray-500',
    bgClassName: 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
    label: 'Sem SLA',
  },
};

export function SlaHeaderBadge({
  firstResponseDue,
  resolutionDue,
  firstResponseAt,
  resolvedAt,
}: SlaHeaderBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const firstResponse = getSlaStatus(firstResponseDue, firstResponseAt);
  const resolution = getSlaStatus(resolutionDue, resolvedAt);

  // Determinar o status mais crítico para exibir no badge
  const worstStatus =
    statusPriority[firstResponse.status] >= statusPriority[resolution.status]
      ? firstResponse
      : resolution;

  const worstStatusType =
    statusPriority[firstResponse.status] >= statusPriority[resolution.status]
      ? 'first_response'
      : 'resolution';

  // Se ambos são 'none', não exibir badge
  if (firstResponse.status === 'none' && resolution.status === 'none') {
    return null;
  }

  const config = statusConfig[worstStatus.status];
  const Icon = config.icon;

  // Texto do badge principal
  let badgeText = config.label;
  if (worstStatus.status !== 'none' && worstStatus.status !== 'completed' && worstStatus.remainingMinutes !== null) {
    badgeText = formatTimeRemaining(worstStatus.remainingMinutes);
  }

  return (
    <div className="relative">
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`px-3 py-1 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 border ${config.bgClassName}`}
      >
        <Icon className={`w-3.5 h-3.5 ${config.className}`} />
        <span className={config.className}>SLA: {badgeText}</span>
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute top-full left-0 mt-2 z-50 min-w-[220px]">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 space-y-2">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Detalhes do SLA
            </h4>

            {/* Primeira Resposta */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-gray-600 dark:text-gray-400">1a Resposta:</span>
              <div className="flex items-center gap-1">
                {(() => {
                  const cfg = statusConfig[firstResponse.status];
                  const StatusIcon = cfg.icon;
                  return (
                    <>
                      <StatusIcon className={`w-3.5 h-3.5 ${cfg.className}`} />
                      <span className={`text-xs font-medium ${cfg.className}`}>
                        {firstResponse.status === 'none'
                          ? 'N/A'
                          : firstResponse.status === 'completed'
                            ? 'Cumprido'
                            : firstResponse.remainingMinutes !== null
                              ? formatTimeRemaining(firstResponse.remainingMinutes)
                              : cfg.label}
                      </span>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Resolução */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-gray-600 dark:text-gray-400">Resolucao:</span>
              <div className="flex items-center gap-1">
                {(() => {
                  const cfg = statusConfig[resolution.status];
                  const StatusIcon = cfg.icon;
                  return (
                    <>
                      <StatusIcon className={`w-3.5 h-3.5 ${cfg.className}`} />
                      <span className={`text-xs font-medium ${cfg.className}`}>
                        {resolution.status === 'none'
                          ? 'N/A'
                          : resolution.status === 'completed'
                            ? 'Cumprido'
                            : resolution.remainingMinutes !== null
                              ? formatTimeRemaining(resolution.remainingMinutes)
                              : cfg.label}
                      </span>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SlaHeaderBadge;
