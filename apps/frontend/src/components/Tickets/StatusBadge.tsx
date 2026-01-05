import { TicketStatus } from '@/types/ticket.types';

interface StatusBadgeProps {
  status: TicketStatus;
}

const statusConfig = {
  [TicketStatus.OPEN]: {
    label: 'Aberto',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  },
  [TicketStatus.IN_PROGRESS]: {
    label: 'Em Andamento',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  [TicketStatus.PENDING]: {
    label: 'Pendente',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  },
  [TicketStatus.RESOLVED]: {
    label: 'Resolvido',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
  [TicketStatus.CLOSED]: {
    label: 'Fechado',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  },
  [TicketStatus.CANCELLED]: {
    label: 'Cancelado',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
