import { useState, useEffect } from 'react';
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
  AlertCircle,
  History,
  Paperclip,
  Download,
  Edit
} from 'lucide-react';
import { ticketService } from '@/services/ticket.service';
import { TicketAppointments } from '@/components/Tickets/TicketAppointments';
import { TicketCommunication } from '@/components/Tickets/TicketCommunication';
import { TicketValuation } from '@/components/Tickets/TicketValuation';
import { TicketChecklists } from '@/components/Tickets/TicketChecklists';
import { TicketHistory } from '@/components/Tickets/TicketHistory';
import { Autocomplete, AutocompleteOption } from '@/components/Common/Autocomplete';
import { clientService, Client } from '@/services/client.service';
import { userService, User as UserType } from '@/services/user.service';

type TabType = 'appointments' | 'communication' | 'valuation' | 'checklists' | 'history';

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
    label: 'Valorização Extra',
    icon: DollarSign,
  },
  {
    id: 'checklists' as TabType,
    label: 'Checklists',
    icon: CheckSquare,
  },
  {
    id: 'history' as TabType,
    label: 'Histórico',
    icon: History,
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
  const [showAttachments, setShowAttachments] = useState(false);
  const [isEditingFields, setIsEditingFields] = useState(false);

  // Store IDs for editing
  const [editedClientId, setEditedClientId] = useState<string>('');
  const [editedRequesterId, setEditedRequesterId] = useState<string>('');
  const [editedAssigneeId, setEditedAssigneeId] = useState<string>('');

  // Display values for autocomplete
  const [clientDisplayValue, setClientDisplayValue] = useState<string>('');
  const [requesterDisplayValue, setRequesterDisplayValue] = useState<string>('');
  const [assigneeDisplayValue, setAssigneeDisplayValue] = useState<string>('');

  // Autocomplete states
  const [clientOptions, setClientOptions] = useState<AutocompleteOption[]>([]);
  const [technicianOptions, setTechnicianOptions] = useState<AutocompleteOption[]>([]);
  const [userOptions, setUserOptions] = useState<AutocompleteOption[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isLoadingTechnicians, setIsLoadingTechnicians] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Buscar detalhes do ticket
  const { data: ticket, isLoading, error } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => ticketService.getById(id!),
    enabled: !!id,
  });

  // Inicializar campos de edição quando ticket carregar
  useEffect(() => {
    if (ticket) {
      // Cliente
      setEditedClientId(ticket.client_id || '');
      setClientDisplayValue(ticket.client?.name || '');

      // Solicitante (requester não tem ID separado, usa o nome)
      setEditedRequesterId(ticket.requester_name || '');
      setRequesterDisplayValue(ticket.requester_name || '');

      // Responsável
      setEditedAssigneeId(ticket.assigned_to?.id || '');
      setAssigneeDisplayValue(ticket.assigned_to?.name || '');
    }
  }, [ticket]);

  // Funções de busca para autocomplete
  const handleClientSearch = async (query: string) => {
    if (query.trim().length < 2) {
      setClientOptions([]);
      return;
    }

    setIsLoadingClients(true);
    try {
      const response = await clientService.searchByName(query);
      const options: AutocompleteOption[] = response.data.map((client: Client) => ({
        id: client.id,
        label: client.nome || client.nome_fantasia || client.razao_social || '',
        sublabel: client.cpf_cnpj || client.cidade || '',
        metadata: client,
      }));
      setClientOptions(options);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      setClientOptions([]);
    } finally {
      setIsLoadingClients(false);
    }
  };

  const handleTechnicianSearch = async (query: string) => {
    setIsLoadingTechnicians(true);
    try {
      const technicians = await userService.getAllTechnicians();
      const filteredOptions: AutocompleteOption[] = technicians
        .filter((tech: UserType) =>
          tech.name.toLowerCase().includes(query.toLowerCase()) ||
          tech.email.toLowerCase().includes(query.toLowerCase())
        )
        .map((tech: UserType) => ({
          id: tech.id,
          label: tech.name,
          sublabel: tech.email,
          metadata: tech,
        }));
      setTechnicianOptions(filteredOptions);
    } catch (error) {
      console.error('Erro ao buscar técnicos:', error);
      setTechnicianOptions([]);
    } finally {
      setIsLoadingTechnicians(false);
    }
  };

  const handleRequesterSearch = async (query: string) => {
    setIsLoadingUsers(true);
    try {
      const users = await userService.getAll();
      const filteredOptions: AutocompleteOption[] = users
        .filter((user: UserType) =>
          user.name.toLowerCase().includes(query.toLowerCase()) ||
          user.email.toLowerCase().includes(query.toLowerCase())
        )
        .map((user: UserType) => ({
          id: user.id,
          label: user.name,
          sublabel: user.email,
          metadata: user,
        }));
      setUserOptions(filteredOptions);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      setUserOptions([]);
    } finally {
      setIsLoadingUsers(false);
    }
  };

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
                <div
                  className="text-gray-600 dark:text-gray-400 mb-4 prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: ticket.description }}
                />
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Cliente */}
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-gray-400" />
                  <div className="flex-1">
                    <p className="text-gray-600 dark:text-gray-400">Cliente</p>
                    {isEditingFields ? (
                      <Autocomplete
                        value={clientDisplayValue}
                        onChange={(option) => {
                          if (option) {
                            setEditedClientId(option.id);
                            setClientDisplayValue(option.label);
                            setClientOptions([]); // Limpar opções para parar busca
                          } else {
                            setEditedClientId('');
                            setClientDisplayValue('');
                          }
                        }}
                        onSearchChange={handleClientSearch}
                        options={clientOptions}
                        placeholder="Digite o nome do cliente..."
                        isLoading={isLoadingClients}
                        minChars={2}
                        className="w-full"
                      />
                    ) : (
                      <p className="font-medium text-gray-900 dark:text-white">
                        {ticket.client?.name || ticket.client_id || 'Não informado'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Solicitante */}
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-gray-400" />
                  <div className="flex-1">
                    <p className="text-gray-600 dark:text-gray-400">Solicitante</p>
                    {isEditingFields ? (
                      <Autocomplete
                        value={requesterDisplayValue}
                        onChange={(option) => {
                          if (option) {
                            setEditedRequesterId(option.label);
                            setRequesterDisplayValue(option.label);
                            setUserOptions([]); // Limpar opções para parar busca
                          } else {
                            setEditedRequesterId('');
                            setRequesterDisplayValue('');
                          }
                        }}
                        onSearchChange={handleRequesterSearch}
                        options={userOptions}
                        placeholder="Digite o nome do solicitante..."
                        isLoading={isLoadingUsers}
                        minChars={2}
                        className="w-full"
                      />
                    ) : (
                      <p className="font-medium text-gray-900 dark:text-white">
                        {ticket.requester_name || 'Não informado'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Responsável */}
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-gray-400" />
                  <div className="flex-1">
                    <p className="text-gray-600 dark:text-gray-400">Responsável</p>
                    {isEditingFields ? (
                      <Autocomplete
                        value={assigneeDisplayValue}
                        onChange={(option) => {
                          if (option) {
                            setEditedAssigneeId(option.id);
                            setAssigneeDisplayValue(option.label);
                            setTechnicianOptions([]); // Limpar opções para parar busca
                          } else {
                            setEditedAssigneeId('');
                            setAssigneeDisplayValue('');
                          }
                        }}
                        onSearchChange={handleTechnicianSearch}
                        options={technicianOptions}
                        placeholder="Digite o nome do técnico..."
                        isLoading={isLoadingTechnicians}
                        minChars={2}
                        className="w-full"
                      />
                    ) : (
                      <p className="font-medium text-gray-900 dark:text-white">
                        {ticket.assigned_to?.name || 'Não atribuído'}
                      </p>
                    )}
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

                {/* Anexos do Ticket */}
                {ticket.attachments && ticket.attachments.length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Paperclip className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Anexos</p>
                      <button
                        onClick={() => setShowAttachments(!showAttachments)}
                        className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {ticket.attachments.length} arquivo(s)
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Lista de anexos (expansível) */}
              {showAttachments && ticket.attachments && ticket.attachments.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Anexos do Ticket</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {ticket.attachments.map((attachment: any) => (
                      <a
                        key={attachment.id}
                        href={attachment.url}
                        download
                        className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors group"
                      >
                        <Paperclip className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                        <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">
                          {attachment.filename || attachment.name}
                        </span>
                        <Download className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Botões de ação */}
            <div className="flex-shrink-0 flex gap-2">
              {isEditingFields ? (
                <>
                  <button
                    onClick={() => {
                      // TODO: Implementar salvamento das alterações
                      console.log('Salvar alterações:', {
                        client_id: editedClientId,
                        requester_name: editedRequesterId,
                        assigned_to_id: editedAssigneeId
                      });
                      setIsEditingFields(false);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <CheckSquare className="w-4 h-4" />
                    Salvar
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingFields(false);
                      // Resetar valores
                      setEditedClientId(ticket.client_id || '');
                      setClientDisplayValue(ticket.client?.name || '');
                      setEditedRequesterId(ticket.requester_name || '');
                      setRequesterDisplayValue(ticket.requester_name || '');
                      setEditedAssigneeId(ticket.assigned_to?.id || '');
                      setAssigneeDisplayValue(ticket.assigned_to?.name || '');
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditingFields(true)}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Editar informações do ticket"
                >
                  <Edit className="w-4 h-4" />
                  Editar
                </button>
              )}
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
        {activeTab === 'history' && <TicketHistory ticketId={ticket.id} />}
      </div>
    </div>
  );
}
