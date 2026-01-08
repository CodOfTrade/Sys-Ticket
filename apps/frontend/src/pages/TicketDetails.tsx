import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Clock,
  MessageSquare,
  DollarSign,
  CheckSquare,
  User,
  Calendar,
  Tag,
  AlertCircle
} from 'lucide-react';
import { ticketService } from '@/services/ticket.service';
import { TicketAppointments } from '@/components/Tickets/TicketAppointments';
import { TicketCommunication } from '@/components/Tickets/TicketCommunication';
import { TicketValuation } from '@/components/Tickets/TicketValuation';
import { TicketChecklists } from '@/components/Tickets/TicketChecklists';

type TabType = 'appointments' | 'communication' | 'valuation' | 'checklists';

const tabs = [
  {
    id: 'appointments' as TabType,
    label: 'Apontamentos',
    icon: Clock,
  },
  {
    id: 'communication' as TabType,
    label: 'Comunicação',
    icon: MessageSquare,
  },
  {
    id: 'valuation' as TabType,
    label: 'Valorização',
    icon: DollarSign,
  },
  {
    id: 'checklists' as TabType,
    label: 'Checklists',
    icon: CheckSquare,
  },
];

const statusLabels: Record<string, string> = {
  open: 'Aberto',
  in_progress: 'Em Andamento',
  pending: 'Pendente',
  resolved: 'Resolvido',
  closed: 'Fechado',
  cancelled: 'Cancelado',
};

const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  pending: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  resolved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  closed: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

const priorityLabels: Record<string, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
};

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

export default function TicketDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('appointments');

  // Buscar detalhes do ticket
  const { data: ticket, isLoading, error } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => ticketService.getById(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Carregando ticket...</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    console.error('Erro ao carregar ticket:', error);
    console.log('ID do ticket:', id);
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-gray-900 dark:text-white font-semibold mb-2">Erro ao carregar ticket</p>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error instanceof Error ? error.message : 'Ticket não encontrado'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">ID: {id || 'não fornecido'}</p>
          <button
            onClick={() => navigate('/tickets')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Voltar para lista
          </button>
        </div>
      </div>
    );
  }

  const formatDate = (date: Date | string): string => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Botão voltar */}
          <button
            onClick={() => navigate('/tickets')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar para lista
          </button>

          {/* Informações do ticket */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  #{ticket.ticket_number} - {ticket.title}
                </h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[ticket.status]}`}>
                  {statusLabels[ticket.status]}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${priorityColors[ticket.priority]}`}>
                  {priorityLabels[ticket.priority]}
                </span>
              </div>

              {ticket.description && (
                <p className="text-gray-600 dark:text-gray-400 mb-4">{ticket.description}</p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Solicitante</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {ticket.requester_name || 'Não informado'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Responsável</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {ticket.assigned_to?.name || 'Não atribuído'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Criado em</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formatDate(ticket.created_at)}
                    </p>
                  </div>
                </div>

                {ticket.category && (
                  <div className="flex items-center gap-2 text-sm">
                    <Tag className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Categoria</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {ticket.category}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors whitespace-nowrap border-b-2 ${
                    activeTab === tab.id
                      ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
                      : 'text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-700'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Conteúdo das tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'appointments' && <TicketAppointments ticketId={ticket.id} clientId={ticket.client_id} />}
        {activeTab === 'communication' && <TicketCommunication ticketId={ticket.id} />}
        {activeTab === 'valuation' && <TicketValuation ticketId={ticket.id} />}
        {activeTab === 'checklists' && <TicketChecklists ticketId={ticket.id} />}
      </div>
    </div>
  );
}
