import { useQuery } from '@tanstack/react-query';
import {
  Clock,
  User,
  Edit,
  Trash2,
  Plus,
  FileText,
  CheckCircle,
  XCircle,
  UserPlus,
  UserMinus,
  AlertTriangle,
  ArrowRight,
  Building,
  MessageSquare,
  Paperclip,
  Timer,
  RefreshCw,
} from 'lucide-react';
import { historyService } from '@/services/ticket-details.service';

interface TicketHistoryProps {
  ticketId: string;
}

// Labels para as ações
const actionLabels: Record<string, string> = {
  created: 'criou o ticket',
  updated: 'atualizou',
  deleted: 'removeu',
  commented: 'adicionou um comentário',
  status_changed: 'alterou o status',
  assigned: 'atribuiu o ticket',
  unassigned: 'removeu a atribuição',
  priority_changed: 'alterou a prioridade',
  client_changed: 'alterou o cliente',
  requester_changed: 'alterou o solicitante',
  attachment_added: 'adicionou um anexo',
  attachment_removed: 'removeu um anexo',
  appointment_added: 'registrou um apontamento',
  appointment_updated: 'atualizou um apontamento',
  follower_added: 'adicionou um seguidor',
  follower_removed: 'removeu um seguidor',
  closed: 'fechou o ticket',
  cancelled: 'cancelou o ticket',
  reopened: 'reabriu o ticket',
};

// Ícones para as ações
const actionIcons: Record<string, any> = {
  created: Plus,
  updated: Edit,
  deleted: Trash2,
  commented: MessageSquare,
  status_changed: RefreshCw,
  assigned: UserPlus,
  unassigned: UserMinus,
  priority_changed: AlertTriangle,
  client_changed: Building,
  requester_changed: User,
  attachment_added: Paperclip,
  attachment_removed: Paperclip,
  appointment_added: Timer,
  appointment_updated: Timer,
  follower_added: UserPlus,
  follower_removed: UserMinus,
  closed: CheckCircle,
  cancelled: XCircle,
  reopened: RefreshCw,
};

// Cores para as ações
const actionColors: Record<string, { bg: string; icon: string; border: string }> = {
  created: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    icon: 'text-green-600 dark:text-green-400',
    border: 'border-green-200 dark:border-green-800',
  },
  updated: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    icon: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
  },
  deleted: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    icon: 'text-red-600 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800',
  },
  commented: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    icon: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-200 dark:border-purple-800',
  },
  status_changed: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    icon: 'text-yellow-600 dark:text-yellow-400',
    border: 'border-yellow-200 dark:border-yellow-800',
  },
  assigned: {
    bg: 'bg-indigo-50 dark:bg-indigo-900/20',
    icon: 'text-indigo-600 dark:text-indigo-400',
    border: 'border-indigo-200 dark:border-indigo-800',
  },
  unassigned: {
    bg: 'bg-gray-50 dark:bg-gray-800',
    icon: 'text-gray-600 dark:text-gray-400',
    border: 'border-gray-200 dark:border-gray-700',
  },
  priority_changed: {
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    icon: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-200 dark:border-orange-800',
  },
  client_changed: {
    bg: 'bg-cyan-50 dark:bg-cyan-900/20',
    icon: 'text-cyan-600 dark:text-cyan-400',
    border: 'border-cyan-200 dark:border-cyan-800',
  },
  requester_changed: {
    bg: 'bg-teal-50 dark:bg-teal-900/20',
    icon: 'text-teal-600 dark:text-teal-400',
    border: 'border-teal-200 dark:border-teal-800',
  },
  closed: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    icon: 'text-green-600 dark:text-green-400',
    border: 'border-green-200 dark:border-green-800',
  },
  cancelled: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    icon: 'text-red-600 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800',
  },
  reopened: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    icon: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
  },
};

// Labels para status
const statusLabels: Record<string, string> = {
  new: 'Novo',
  in_progress: 'Em Andamento',
  waiting_client: 'Aguardando Cliente',
  waiting_third_party: 'Aguardando Terceiro',
  paused: 'Pausado',
  waiting_approval: 'Aguardando Aprovação',
  resolved: 'Resolvido',
  cancelled: 'Cancelado',
};

// Labels para prioridade
const priorityLabels: Record<string, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
};

