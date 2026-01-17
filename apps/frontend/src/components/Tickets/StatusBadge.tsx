import { TicketStatus } from '@/types/ticket.types';

interface StatusBadgeProps {
  status: TicketStatus;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  [TicketStatus.NEW]: {
    label: 'Novo',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  },
  [TicketStatus.IN_PROGRESS]: {
    label: 'Em Andamento',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  [TicketStatus.WAITING_CLIENT]: {
    label: 'Aguardando Cliente',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  },
  [TicketStatus.WAITING_THIRD_PARTY]: {
    label: 'Aguardando Terceiros',
    className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  },
  [TicketStatus.PAUSED]: {
    label: 'Pausado',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  },
  [TicketStatus.WAITING_APPROVAL]: {
    label: 'Aguardando Aprovação',
    className: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  },
  [TicketStatus.RESOLVED]: {
    label: 'Resolvido',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
  [TicketStatus.CANCELLED]: {
    label: 'Cancelado',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  },
};

// Fallback para status legados
const legacyStatusConfig: Record<string, { label: string; className: string }> = {
  ready_to_invoice: {
    label: 'Resolvido',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
  closed: {
    label: 'Resolvido',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || legacyStatusConfig[status] || {
    label: status,
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
