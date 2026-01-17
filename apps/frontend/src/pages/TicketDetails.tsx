import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  Edit,
  Upload,
  X,
  Plus,
  Eye,
  Trash2,
  Check,
  FileText,
  Flame,
  AlertTriangle,
  Circle,
  Pause,
  CheckCircle,
  XCircle,
  Timer,
  UserPlus,
  Users,
  ClipboardCheck,
  Send,
  RotateCcw,
} from 'lucide-react';
import { ticketService, TicketFollower } from '@/services/ticket.service';
import { ticketAttachmentsService } from '@/services/ticket-attachments.service';
import { TicketAppointments } from '@/components/Tickets/TicketAppointments';
import { TicketCommunication } from '@/components/Tickets/TicketCommunication';
import { TicketValuation } from '@/components/Tickets/TicketValuation';
import { TicketChecklists } from '@/components/Tickets/TicketChecklists';
import { TicketHistory } from '@/components/Tickets/TicketHistory';
import { TicketActions } from '@/components/Tickets/TicketActions';
import { Autocomplete, AutocompleteOption } from '@/components/Common/Autocomplete';
import { clientService, Client, ClientContract } from '@/services/client.service';
import { userService, User as UserType } from '@/services/user.service';
import { RichTextEditor } from '@/components/RichTextEditor/RichTextEditor';

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
  new: 'Novo',
  in_progress: 'Em Andamento',
  waiting_client: 'Aguardando Cliente',
  waiting_third_party: 'Aguardando Terceiro',
  paused: 'Pausado',
  waiting_approval: 'Aguardando Aprovação',
  waiting_evaluation: 'Fechado - Em Avaliação',
  approved: 'Aprovado - Enviado para Faturamento',
  reopened: 'Reaberto',
  resolved: 'Resolvido',
  cancelled: 'Cancelado',
};

// Status que podem ser alterados manualmente pelo usuário
// Excluídos: new (automático), in_progress (automático), cancelled (via botão), resolved (via botão Fechar)
const manualStatusOptions: string[] = [
  'waiting_client',
  'waiting_third_party',
  'paused',
  'waiting_approval',
];

const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  waiting_client: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  waiting_third_party: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  paused: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  waiting_approval: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  waiting_evaluation: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
  approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
  reopened: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300',
  resolved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

