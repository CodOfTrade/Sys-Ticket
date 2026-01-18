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
  Building2,
  MessageSquare,
  Receipt,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { ticketService, BillingSummary } from '@/services/ticket.service';
import { commentsService } from '@/services/ticket-details.service';
import { TicketStatus, TicketPriority, Ticket } from '@/types/ticket.types';
import { CommentType, CommentVisibility } from '@/types/ticket-details.types';
import { PriorityBadge } from '@/components/Tickets/PriorityBadge';

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
  const [billingSummary, setBillingSummary] = useState<BillingSummary | null>(null);
  const [loadingBilling, setLoadingBilling] = useState(false);
  const [sigeResult, setSigeResult] = useState<{ success: boolean; message: string; sigeOrderId?: number } | null>(null);

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
      // 1. Criar OS no SIGE Cloud (se houver itens faturáveis)
      let sigeOrderId: number | undefined;
      try {
        const sigeResponse = await ticketService.createServiceOrder(ticketId);
        sigeOrderId = sigeResponse?.sigeOrderId;
        setSigeResult({
          success: true,
          message: sigeOrderId
            ? `OS #${sigeOrderId} criada no SIGE`
            : 'Aprovado sem itens para faturamento',
          sigeOrderId,
        });
      } catch (error: any) {
        console.error('Erro ao criar OS no SIGE:', error);
        setSigeResult({
          success: false,
          message: `Erro SIGE: ${error?.response?.data?.message || error.message}`,
        });
        // Continua mesmo com erro no SIGE
      }

      // 2. Se houver comentário, adiciona ao ticket
      if (comment && comment.trim()) {
        await commentsService.createComment(ticketId, {
          content: `**Ticket aprovado pelo Ticket Master**\n\n${comment}${sigeOrderId ? `\n\n_OS SIGE: #${sigeOrderId}_` : ''}`,
          type: CommentType.INTERNAL,
          visibility: CommentVisibility.PRIVATE,
        });
      }

      // 3. Atualiza o status para aprovado
      return ticketService.update(ticketId, { status: TicketStatus.APPROVED });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      // Não fecha modal imediatamente para mostrar resultado
      setTimeout(() => closeModal(), 2000);
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

  const openApproveModal = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setActionType('approve');
    setComment('');
    setBillingSummary(null);
    setSigeResult(null);

    // Buscar resumo de faturamento
    setLoadingBilling(true);
    try {
      const summary = await ticketService.getBillingSummary(ticket.id);
      setBillingSummary(summary);
    } catch (error) {
      console.error('Erro ao buscar resumo de faturamento:', error);
    } finally {
      setLoadingBilling(false);
    }
  };

  const openRejectModal = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setActionType('reject');
    setComment('');
    setBillingSummary(null);
    setSigeResult(null);
  };

  const closeModal = () => {
    setSelectedTicket(null);
    setActionType(null);
    setComment('');
    setBillingSummary(null);
    setSigeResult(null);
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
              const updated = new Date(t.updated_at);
              const now = new Date();
              const diffHours = (now.getTime() - updated.getTime()) / (1000 * 60 * 60);
              return diffHours >= 24;
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
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredTickets.map((ticket) => {
              // Usar updated_at para calcular tempo de espera (quando foi enviado para avaliação)
              const sentForEvaluation = new Date(ticket.updated_at);
              const now = new Date();
              const diffMs = now.getTime() - sentForEvaluation.getTime();
              const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
              const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
              const isOld = diffHours >= 24;

              // Formatar tempo de espera
              const waitTime = diffHours >= 24
                ? `${Math.floor(diffHours / 24)}d ${diffHours % 24}h`
                : diffHours > 0
                  ? `${diffHours}h ${diffMinutes}min`
                  : `${diffMinutes}min`;

              return (
                <div
                  key={ticket.id}
                  className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    isOld ? 'bg-orange-50/50 dark:bg-orange-900/10' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Info Principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          #{ticket.ticket_number}
                        </span>
                        <PriorityBadge priority={ticket.priority} />
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          isOld
                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                          <Clock size={12} />
                          {waitTime}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 dark:text-white mt-1 truncate">
                        {ticket.title}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Building2 size={12} />
                          {ticket.client_name}
                        </span>
                        {ticket.assigned_to && (
                          <span className="flex items-center gap-1">
                            <User size={12} />
                            {ticket.assigned_to.name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/tickets/${ticket.id}`}
                        className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Ver Detalhes"
                      >
                        <Eye size={18} />
                      </Link>
                      <button
                        onClick={() => openApproveModal(ticket)}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors flex items-center gap-1"
                      >
                        <CheckCircle size={16} />
                        Aprovar
                      </button>
                      <button
                        onClick={() => openRejectModal(ticket)}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors flex items-center gap-1"
                      >
                        <XCircle size={16} />
                        Rejeitar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal de Confirmação */}
      {selectedTicket && actionType && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg">
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
                    #{selectedTicket.ticket_number} - {selectedTicket.client_name}
                  </p>
                </div>
              </div>

              {/* Resumo de Faturamento (apenas para aprovação) */}
              {actionType === 'approve' && (
                <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Receipt size={18} className="text-blue-600 dark:text-blue-400" />
                    <span className="font-semibold text-gray-900 dark:text-white">Resumo para Faturamento</span>
                  </div>

                  {loadingBilling ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                      <span className="ml-2 text-sm text-gray-500">Carregando...</span>
                    </div>
                  ) : billingSummary ? (
                    <div className="space-y-2 text-sm">
                      {billingSummary.appointments.n1.hours > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Atendimento N1</span>
                          <span className="text-gray-900 dark:text-white">
                            {billingSummary.appointments.n1.hours.toFixed(1)}h - R$ {billingSummary.appointments.n1.amount.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {billingSummary.appointments.n2.hours > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Atendimento N2</span>
                          <span className="text-gray-900 dark:text-white">
                            {billingSummary.appointments.n2.hours.toFixed(1)}h - R$ {billingSummary.appointments.n2.amount.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {billingSummary.appointments.contract.hours > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Atendimento Contrato</span>
                          <span className="text-gray-900 dark:text-white">
                            {billingSummary.appointments.contract.hours.toFixed(1)}h - R$ {billingSummary.appointments.contract.amount.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {billingSummary.valuations.count > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Valorizações ({billingSummary.valuations.count})</span>
                          <span className="text-gray-900 dark:text-white">
                            R$ {billingSummary.valuations.amount.toFixed(2)}
                          </span>
                        </div>
                      )}

                      <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-600 flex justify-between font-semibold">
                        <span className="text-gray-900 dark:text-white">Total a Faturar</span>
                        <span className={billingSummary.grandTotal > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}>
                          R$ {billingSummary.grandTotal.toFixed(2)}
                        </span>
                      </div>

                      {billingSummary.grandTotal === 0 && (
                        <p className="text-xs text-gray-500 mt-2">
                          Este ticket não possui itens faturáveis. A OS não será criada no SIGE.
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Não foi possível carregar o resumo.</p>
                  )}
                </div>
              )}

              {/* Resultado do SIGE */}
              {sigeResult && (
                <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
                  sigeResult.success
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
                }`}>
                  {sigeResult.success ? (
                    <CheckCircle size={18} />
                  ) : (
                    <AlertCircle size={18} />
                  )}
                  <span className="text-sm">{sigeResult.message}</span>
                </div>
              )}

              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {actionType === 'approve'
                  ? billingSummary?.grandTotal && billingSummary.grandTotal > 0
                    ? 'Ao aprovar, uma Ordem de Serviço será criada automaticamente no SIGE Cloud.'
                    : 'O ticket será marcado como "Aprovado".'
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
                  disabled={approveMutation.isSuccess || rejectMutation.isSuccess}
                />
              </div>

              {/* Botões */}
              <div className="flex gap-3">
                <button
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {approveMutation.isSuccess || rejectMutation.isSuccess ? 'Fechar' : 'Cancelar'}
                </button>
                {!approveMutation.isSuccess && !rejectMutation.isSuccess && (
                  <button
                    onClick={handleConfirmAction}
                    disabled={
                      (actionType === 'reject' && !comment.trim()) ||
                      approveMutation.isPending ||
                      rejectMutation.isPending ||
                      (actionType === 'approve' && loadingBilling)
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
                      ? 'Aprovar e Criar OS'
                      : 'Confirmar Rejeição'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
