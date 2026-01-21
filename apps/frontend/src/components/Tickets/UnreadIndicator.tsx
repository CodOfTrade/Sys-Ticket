import { useQuery } from '@tanstack/react-query';
import { commentsService } from '@/services/ticket-details.service';

interface UnreadIndicatorProps {
  ticketId: string;
}

// Helper functions para gerenciar o localStorage (mesma lógica do TicketDetails)
const getLastViewedKey = (ticketId: string) => `ticket_${ticketId}_communication_last_viewed`;

const getLastViewedTimestamp = (ticketId: string): number => {
  const stored = localStorage.getItem(getLastViewedKey(ticketId));
  return stored ? parseInt(stored, 10) : 0;
};

export function UnreadIndicator({ ticketId }: UnreadIndicatorProps) {
  // Buscar comentários do ticket
  const { data: comments, isLoading, isError } = useQuery({
    queryKey: ['ticket-comments-unread', ticketId],
    queryFn: async () => {
      const result = await commentsService.getComments(ticketId);
      return result;
    },
    enabled: !!ticketId,
    staleTime: 60000, // Cache por 1 minuto
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Verificar se há mensagens não lidas
  const hasUnread = (): boolean => {
    if (isLoading || isError) return false;
    if (!comments || comments.length === 0) return false;
    const lastViewed = getLastViewedTimestamp(ticketId);
    if (lastViewed === 0) return true; // Nunca visualizou

    return comments.some((comment: any) => {
      const commentDate = new Date(comment.created_at).getTime();
      return commentDate > lastViewed;
    });
  };

  if (!hasUnread()) {
    return null;
  }

  // Bolinha amarela igual à da aba de comunicação
  return (
    <span
      className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse"
      title="Novas comunicacoes"
    />
  );
}
