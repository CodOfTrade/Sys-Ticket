import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle,
  XCircle,
  Clock,
  User,
  Search,
  Filter,
  Eye,
  Calendar,
  Building2,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react';
import { ticketService } from '@/services/ticket.service';
import { commentsService } from '@/services/ticket-details.service';
import { TicketStatus, TicketPriority, Ticket } from '@/types/ticket.types';
import { CommentType, CommentVisibility } from '@/types/ticket-details.types';
import { StatusBadge } from '@/components/Tickets/StatusBadge';
import { PriorityBadge } from '@/components/Tickets/PriorityBadge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function TicketApproval() {
  const queryClient = useQueryClient();

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [technicianFilter, setTechnicianFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Modal de aprovação/rejeição
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [comment, setComment] = useState('');

  // Query para buscar tickets em avaliação
  const { data, isLoading, error } = useQuery({
    queryKey: ['tickets', { status: TicketStatus.WAITING_EVALUATION }],
    queryFn: () =>
      ticketService.getAll({
        status: TicketStatus.WAITING_EVALUATION,
      }),
  });

  // Mutation para aprovar ticket
  const approveMutation = useMutation({
    mutationFn: async ({ ticketId, comment }: { ticketId: string; comment?: string }) => {
      // Se houver comentário, adiciona ao ticket
      if (comment && comment.trim()) {
        await commentsService.createComment(ticketId, {
          content: `**Ticket aprovado pelo Ticket Master**\n\n${comment}`,
          type: CommentType.INTERNAL,
          visibility: CommentVisibility.PRIVATE,
        });
      }
      // Atualiza o status para aprovado
      return ticketService.update(ticketId, { status: TicketStatus.APPROVED });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      closeModal();
    },
  });

  // Mutation para rejeitar ticket (reabrir)
  const rejectMutation = useMutation({
    mutationFn: async ({ ticketId, reason }: { ticketId: string; reason: string }) => {
      // Primeiro adiciona o comentário com o motivo da rejeição
      await commentsService.createComment(ticketId, {
        content: `**Ticket rejeitado pelo Ticket Master**\n\nMotivo: ${reason}`,
        type: CommentType.INTERNAL,
        visibility: CommentVisibility.PRIVATE,
      });
      // Depois atualiza o status para reaberto
      return ticketService.update(ticketId, { status: TicketStatus.REOPENED });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      closeModal();
    },
  });

  const tickets = data?.tickets || [];

  // Filtrar tickets
  const filteredTickets = tickets.filter((ticket) => {
    // Filtro de busca
    const matchesSearch =
      ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.client_name.toLowerCase().includes(searchTerm.toLowerCase());

    // Filtro de técnico
    const matchesTechnician =
      !technicianFilter ||
      ticket.assigned_to?.id === technicianFilter ||
      ticket.assigned_to?.name?.toLowerCase().includes(technicianFilter.toLowerCase());

    // Filtro de data
    let matchesDate = true;
    if (dateFrom) {
      const ticketDate = new Date(ticket.created_at);
      const fromDate = new Date(dateFrom);
      matchesDate = ticketDate >= fromDate;
    }
    if (dateTo && matchesDate) {
      const ticketDate = new Date(ticket.created_at);
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      matchesDate = ticketDate <= toDate;
    }

    return matchesSearch && matchesTechnician && matchesDate;
  });

  // Listar técnicos únicos dos tickets
  const uniqueTechnicians = Array.from(
    new Map(
      tickets
        .filter((t) => t.assigned_to)
        .map((t) => [t.assigned_to!.id, t.assigned_to!])
    ).values()
  );

  const openApproveModal = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setActionType('approve');
    setComment('');
  };

  const openRejectModal = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setActionType('reject');
    setComment('');
  };

  const closeModal = () => {
    setSelectedTicket(null);
    setActionType(null);
    setComment('');
  };

  const handleConfirmAction = () => {
    if (!selectedTicket) return;

    if (actionType === 'approve') {
      approveMutation.mutate({ ticketId: selectedTicket.id, comment: comment || undefined });
    } else if (actionType === 'reject') {
      rejectMutation.mutate({ ticketId: selectedTicket.id, reason: comment });
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setTechnicianFilter('');
    setDateFrom('');
    setDateTo('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            Aprovação de Tickets
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Revise e aprove tickets fechados pelos técnicos
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded-lg flex items-center gap-2">
            <Clock size={20} />
            <span className="font-semibold">{filteredTickets.length}</span>
            <span className="text-sm">aguardando avaliação</span>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Buscar por título, número ou cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Filter Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
              showFilters || technicianFilter || dateFrom || dateTo
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            <Filter size={20} />
            Filtros
            {(technicianFilter || dateFrom || dateTo) && (
              <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
            )}
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Técnico */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Técnico Responsável
                </label>
                <select
                  value={technicianFilter}
                  onChange={(e) => setTechnicianFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Todos os técnicos</option>
                  {uniqueTechnicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Data Início */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Data Inicial
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Data Fim */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Data Final
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Limpar Filtros */}
            {(technicianFilter || dateFrom || dateTo) && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={clearFilters}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Limpar filtros
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">Aguardando</p>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
            {filteredTickets.length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">Alta Prioridade</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
            {filteredTickets.filter((t) => t.priority === TicketPriority.HIGH || t.priority === TicketPriority.URGENT).length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">Mais de 24h</p>
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
            {filteredTickets.filter((t) => {
              const created = new Date(t.created_at);
              const now = new Date();
              const diffHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
              return diffHours > 24;
            }).length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">Técnicos</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {uniqueTechnicians.length}
          </p>
        </div>
      </div>

      {/* Tickets List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Carregando tickets...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400">Erro ao carregar tickets</p>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <p className="text-xl font-semibold text-gray-900 dark:text-white">
            Nenhum ticket aguardando avaliação
          </p>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Todos os tickets foram processados!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTickets.map((ticket) => {
            const created = new Date(ticket.created_at);
            const now = new Date();
            const diffHours = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60));
            const isOld = diffHours > 24;

            return (
              <div
                key={ticket.id}
                className={`bg-white dark:bg-gray-800 rounded-xl border p-6 transition-all hover:shadow-md ${
                  isOld
                    ? 'border-orange-300 dark:border-orange-700'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                  {/* Informações do Ticket */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            #{ticket.ticket_number}
                          </span>
                          <StatusBadge status={ticket.status} />
                          <PriorityBadge priority={ticket.priority} />
                          {isOld && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                              <AlertTriangle size={12} />
                              Aguardando há {diffHours}h
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mt-2 truncate">
                          {ticket.title}
                        </h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Building2 size={14} />
                            {ticket.client_name}
                          </span>
                          {ticket.assigned_to && (
                            <span className="flex items-center gap-1">
                              <User size={14} />
                              {ticket.assigned_to.name}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar size={14} />
                            {format(new Date(ticket.created_at), "dd/MM/yyyy HH:mm", {
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Preview da descrição */}
                    {ticket.description && (
                      <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {ticket.description.replace(/<[^>]*>/g, '').substring(0, 200)}
                          {ticket.description.length > 200 && '...'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex lg:flex-col gap-2 lg:w-40">
                    <Link
                      to={`/tickets/${ticket.id}`}
                      className="flex-1 lg:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Eye size={18} />
                      <span>Ver Detalhes</span>
                    </Link>
                    <button
                      onClick={() => openApproveModal(ticket)}
                      className="flex-1 lg:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      <CheckCircle size={18} />
                      <span>Aprovar</span>
                    </button>
                    <button
                      onClick={() => openRejectModal(ticket)}
                      className="flex-1 lg:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                      <XCircle size={18} />
                      <span>Rejeitar</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Confirmação */}
      {selectedTicket && actionType && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                {actionType === 'approve' ? (
                  <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {actionType === 'approve' ? 'Aprovar Ticket' : 'Rejeitar Ticket'}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    #{selectedTicket.ticket_number}
                  </p>
                </div>
              </div>

              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {actionType === 'approve'
                  ? 'O ticket será marcado como "Aprovado - Enviado para Faturamento".'
                  : 'O ticket será reaberto e retornará ao técnico responsável.'}
              </p>

              {/* Campo de comentário (obrigatório apenas para rejeição) */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <MessageSquare size={14} className="inline mr-1" />
                  {actionType === 'approve' ? 'Comentário (opcional)' : 'Motivo da rejeição'}
                  {actionType === 'reject' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={
                    actionType === 'approve'
                      ? 'Adicione um comentário...'
                      : 'Descreva o motivo da rejeição...'
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                  rows={3}
                />
              </div>

              {/* Botões */}
              <div className="flex gap-3">
                <button
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmAction}
                  disabled={
                    (actionType === 'reject' && !comment.trim()) ||
                    approveMutation.isPending ||
                    rejectMutation.isPending
                  }
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    actionType === 'approve'
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  {approveMutation.isPending || rejectMutation.isPending
                    ? 'Processando...'
                    : actionType === 'approve'
                    ? 'Confirmar Aprovação'
                    : 'Confirmar Rejeição'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
