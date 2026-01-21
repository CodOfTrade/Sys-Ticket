import { useQuery } from '@tanstack/react-query';
import { commentsService } from '@/services/ticket-details.service';

// Helper functions para gerenciar o localStorage
const getLastViewedKey = (ticketId: string) => `ticket_${ticketId}_communication_last_viewed`;

export const getLastViewedTimestamp = (ticketId: string): number => {
  const stored = localStorage.getItem(getLastViewedKey(ticketId));
  return stored ? parseInt(stored, 10) : 0;
};

export const markCommunicationAsViewed = (ticketId: string) => {
  localStorage.setItem(getLastViewedKey(ticketId), Date.now().toString());
};

export function useUnreadCommunications(ticketId: string | undefined) {
  // Buscar comentários do ticket
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['comments', ticketId, undefined],
    queryFn: () => commentsService.getComments(ticketId!),
    enabled: !!ticketId,
    staleTime: 30000,
    refetchInterval: 60000,
  });

  // Verificar se há mensagens não lidas
  const hasUnreadMessages = (): boolean => {
    if (!ticketId || isLoading) return false;
    if (!comments || comments.length === 0) return false;

    const lastViewed = getLastViewedTimestamp(ticketId);
    if (lastViewed === 0) return true; // Nunca visualizou

    return comments.some((comment: any) => {
      const commentDate = new Date(comment.created_at).getTime();
      return commentDate > lastViewed;
    });
  };

  return {
    comments,
    isLoading,
    hasUnreadMessages: hasUnreadMessages(),
    markAsViewed: () => ticketId && markCommunicationAsViewed(ticketId),
  };
}
