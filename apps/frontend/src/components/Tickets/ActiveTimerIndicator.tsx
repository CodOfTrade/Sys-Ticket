import { useQuery } from '@tanstack/react-query';
import { appointmentsService } from '@/services/ticket-details.service';

interface ActiveTimerIndicatorProps {
  ticketId: string;
}

export function ActiveTimerIndicator({ ticketId }: ActiveTimerIndicatorProps) {
  const { data: activeTimer } = useQuery({
    queryKey: ['active-timer', ticketId],
    queryFn: () => appointmentsService.getActiveTimer(ticketId),
    refetchInterval: 10000, // Atualizar a cada 10 segundos
  });

  const isTimerActive = activeTimer?.timer_started_at && !activeTimer?.timer_stopped_at;

  if (!isTimerActive) {
    return null;
  }

  // Bolinha vermelha pulsante
  return (
    <span
      className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"
      title="Timer ativo"
    />
  );
}
