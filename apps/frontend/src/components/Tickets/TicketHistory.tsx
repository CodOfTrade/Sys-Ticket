import { useQuery } from '@tanstack/react-query';
import { Clock, User, Edit, Trash2, Plus, FileText } from 'lucide-react';
import { historyService } from '@/services/ticket-details.service';

interface TicketHistoryProps {
  ticketId: string;
}

const actionLabels: Record<string, string> = {
  created: 'Criou',
  updated: 'Atualizou',
  deleted: 'Deletou',
  commented: 'Comentou',
  status_changed: 'Mudou o status',
  assigned: 'Atribuiu',
  unassigned: 'Removeu atribuição',
  priority_changed: 'Mudou a prioridade',
};

const actionIcons: Record<string, any> = {
  created: Plus,
  updated: Edit,
  deleted: Trash2,
  commented: FileText,
  status_changed: Clock,
  assigned: User,
  unassigned: User,
  priority_changed: Clock,
};

export function TicketHistory({ ticketId }: TicketHistoryProps) {
  // Buscar histórico do ticket
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['ticket-history', ticketId],
    queryFn: () => historyService.getTicketHistory(ticketId),
  });

  const formatDate = (date: Date | string): string => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p className="text-gray-600 dark:text-gray-400">Carregando histórico...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Histórico de Alterações ({history.length})
        </h3>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">Nenhuma alteração registrada</p>
        </div>
      ) : (
        <div className="relative">
          {/* Linha vertical do timeline */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>

          <div className="space-y-4">
            {history.map((entry: any) => {
              const Icon = actionIcons[entry.action] || FileText;

              return (
                <div
                  key={entry.id}
                  className="relative pl-16 pb-4"
                >
                  {/* Ícone no timeline */}
                  <div className="absolute left-0 top-0 w-12 h-12 bg-white dark:bg-gray-800 rounded-full border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </div>

                  {/* Conteúdo */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm text-gray-900 dark:text-white">
                          <span className="font-medium">{entry.user?.name || 'Sistema'}</span>
                          {' '}
                          <span className="text-gray-600 dark:text-gray-400">
                            {actionLabels[entry.action] || entry.action}
                          </span>
                          {entry.field && (
                            <span className="text-gray-900 dark:text-white">
                              {' '}{entry.field}
                            </span>
                          )}
                        </p>
                        {entry.old_value && entry.new_value && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            De <span className="font-medium">{entry.old_value}</span>
                            {' '}para{' '}
                            <span className="font-medium">{entry.new_value}</span>
                          </p>
                        )}
                        {entry.description && (
                          <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                            {entry.description}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-500">
                        {formatDate(entry.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