// Ícones para cada status
const statusIcons: Record<string, any> = {
  new: Circle,
  in_progress: Timer,
  waiting_client: Clock,
  waiting_third_party: Clock,
  paused: Pause,
  waiting_approval: AlertCircle,
  waiting_evaluation: ClipboardCheck,
  approved: Send,
  reopened: RotateCcw,
  resolved: CheckCircle,
  cancelled: XCircle,
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

// Ícones para cada prioridade
const priorityIcons: Record<string, any> = {
  low: Circle,
  medium: AlertCircle,
  high: AlertTriangle,
  urgent: Flame,
};

export default function TicketDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('appointments');
  const [showAttachments, setShowAttachments] = useState(false);
  const [isEditingFields, setIsEditingFields] = useState(false);

  // Estados para modais de edição
  const [showTitleModal, setShowTitleModal] = useState(false);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');

  // Estados para edição inline de campos específicos
  const [isEditingClient, setIsEditingClient] = useState(false);
  const [isEditingRequester, setIsEditingRequester] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);

  // Display values for autocomplete
  const [clientDisplayValue, setClientDisplayValue] = useState<string>('');
  const [requesterDisplayValue, setRequesterDisplayValue] = useState<string>('');
  const [assigneeDisplayValue, setAssigneeDisplayValue] = useState<string>('');

  // Autocomplete states
  const [clientOptions, setClientOptions] = useState<AutocompleteOption[]>([]);
  const [technicianOptions, setTechnicianOptions] = useState<AutocompleteOption[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isLoadingTechnicians, setIsLoadingTechnicians] = useState(false);

  // Upload de anexos
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const queryClient = useQueryClient();

  // Estados para seguidores
  const [followerInput, setFollowerInput] = useState('');
  const [showFollowerInput, setShowFollowerInput] = useState(false);
  const [showFollowerDropdown, setShowFollowerDropdown] = useState(false);

  // Estado para dropdown de contratos
  const [showContractsDropdown, setShowContractsDropdown] = useState(false);

  // Buscar detalhes do ticket
  const { data: ticket, isLoading, error } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => ticketService.getById(id!),
    enabled: !!id,
  });

  // Mutation para upload de anexos
  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      if (!id) throw new Error('ID do ticket não encontrado');
      return ticketAttachmentsService.uploadFiles(id, files);
    },
    onSuccess: () => {
      // Invalidar query do ticket para recarregar anexos
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      setSelectedFiles([]);
      setIsUploadingFiles(false);
    },
    onError: (error: any) => {
      console.error('Erro ao fazer upload:', error);
      alert('Erro ao enviar arquivos: ' + (error.response?.data?.message || error.message));
      setIsUploadingFiles(false);
    },
  });

  // Query para buscar contratos do cliente
  const { data: clientContracts } = useQuery({
    queryKey: ['contracts', 'client', ticket?.client_id],
    queryFn: () => clientService.getClientContracts(ticket!.client_id!),
    enabled: !!ticket?.client_id,
  });

  // Query para buscar contatos/solicitantes do cliente
  const { data: clientContacts } = useQuery({
    queryKey: ['client-contacts', ticket?.client_id],
    queryFn: () => clientService.getContacts(ticket!.client_id!),
    enabled: !!ticket?.client_id,
  });

  // Filtrar apenas contratos ativos
  const activeContracts = clientContracts?.filter(
    (c: ClientContract) => c.ativo && c.status === 'Ativo'
  ) || [];

  // Encontrar primeiro contrato ativo
  const activeContract = activeContracts.length > 0 ? activeContracts[0] : null;

  // Verificar se o ticket está bloqueado para edição
  // Tickets cancelados e aguardando avaliação não podem ser editados
  const isTicketLocked = ticket?.status && ['cancelled', 'waiting_evaluation', 'approved'].includes(ticket.status);

  // Mutation para atualizar título
  const updateTitleMutation = useMutation({
    mutationFn: (title: string) => ticketService.update(id!, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      setShowTitleModal(false);
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar título:', error);
      alert('Erro ao atualizar título: ' + (error.response?.data?.message || error.message));
    },
  });

  // Mutation para atualizar descrição
  const updateDescriptionMutation = useMutation({
    mutationFn: (description: string) => ticketService.update(id!, { description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      setShowDescriptionModal(false);
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar descrição:', error);
      alert('Erro ao atualizar descrição: ' + (error.response?.data?.message || error.message));
    },
  });

  // Mutation para atualizar cliente
  const updateClientMutation = useMutation({
    mutationFn: (data: { client_id: string; client_name: string }) => ticketService.update(id!, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      // Invalidar contratos do novo cliente
      queryClient.invalidateQueries({ queryKey: ['contracts', 'client', variables.client_id] });
      // Invalidar contatos do novo cliente
      queryClient.invalidateQueries({ queryKey: ['client-contacts', variables.client_id] });
      setIsEditingClient(false);
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar cliente:', error);
      alert('Erro ao atualizar cliente: ' + (error.response?.data?.message || error.message));
    },
  });

  // Mutation para atualizar solicitante
  const updateRequesterMutation = useMutation({
    mutationFn: (requester_name: string) => ticketService.update(id!, { requester_name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      setIsEditingRequester(false);
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar solicitante:', error);
      alert('Erro ao atualizar solicitante: ' + (error.response?.data?.message || error.message));
    },
  });

  // Mutation para atualizar responsável
  const updateAssigneeMutation = useMutation({
    mutationFn: (assigned_to_id: string | null) => ticketService.update(id!, { assigned_to_id: assigned_to_id || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      setIsEditingFields(false);
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar responsável:', error);
      alert('Erro ao atualizar responsável: ' + (error.response?.data?.message || error.message));
    },
  });

  // Mutation para atualizar status
  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => ticketService.update(id!, { status: status as any }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      setShowStatusDropdown(false);
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status: ' + (error.response?.data?.message || error.message));
    },
  });

  // Mutation para atualizar prioridade
  const updatePriorityMutation = useMutation({
    mutationFn: (priority: string) => ticketService.update(id!, { priority: priority as any }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      setShowPriorityDropdown(false);
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar prioridade:', error);
      alert('Erro ao atualizar prioridade: ' + (error.response?.data?.message || error.message));
    },
  });

  // Mutation para adicionar seguidor
  const addFollowerMutation = useMutation({
    mutationFn: (data: { email: string; name?: string }) => ticketService.addFollower(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      setFollowerInput('');
      setShowFollowerInput(false);
    },
    onError: (error: any) => {
      console.error('Erro ao adicionar seguidor:', error);
      alert('Erro ao adicionar seguidor: ' + (error.response?.data?.message || error.message));
    },
  });

  // Mutation para remover seguidor
  const removeFollowerMutation = useMutation({
    mutationFn: (followerId: string) => ticketService.removeFollower(id!, followerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
    },
    onError: (error: any) => {
      console.error('Erro ao remover seguidor:', error);
      alert('Erro ao remover seguidor: ' + (error.response?.data?.message || error.message));
    },
  });

  // Inicializar campos de edição quando ticket carregar
  useEffect(() => {
    if (ticket) {
      // Cliente - usar client_name primeiro, depois fallback para client.name
      setClientDisplayValue(ticket.client_name || ticket.client?.name || '');

      // Solicitante
      setRequesterDisplayValue(ticket.requester_name || '');

      // Responsável
      setAssigneeDisplayValue(ticket.assigned_to?.name || '');
    }
  }, [ticket]);

  // Fechar dropdowns ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.relative')) {
        setShowStatusDropdown(false);
        setShowPriorityDropdown(false);
        setShowContractsDropdown(false);
      }
    };

    if (showStatusDropdown || showPriorityDropdown || showContractsDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showStatusDropdown, showPriorityDropdown, showContractsDropdown]);

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

  // Handlers de upload de anexos
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadFiles = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploadingFiles(true);
    uploadMutation.mutate(selectedFiles);
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
            </div>
            {/* Botão de Ações */}
            <div className="flex-shrink-0 ml-4">
              <TicketActions ticket={ticket} />
            </div>
          </div>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* Título e Código do Ticket */}
              <div className="flex items-start justify-between mb-2">
                <h1
                  onClick={() => {
                    if (isTicketLocked) return;
                    setEditedTitle(ticket.title);
                    setShowTitleModal(true);
                  }}
                  className={`text-2xl font-bold text-gray-900 dark:text-white flex-1 pr-4 transition-colors ${
                    isTicketLocked
                      ? 'cursor-default'
                      : 'cursor-pointer hover:text-blue-600 dark:hover:text-blue-400'
                  }`}
                  title={isTicketLocked ? 'Ticket bloqueado para edição' : 'Clique para editar o título'}
                >
                  {ticket.title}
                </h1>
                <span className="text-sm font-mono text-gray-500 dark:text-gray-400 whitespace-nowrap mt-1">
                  #{ticket.ticket_number}
                </span>
              </div>
              {/* Status e Prioridade */}
              <div className="flex items-center gap-3 mb-3">
                {/* Status Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => {
                      if (isTicketLocked) return;
                      setShowStatusDropdown(!showStatusDropdown);
                      setShowPriorityDropdown(false);
                    }}
                    disabled={isTicketLocked}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${statusColors[ticket.status]} ${
                      isTicketLocked
                        ? 'cursor-default opacity-80'
                        : 'cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-blue-400'
                    }`}
                    title={isTicketLocked ? 'Ticket bloqueado para edição' : 'Clique para alterar o status'}
                  >
                    {(() => {
                      const StatusIcon = statusIcons[ticket.status];
                      return StatusIcon ? <StatusIcon className="w-3.5 h-3.5" /> : null;
                    })()}
                    {statusLabels[ticket.status]}
                  </button>
                  {showStatusDropdown && (
                    <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 min-w-[180px]">
                      {manualStatusOptions.map((key) => {
                        const StatusIcon = statusIcons[key];
                        const label = statusLabels[key];
                        return (
                          <button
                            key={key}
                            onClick={() => updateStatusMutation.mutate(key)}
                            disabled={updateStatusMutation.isPending}
                            className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg transition-colors flex items-center gap-2 ${
                              ticket.status === key ? 'bg-gray-100 dark:bg-gray-700 font-medium' : ''
                            }`}
                          >
                            {StatusIcon && <StatusIcon className="w-4 h-4" />}
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Priority Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => {
                      if (isTicketLocked) return;
                      setShowPriorityDropdown(!showPriorityDropdown);
                      setShowStatusDropdown(false);
                    }}
                    disabled={isTicketLocked}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${priorityColors[ticket.priority]} ${
                      isTicketLocked
                        ? 'cursor-default opacity-80'
                        : 'cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-blue-400'
                    }`}
                    title={isTicketLocked ? 'Ticket bloqueado para edição' : 'Clique para alterar a prioridade'}
                  >
                    {(() => {
                      const PriorityIcon = priorityIcons[ticket.priority];
                      return PriorityIcon ? <PriorityIcon className={`w-3.5 h-3.5 ${ticket.priority === 'urgent' ? 'animate-pulse text-red-600' : ''}`} /> : null;
                    })()}
                    {priorityLabels[ticket.priority]}
                  </button>
                  {showPriorityDropdown && (
                    <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 min-w-[140px]">
                      {Object.entries(priorityLabels).map(([key, label]) => {
                        const PriorityIcon = priorityIcons[key];
                        return (
                          <button
                            key={key}
                            onClick={() => updatePriorityMutation.mutate(key)}
                            disabled={updatePriorityMutation.isPending}
                            className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg transition-colors flex items-center gap-2 ${
                              ticket.priority === key ? 'bg-gray-100 dark:bg-gray-700 font-medium' : ''
                            }`}
                          >
                            {PriorityIcon && <PriorityIcon className={`w-4 h-4 ${key === 'urgent' ? 'text-red-600' : ''}`} />}
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Descrição com botão de editar */}
              <div className="mb-4 group relative">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    {ticket.description ? (
                      <div
                        className="text-gray-600 dark:text-gray-400 prose prose-sm dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: ticket.description }}
                      />
                    ) : (
                      <p className="text-gray-400 dark:text-gray-500 italic">
                        Sem descrição. Clique para adicionar.
                      </p>
                    )}
                  </div>
                  {!isTicketLocked && (
                    <button
                      onClick={() => {
                        setEditedDescription(ticket.description || '');
                        setShowDescriptionModal(true);
                      }}
                      className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      title="Editar descrição"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Cliente com info de contrato */}
                <div className="flex items-start gap-2 text-sm">
                  <User className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-gray-600 dark:text-gray-400">Cliente</p>
                    {isEditingClient ? (
                      <div className="flex items-center gap-1">
                        <Autocomplete
                          value={clientDisplayValue}
                          onChange={(option) => {
                            if (option) {
                              setClientDisplayValue(option.label);
                              setClientOptions([]);
                              // Salvar automaticamente com client_id e client_name
                              updateClientMutation.mutate({
                                client_id: option.id,
                                client_name: option.label
                              });
                            }
                          }}
                          onSearchChange={handleClientSearch}
                          options={clientOptions}
                          placeholder="Digite o nome do cliente..."
                          isLoading={isLoadingClients}
                          minChars={2}
                          className="flex-1"
                        />
                        <button
                          onClick={() => {
                            setIsEditingClient(false);
                            setClientDisplayValue(ticket.client_name || ticket.client?.name || '');
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="group">
                        <p
                          onClick={() => !isTicketLocked && setIsEditingClient(true)}
                          className={`font-medium text-gray-900 dark:text-white ${
                            isTicketLocked
                              ? 'cursor-default'
                              : 'cursor-pointer hover:text-blue-600 dark:hover:text-blue-400'
                          }`}
                          title={isTicketLocked ? 'Ticket bloqueado para edição' : 'Clique para editar'}
                        >
                          {ticket.client_name || ticket.client?.name || 'Não informado'}
                        </p>
                        {/* Badge de contrato */}
                        {activeContract ? (
                          <div className="relative">
                            <button
                              onClick={() => setShowContractsDropdown(!showContractsDropdown)}
                              className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors cursor-pointer"
                            >
                              <FileText className="w-3 h-3" />
                              {activeContracts.length === 1 ? 'Contrato Ativo' : `${activeContracts.length} Contratos Ativos`}
                            </button>
                            {/* Dropdown de contratos */}
                            {showContractsDropdown && activeContracts.length > 0 && (
                              <div className="absolute z-30 left-0 mt-1 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                                <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                    Contratos Ativos ({activeContracts.length})
                                  </p>
                                </div>
                                <div className="max-h-60 overflow-y-auto">
                                  {activeContracts.map((contract: ClientContract) => (
                                    <div
                                      key={contract.id}
                                      className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0 bg-green-50 dark:bg-green-900/20"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-medium text-sm text-gray-900 dark:text-white">
                                          #{contract.numero_contrato || contract.id.slice(0, 8)}
                                        </span>
                                        <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400">
                                          Ativo
                                        </span>
                                      </div>
                                      {contract.descricao && (
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">
                                          {contract.descricao}
                                        </p>
                                      )}
                                      {contract.data_inicio && (
                                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                          Início: {new Date(contract.data_inicio).toLocaleDateString('pt-BR')}
                                          {contract.data_fim && ` - Fim: ${new Date(contract.data_fim).toLocaleDateString('pt-BR')}`}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                                <button
                                  onClick={() => setShowContractsDropdown(false)}
                                  className="w-full p-2 text-xs text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-b-lg"
                                >
                                  Fechar
                                </button>
                              </div>
                            )}
                          </div>
                        ) : ticket.client_id ? (
                          <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full">
                            <FileText className="w-3 h-3" />
                            Sem Contrato
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>

                {/* Solicitante - Edição inline */}
                <div className="flex items-start gap-2 text-sm">
                  <User className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-gray-600 dark:text-gray-400">Solicitante</p>
                    {isEditingRequester ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={requesterDisplayValue}
                          onChange={(e) => setRequesterDisplayValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              updateRequesterMutation.mutate(requesterDisplayValue);
                            } else if (e.key === 'Escape') {
                              setIsEditingRequester(false);
                              setRequesterDisplayValue(ticket.requester_name || '');
                            }
                          }}
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          autoFocus
                          placeholder="Nome do solicitante"
                        />
                        <button
                          onClick={() => updateRequesterMutation.mutate(requesterDisplayValue)}
                          className="p-1 text-green-600 hover:text-green-700"
                          title="Salvar"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingRequester(false);
                            setRequesterDisplayValue(ticket.requester_name || '');
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <p
                        onClick={() => {
                          if (isTicketLocked) return;
                          setRequesterDisplayValue(ticket.requester_name || '');
                          setIsEditingRequester(true);
                        }}
                        className={`font-medium text-gray-900 dark:text-white ${
                          isTicketLocked
                            ? 'cursor-default'
                            : 'cursor-pointer hover:text-blue-600 dark:hover:text-blue-400'
                        }`}
                        title={isTicketLocked ? 'Ticket bloqueado para edição' : 'Clique para editar'}
                      >
                        {ticket.requester_name || 'Não informado'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Responsável */}
                <div className="flex items-start gap-2 text-sm">
                  <User className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-gray-600 dark:text-gray-400">Responsável</p>
                    {isEditingFields ? (
                      <div className="flex items-center gap-1">
                        <Autocomplete
                          value={assigneeDisplayValue}
                          onChange={(option) => {
                            if (option) {
                              setAssigneeDisplayValue(option.label);
                              setTechnicianOptions([]);
                              // Salvar automaticamente
                              updateAssigneeMutation.mutate(option.id);
                            } else {
                              updateAssigneeMutation.mutate(null);
                            }
                          }}
                          onSearchChange={handleTechnicianSearch}
                          options={technicianOptions}
                          placeholder="Digite o nome do técnico..."
                          isLoading={isLoadingTechnicians}
                          minChars={2}
                          className="flex-1"
                        />
                        <button
                          onClick={() => {
                            setIsEditingFields(false);
                            setAssigneeDisplayValue(ticket.assigned_to?.name || '');
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <p
                        onClick={() => !isTicketLocked && setIsEditingFields(true)}
                        className={`font-medium text-gray-900 dark:text-white ${
                          isTicketLocked
                            ? 'cursor-default'
                            : 'cursor-pointer hover:text-blue-600 dark:hover:text-blue-400'
                        }`}
                        title={isTicketLocked ? 'Ticket bloqueado para edição' : 'Clique para editar'}
                      >
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
                <div className="flex items-center gap-2 text-sm">
                  <Paperclip className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Anexos</p>
                    <button
                      onClick={() => setShowAttachments(!showAttachments)}
                      className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {ticket.attachments?.length || 0} arquivo(s)
                    </button>
                  </div>
                </div>
              </div>

              {/* Seção de Seguidores */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      Seguidores ({(ticket as any).followers?.length || 0})
                    </h4>
                  </div>
                  {!isTicketLocked && (
                    <button
                      onClick={() => setShowFollowerInput(!showFollowerInput)}
                      className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                    >
                      <UserPlus className="w-4 h-4" />
                      Adicionar
                    </button>
                  )}
                </div>

                {/* Input para adicionar seguidor */}
                {showFollowerInput && (
                  <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg relative">
                    <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
                      Selecione um solicitante ou digite um email:
                    </p>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <input
                          type="email"
                          value={followerInput}
                          onChange={(e) => {
                            setFollowerInput(e.target.value);
                            if (e.target.value.length > 0 || (clientContacts && clientContacts.length > 0)) {
                              setShowFollowerDropdown(true);
                            }
                          }}
                          onFocus={() => {
                            if (clientContacts && clientContacts.length > 0) {
                              setShowFollowerDropdown(true);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && followerInput.includes('@')) {
                              e.preventDefault();
                              addFollowerMutation.mutate({ email: followerInput });
                            } else if (e.key === 'Escape') {
                              setShowFollowerInput(false);
                              setFollowerInput('');
                              setShowFollowerDropdown(false);
                            }
                          }}
                          placeholder="Selecione um solicitante ou digite um email..."
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          autoFocus
                        />
                        {/* Dropdown de Contatos/Solicitantes */}
                        {showFollowerDropdown && clientContacts && clientContacts.length > 0 && (
                          <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {clientContacts
                              .filter((contact: any) => contact.email && (
                                !followerInput ||
                                contact.name?.toLowerCase().includes(followerInput.toLowerCase()) ||
                                contact.email?.toLowerCase().includes(followerInput.toLowerCase())
                              ))
                              .map((contact: any) => (
                                <button
                                  key={contact.id}
                                  type="button"
                                  onClick={() => {
                                    addFollowerMutation.mutate({ email: contact.email, name: contact.name });
                                    setShowFollowerDropdown(false);
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                                >
                                  <p className="font-medium text-gray-900 dark:text-white text-sm">
                                    {contact.name}
                                  </p>
                                  <p className="text-xs text-gray-600 dark:text-gray-400">
                                    {contact.email}
                                  </p>
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          if (followerInput.includes('@')) {
                            addFollowerMutation.mutate({ email: followerInput });
                          }
                        }}
                        disabled={!followerInput.includes('@') || addFollowerMutation.isPending}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        {addFollowerMutation.isPending ? (
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setShowFollowerInput(false);
                          setFollowerInput('');
                          setShowFollowerDropdown(false);
                        }}
                        className="px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Lista de seguidores */}
                {(ticket as any).followers && (ticket as any).followers.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {(ticket as any).followers.map((follower: TicketFollower) => (
                      <div
                        key={follower.id}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full text-sm group"
                      >
                        <User className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                        <span className="text-gray-700 dark:text-gray-300">
                          {follower.user?.name || follower.name || follower.email}
                        </span>
                        {!isTicketLocked && (
                          <button
                            onClick={() => removeFollowerMutation.mutate(follower.id)}
                            disabled={removeFollowerMutation.isPending}
                            className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remover seguidor"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Nenhum seguidor ainda. Adicione emails para notificar sobre atualizações do ticket.
                  </p>
                )}
              </div>

              {/* Lista de anexos (expansível) */}
              {showAttachments && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">Anexos do Ticket</h4>
                    {!isTicketLocked && (
                      <>
                        <label
                          htmlFor="ticket-file-upload-header"
                          className="cursor-pointer flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                        >
                          <Plus className="w-4 h-4" />
                          Adicionar
                        </label>
                        <input
                          type="file"
                          multiple
                          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                          onChange={handleFileSelect}
                          className="hidden"
                          id="ticket-file-upload-header"
                        />
                      </>
                    )}
                  </div>

                  {/* Arquivos selecionados para upload */}
                  {selectedFiles.length > 0 && (
                    <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">Arquivos selecionados:</p>
                      <div className="space-y-1">
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <span className="text-gray-700 dark:text-gray-300 truncate flex-1">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(index)}
                              className="text-red-600 dark:text-red-400 hover:text-red-700 ml-2"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={handleUploadFiles}
                        disabled={isUploadingFiles}
                        className="mt-2 w-full px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isUploadingFiles ? (
                          <>
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Upload className="w-3 h-3" />
                            Enviar {selectedFiles.length} arquivo(s)
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Lista de anexos existentes */}
                  {ticket.attachments && ticket.attachments.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {ticket.attachments.map((attachment: any) => (
                        <div
                          key={attachment.id}
                          className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                        >
                          <Paperclip className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">
                            {attachment.filename || attachment.name}
                          </span>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <a
                              href={ticketAttachmentsService.getViewUrl(ticket.id, attachment.id)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                              title="Visualizar"
                            >
                              <Eye className="w-4 h-4" />
                            </a>
                            <a
                              href={ticketAttachmentsService.getDownloadUrl(ticket.id, attachment.id)}
                              download
                              className="p-1 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                              title="Baixar"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                            <button
                              onClick={async () => {
                                if (confirm('Deseja remover este anexo?')) {
                                  try {
                                    await ticketAttachmentsService.deleteAttachment(ticket.id, attachment.id);
                                    queryClient.invalidateQueries({ queryKey: ['ticket', ticket.id] });
                                  } catch (error) {
                                    console.error('Erro ao remover anexo:', error);
                                  }
                                }
                              }}
                              className="p-1 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                              title="Remover anexo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum anexo ainda</p>
                  )}
                </div>
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
        {activeTab === 'appointments' && <TicketAppointments ticketId={ticket.id} clientId={ticket.client_id} readOnly={isTicketLocked} />}
        {activeTab === 'communication' && <TicketCommunication ticketId={ticket.id} />}
        {activeTab === 'valuation' && <TicketValuation ticketId={ticket.id} readOnly={isTicketLocked} />}
        {activeTab === 'checklists' && <TicketChecklists ticketId={ticket.id} readOnly={isTicketLocked} />}
        {activeTab === 'history' && <TicketHistory ticketId={ticket.id} />}
      </div>

      {/* Modal de Edição de Título */}
      {showTitleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Editar Título
              </h3>
            </div>
            <div className="p-4">
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Digite o título do ticket"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && editedTitle.length >= 5) {
                    updateTitleMutation.mutate(editedTitle);
                  } else if (e.key === 'Escape') {
                    setShowTitleModal(false);
                  }
                }}
              />
              {editedTitle.length > 0 && editedTitle.length < 5 && (
                <p className="mt-1 text-sm text-red-500">
                  O título deve ter pelo menos 5 caracteres
                </p>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
              <button
                onClick={() => setShowTitleModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => updateTitleMutation.mutate(editedTitle)}
                disabled={editedTitle.length < 5 || updateTitleMutation.isPending}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {updateTitleMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Descrição */}
      {showDescriptionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Editar Descrição
              </h3>
            </div>
            <div className="p-4 flex-1 overflow-auto">
              <RichTextEditor
                value={editedDescription}
                onChange={setEditedDescription}
                placeholder="Digite a descrição do ticket..."
                className="min-h-[300px]"
              />
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
              <button
                onClick={() => setShowDescriptionModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => updateDescriptionMutation.mutate(editedDescription)}
                disabled={updateDescriptionMutation.isPending}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {updateDescriptionMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