// Labels para campos
const fieldLabels: Record<string, string> = {
  title: 'título',
  description: 'descrição',
  status: 'status',
  priority: 'prioridade',
  client_name: 'cliente',
  requester_name: 'solicitante',
  assigned_to_id: 'responsável',
  service_desk_id: 'mesa de serviço',
  category: 'categoria',
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

  const formatRelativeTime = (date: Date | string): string => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins} min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    return formatDate(date);
  };

  // Formatar valor para exibição
  const formatValue = (value: string | null, field: string | null): string => {
    if (!value) return '-';

    // Traduzir valores de status e prioridade
    if (field === 'status') {
      return statusLabels[value] || value;
    }
    if (field === 'priority') {
      return priorityLabels[value] || value;
    }

    return value;
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
          Histórico de Alterações
        </h3>
        <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-sm">
          {history.length} {history.length === 1 ? 'registro' : 'registros'}
        </span>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">Nenhuma alteração registrada</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
            O histórico será atualizado conforme ações forem realizadas
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Linha vertical do timeline */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 via-gray-300 to-gray-200 dark:from-blue-600 dark:via-gray-600 dark:to-gray-700"></div>

          <div className="space-y-4">
            {history.map((entry: any, index: number) => {
              const Icon = actionIcons[entry.action] || FileText;
              const colors = actionColors[entry.action] || actionColors.updated;
              const isFirst = index === 0;

              return (
                <div
                  key={entry.id}
                  className={`relative pl-16 ${isFirst ? 'animate-fadeIn' : ''}`}
                >
                  {/* Ícone no timeline */}
                  <div className={`absolute left-0 top-0 w-12 h-12 rounded-full border-2 flex items-center justify-center ${colors.bg} ${colors.border} shadow-sm`}>
                    <Icon className={`w-5 h-5 ${colors.icon}`} />
                  </div>

                  {/* Conteúdo */}
                  <div className={`rounded-lg border p-4 ${colors.bg} ${colors.border}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="text-sm text-gray-900 dark:text-white">
                          <span className="font-semibold">{entry.user?.name || 'Sistema'}</span>
                          {' '}
                          <span className="text-gray-600 dark:text-gray-400">
                            {actionLabels[entry.action] || entry.action}
                          </span>
                          {entry.field && (
                            <span className="text-gray-900 dark:text-white font-medium">
                              {' '}{fieldLabels[entry.field] || entry.field}
                            </span>
                          )}
                        </p>

                        {/* Valores alterados */}
                        {(entry.old_value || entry.new_value) && (
                          <div className="flex items-center gap-2 mt-2 text-sm">
                            {entry.old_value && (
                              <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded line-through">
                                {formatValue(entry.old_value, entry.field)}
                              </span>
                            )}
                            {entry.old_value && entry.new_value && (
                              <ArrowRight className="w-4 h-4 text-gray-400" />
                            )}
                            {entry.new_value && (
                              <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                                {formatValue(entry.new_value, entry.field)}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Descrição adicional */}
                        {entry.description && (
                          <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 italic">
                            "{entry.description}"
                          </p>
                        )}
                      </div>

                      {/* Tempo */}
                      <div className="text-right flex-shrink-0 ml-4">
                        <span className="text-xs text-gray-500 dark:text-gray-500 whitespace-nowrap" title={formatDate(entry.created_at)}>
                          {formatRelativeTime(entry.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Legenda */}
      {history.length > 0 && (
        <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-500 mb-3">Legenda:</p>
          <div className="flex flex-wrap gap-3">
            {[
              { action: 'created', label: 'Criação' },
              { action: 'status_changed', label: 'Status' },
              { action: 'priority_changed', label: 'Prioridade' },
              { action: 'assigned', label: 'Atribuição' },
              { action: 'commented', label: 'Comentário' },
              { action: 'closed', label: 'Fechamento' },
              { action: 'cancelled', label: 'Cancelamento' },
            ].map(({ action, label }) => {
              const Icon = actionIcons[action];
              const colors = actionColors[action];
              return (
                <div key={action} className="flex items-center gap-1.5">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${colors.bg} ${colors.border} border`}>
                    <Icon className={`w-3 h-3 ${colors.icon}`} />
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
