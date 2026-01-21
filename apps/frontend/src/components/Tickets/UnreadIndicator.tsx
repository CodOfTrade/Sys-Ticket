import { useState, useEffect, useCallback } from 'react';
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
  const [hasUnread, setHasUnread] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const checkUnread = useCallback(async () => {
    if (!ticketId) return;

    try {
      const comments = await commentsService.getComments(ticketId);

      if (!comments || comments.length === 0) {
        setHasUnread(false);
        setIsLoaded(true);
        return;
      }

      const lastViewed = getLastViewedTimestamp(ticketId);

      // Se nunca visualizou e tem comentários, tem não lidos
      if (lastViewed === 0) {
        setHasUnread(true);
        setIsLoaded(true);
        return;
      }

      // Verificar se algum comentário é mais recente que a última visualização
      const hasNew = comments.some((comment: any) => {
        const commentDate = new Date(comment.created_at).getTime();
        return commentDate > lastViewed;
      });

      setHasUnread(hasNew);
      setIsLoaded(true);
    } catch (error) {
      // Em caso de erro, não mostra indicador
      setHasUnread(false);
      setIsLoaded(true);
    }
  }, [ticketId]);

  useEffect(() => {
    if (!ticketId) return;

    // Verificar imediatamente
    checkUnread();

    // Escutar evento customizado quando o usuário visualiza as comunicações
    const handleCommunicationViewed = (e: CustomEvent) => {
      if (e.detail?.ticketId === ticketId) {
        // Aguardar um pouco para garantir que o localStorage foi atualizado
        setTimeout(() => {
          checkUnread();
        }, 100);
      }
    };

    // Também verificar quando a janela ganha foco (usuário volta da página de detalhes)
    const handleFocus = () => {
      checkUnread();
    };

    window.addEventListener('communication-viewed', handleCommunicationViewed as EventListener);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('communication-viewed', handleCommunicationViewed as EventListener);
      window.removeEventListener('focus', handleFocus);
    };
  }, [ticketId, checkUnread]);

  // Não renderiza nada até carregar ou se não tem não lidos
  if (!isLoaded || !hasUnread) {
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
