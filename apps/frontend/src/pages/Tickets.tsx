import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, Eye, Trash2, User, Clock } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketService } from '@/services/ticket.service';
import { TicketStatus, TicketPriority } from '@/types/ticket.types';
import { StatusBadge } from '@/components/Tickets/StatusBadge';
import { PriorityBadge } from '@/components/Tickets/PriorityBadge';
import { CreateTicketModal } from '@/components/Tickets/CreateTicketModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Tickets() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Query para buscar tickets
  const { data, isLoading, error } = useQuery({
    queryKey: ['tickets', { status: statusFilter, priority: priorityFilter }],
    queryFn: () =>
      ticketService.getAll({
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
      }),
  });

  // Mutation para deletar ticket
  const deleteMutation = useMutation({
    mutationFn: ticketService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });

  const tickets = data?.tickets || [];
  const filteredTickets = tickets.filter((ticket) =>
    ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este ticket?')) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (error) {
        console.error('Erro ao excluir ticket:', error);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            Tickets
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gerencie todos os tickets de atendimento
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus size={20} />
          Novo Ticket
        </button>
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
                placeholder="Buscar por título ou número..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Filter Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
          >
            <Filter size={20} />
            Filtros
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Todos</option>
                <option value={TicketStatus.NEW}>Novo</option>
                <option value={TicketStatus.IN_PROGRESS}>Em Andamento</option>
                <option value={TicketStatus.WAITING_CLIENT}>Aguardando Cliente</option>
                <option value={TicketStatus.WAITING_THIRD_PARTY}>Aguardando Terceiros</option>
                <option value={TicketStatus.PAUSED}>Pausado</option>
                <option value={TicketStatus.WAITING_APPROVAL}>Aguardando Aprovação</option>
                <option value={TicketStatus.RESOLVED}>Resolvido</option>
                <option value={TicketStatus.READY_TO_INVOICE}>Pronto para Faturar</option>
                <option value={TicketStatus.CLOSED}>Fechado</option>
                <option value={TicketStatus.CANCELLED}>Cancelado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Prioridade
              </label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Todas</option>
                <option value={TicketPriority.LOW}>Baixa</option>
                <option value={TicketPriority.MEDIUM}>Média</option>
                <option value={TicketPriority.HIGH}>Alta</option>
                <option value={TicketPriority.URGENT}>Urgente</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {tickets.length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">Abertos</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {tickets.filter((t) => t.status === TicketStatus.NEW).length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">Em Andamento</p>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
            {tickets.filter((t) => t.status === TicketStatus.IN_PROGRESS).length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">Resolvidos</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
            {tickets.filter((t) => t.status === TicketStatus.RESOLVED).length}
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
          <p className="text-gray-600 dark:text-gray-400">Nenhum ticket encontrado</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Ticket
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Prioridade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Atribuído
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Criado em
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredTickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                    onClick={() => window.location.href = `/tickets/${ticket.id}`}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 dark:text-white text-sm">
                            #{ticket.ticket_number}
                          </p>
                          {ticket.priority === TicketPriority.URGENT && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500 text-white font-bold animate-pulse">
                              🔥 URGENTE
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">
                          {ticket.title}
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 hover:underline" onClick={(e) => e.stopPropagation()}>
                          {ticket.client_name}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={ticket.status} />
                    </td>
                    <td className="px-4 py-3">
                      <PriorityBadge priority={ticket.priority} />
                    </td>
                    <td className="px-4 py-3">
                      {ticket.assigned_to ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <User size={12} className="text-blue-600 dark:text-blue-400" />
                          </div>
                          <span className="text-xs text-gray-900 dark:text-white">
                            {ticket.assigned_to.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Não atribuído
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                        <Clock size={13} />
                        {format(new Date(ticket.created_at), "dd/MM/yy HH:mm", {
                          locale: ptBR,
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/tickets/${ticket.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Ver detalhes"
                        >
                          <Eye size={15} />
                        </Link>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(ticket.id);
                          }}
                          className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Criação */}
      <CreateTicketModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </div>
  );
}
