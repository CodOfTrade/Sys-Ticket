import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Send, User, Clock, Trash2, Eye, EyeOff } from 'lucide-react';
import { commentsService } from '@/services/ticket-details.service';
import { CommentType, CommentVisibility, CreateCommentDto } from '@/types/ticket-details.types';

interface TicketCommunicationProps {
  ticketId: string;
}

const commentTypeLabels: Record<CommentType, string> = {
  [CommentType.CLIENT]: 'Cliente',
  [CommentType.INTERNAL]: 'Interno',
  [CommentType.CHAT]: 'Chat',
};

const commentTypeColors: Record<CommentType, string> = {
  [CommentType.CLIENT]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  [CommentType.INTERNAL]: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  [CommentType.CHAT]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
};

// Tipos de comentário permitidos para criação (sem Chat)
const allowedCommentTypes = [CommentType.CLIENT, CommentType.INTERNAL];

export function TicketCommunication({ ticketId }: TicketCommunicationProps) {
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<CommentType>(CommentType.CLIENT);
  const [newComment, setNewComment] = useState('');
  const [commentVisibility, setCommentVisibility] = useState<CommentVisibility>(
    CommentVisibility.PRIVATE
  );

  // commentType e sendToClient agora derivam de selectedType
  const commentType = selectedType;
  const sendToClient = selectedType === CommentType.CLIENT;

  // Buscar comentários
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['comments', ticketId, selectedType],
    queryFn: () => commentsService.getComments(ticketId, selectedType),
  });

  // Mutation para criar comentário
  const createMutation = useMutation({
    mutationFn: (data: CreateCommentDto) => commentsService.createComment(ticketId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', ticketId] });
      setNewComment('');
    },
  });

  // Mutation para deletar comentário
  const deleteMutation = useMutation({
    mutationFn: (commentId: string) => commentsService.deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', ticketId] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    createMutation.mutate({
      content: newComment,
      type: commentType,
      visibility: commentVisibility,
      sent_to_client: sendToClient,
    });
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {allowedCommentTypes.map((type) => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedType === type
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {commentTypeLabels[type]}
          </button>
        ))}
      </div>

      {/* Formulário de novo comentário */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Visibilidade
          </label>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="visibility"
                value={CommentVisibility.PUBLIC}
                checked={commentVisibility === CommentVisibility.PUBLIC}
                onChange={(e) => setCommentVisibility(e.target.value as CommentVisibility)}
                className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <Eye className="w-4 h-4" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Público</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="visibility"
                value={CommentVisibility.PRIVATE}
                checked={commentVisibility === CommentVisibility.PRIVATE}
                onChange={(e) => setCommentVisibility(e.target.value as CommentVisibility)}
                className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <EyeOff className="w-4 h-4" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Privado</span>
            </label>
          </div>
        </div>

        <div className="mb-4">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Digite seu comentário..."
            required
          />
        </div>

        <div className="flex items-center justify-between">
          {sendToClient ? (
            <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2 font-medium">
              <Send className="w-4 h-4" />
              Email será enviado automaticamente para o cliente
            </span>
          ) : (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Comentário interno - não será enviado ao cliente
            </span>
          )}

          <button
            type="submit"
            disabled={createMutation.isPending || !newComment.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            {createMutation.isPending ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </form>

      {/* Lista de comentários */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">Carregando...</div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Nenhum comentário encontrado</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
            >
              {/* Header do comentário */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  {comment.user?.avatar_url ? (
                    <img
                      src={comment.user.avatar_url}
                      alt={comment.user.name}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                      {comment.user ? getInitials(comment.user.name) : <User className="w-5 h-5" />}
                    </div>
                  )}

                  {/* Informações do usuário */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {comment.user?.name || 'Usuário Desconhecido'}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${commentTypeColors[comment.type]}`}>
                        {commentTypeLabels[comment.type]}
                      </span>
                      {comment.visibility === CommentVisibility.PRIVATE && (
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 flex items-center gap-1">
                          <EyeOff className="w-3 h-3" />
                          Privado
                        </span>
                      )}
                      {comment.sent_to_client && (
                        <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                          Enviado ao cliente
                        </span>
                      )}
                      {comment.is_edited && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">(editado)</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 mt-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(comment.created_at)}
                      {comment.sent_at && ` • Enviado em ${formatDate(comment.sent_at)}`}
                    </div>
                  </div>
                </div>

                {/* Ações - Apenas excluir para comentários INTERNOS */}
                {comment.type === CommentType.INTERNAL && (
                  <button
                    onClick={() => {
                      if (confirm('Deseja realmente excluir este comentário?')) {
                        deleteMutation.mutate(comment.id);
                      }
                    }}
                    className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Conteúdo do comentário */}
              <div className="prose dark:prose-invert max-w-none">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {comment.content}
                </p>
              </div>

              {/* Anexos */}
              {comment.attachment_ids && comment.attachment_ids.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {comment.attachment_ids.length} anexo(s)
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
