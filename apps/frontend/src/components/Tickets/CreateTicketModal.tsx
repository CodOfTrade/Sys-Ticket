import { useState, useEffect, useRef } from 'react';
import { X, Search, Upload, Link2, UserPlus, Mail, AlertCircle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { ticketService } from '@/services/ticket.service';
import { TicketPriority, ServiceType, CreateTicketDto } from '@/types/ticket.types';
import { useAuthStore } from '@/store/auth.store';
import { serviceCatalogService } from '@/services/service-catalog.service';
import { clientService, Client } from '@/services/client.service';
import { contractService } from '@/services/contract.service';
import { userService } from '@/services/user.service';

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateTicketModal({ isOpen, onClose }: CreateTicketModalProps) {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: TicketPriority.MEDIUM,
    service_type: ServiceType.REMOTE,
    service_catalog_id: '',
    client_id: '',
    client_name: '',
    contact_id: '',
    requester_name: '',
    requester_email: '',
    requester_phone: '',
    category: '',
    parent_ticket_id: '',
    followers: [] as string[],
  });

  // Estados para busca de cliente
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const clientSearchRef = useRef<HTMLDivElement>(null);

  // Estado para followers
  const [followerInput, setFollowerInput] = useState('');
  const [showFollowerDropdown, setShowFollowerDropdown] = useState(false);
  const followerRef = useRef<HTMLDivElement>(null);

  // Estado para ticket pai
  const [parentTicketSearch, setParentTicketSearch] = useState('');
  const [showParentTicketDropdown, setShowParentTicketDropdown] = useState(false);
  const parentTicketRef = useRef<HTMLDivElement>(null);

  // Estado para modal de cadastro rápido de solicitante
  const [showQuickRequesterModal, setShowQuickRequesterModal] = useState(false);
  const [quickRequesterData, setQuickRequesterData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  // Estado para contratos
  const [showContractDetails, setShowContractDetails] = useState(false);

  // Estado para modal de atribuição de técnico
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState<string>('');

  // Buscar catálogos de serviço
  const { data: catalogs } = useQuery({
    queryKey: ['service-catalogs', user?.service_desk_id],
    queryFn: () => serviceCatalogService.getAll(user?.service_desk_id),
    enabled: isOpen,
  });

  // Buscar contatos do cliente
  const { data: contacts } = useQuery({
    queryKey: ['client-contacts', formData.client_id],
    queryFn: () => clientService.getContacts(formData.client_id),
    enabled: !!formData.client_id,
  });

  // Buscar tickets do cliente para ticket pai
  const { data: clientTickets } = useQuery({
    queryKey: ['client-tickets', formData.client_id],
    queryFn: async () => {
      if (!formData.client_id) return { tickets: [] };
      // Buscar todos os tickets e filtrar por client_id no frontend
      const response = await ticketService.getAll({});
      const filteredTickets = response.tickets.filter(
        ticket => ticket.client_id === formData.client_id || ticket.client_name === formData.client_name
      );
      return { ...response, tickets: filteredTickets };
    },
    enabled: !!formData.client_id,
  });

  // Buscar clientes em tempo real
  const { data: clientSearchResults } = useQuery({
    queryKey: ['client-search', clientSearchTerm],
    queryFn: () => clientService.searchByName(clientSearchTerm, 1, 10),
    enabled: clientSearchTerm.length >= 2,
  });

  // Buscar contratos do cliente
  const { data: clientContracts } = useQuery({
    queryKey: ['client-contracts', formData.client_id],
    queryFn: () => contractService.getByClient(formData.client_id),
    enabled: !!formData.client_id,
  });

  // Buscar técnicos disponíveis
  const { data: technicians } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => userService.getAllTechnicians(),
    enabled: showAssignmentModal,
  });

  // Fechar dropdowns ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (clientSearchRef.current && !clientSearchRef.current.contains(event.target as Node)) {
        setShowClientDropdown(false);
      }
      if (followerRef.current && !followerRef.current.contains(event.target as Node)) {
        setShowFollowerDropdown(false);
      }
      if (parentTicketRef.current && !parentTicketRef.current.contains(event.target as Node)) {
        setShowParentTicketDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useMutation({
    mutationFn: (data: CreateTicketDto) => ticketService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      console.error('Erro ao criar ticket:', error);
      if (error.response?.data?.errors) {
        const newErrors: Record<string, string> = {};
        error.response.data.errors.forEach((err: any) => {
          newErrors[err.field] = err.message;
        });
        setErrors(newErrors);
      }
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      priority: TicketPriority.MEDIUM,
      service_type: ServiceType.REMOTE,
      service_catalog_id: '',
      client_id: '',
      client_name: '',
      contact_id: '',
      requester_name: '',
      requester_email: '',
      requester_phone: '',
      category: '',
      parent_ticket_id: '',
      followers: [],
    });
    setClientSearchTerm('');
    setSelectedClient(null);
    setFollowerInput('');
    setErrors({});
  };

  // Categorias de exemplo
  const categories = [
    'Hardware',
    'Software',
    'Rede',
    'Impressora',
    'E-mail',
    'Sistema',
    'Telefonia',
    'Infraestrutura',
    'Backup',
    'Segurança',
    'Outro',
  ];

  // Catálogos de exemplo caso não haja no banco
  const exampleCatalogs = [
    { id: 'example-1', name: 'Suporte Técnico' },
    { id: 'example-2', name: 'Manutenção de Hardware' },
    { id: 'example-3', name: 'Configuração de Software' },
    { id: 'example-4', name: 'Instalação de Rede' },
    { id: 'example-5', name: 'Backup e Restore' },
  ];

  // Usar catálogos do banco ou exemplos
  const availableCatalogs = (catalogs && catalogs.length > 0) ? catalogs : exampleCatalogs;

  // Selecionar cliente da busca
  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setFormData(prev => ({
      ...prev,
      client_id: client.localId || client.id,
      client_name: client.nome_fantasia || client.nome,
    }));
    setClientSearchTerm(client.nome_fantasia || client.nome);
    setShowClientDropdown(false);
  };

  // Adicionar follower (solicitante ou email)
  const handleAddFollower = (emailOrContact?: string) => {
    const email = emailOrContact || followerInput.trim();

    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      if (!formData.followers.includes(email)) {
        setFormData(prev => ({
          ...prev,
          followers: [...prev.followers, email],
        }));
        setFollowerInput('');
        setShowFollowerDropdown(false);
      }
    }
  };

  // Remover follower
  const handleRemoveFollower = (email: string) => {
    setFormData(prev => ({
      ...prev,
      followers: prev.followers.filter(f => f !== email),
    }));
  };

  // Salvar solicitante rápido
  const handleSaveQuickRequester = () => {
    if (!quickRequesterData.name.trim()) {
      alert('Nome do solicitante é obrigatório');
      return;
    }

    // Preencher dados do solicitante no form principal
    setFormData(prev => ({
      ...prev,
      requester_name: quickRequesterData.name,
      requester_email: quickRequesterData.email,
      requester_phone: quickRequesterData.phone,
    }));

    // Fechar modal e limpar
    setShowQuickRequesterModal(false);
    setQuickRequesterData({ name: '', email: '', phone: '' });
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Título é obrigatório';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Descrição é obrigatória';
    }

    if (!formData.service_catalog_id) {
      newErrors.service_catalog_id = 'Catálogo de serviço é obrigatório';
    }

    if (!formData.client_name.trim()) {
      newErrors.client_name = 'Nome do cliente é obrigatório';
    }

    if (!formData.requester_name.trim()) {
      newErrors.requester_name = 'Nome do solicitante é obrigatório';
    }

    if (formData.requester_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.requester_email)) {
      newErrors.requester_email = 'E-mail inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Mostrar modal de atribuição em vez de criar diretamente
    setShowAssignmentModal(true);
  };

  // Criar ticket com ou sem atribuição de técnico
  const handleCreateTicket = async (assignToTechnician: boolean) => {
    try {
      console.log('Iniciando criação de ticket...', { assignToTechnician, selectedTechnician });

      // Usar service_desk_id do usuário logado
      const serviceDeskId = user?.service_desk_id || '3d316765-6615-4082-9bb7-d7d6a266db09';

      const ticketData: any = {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        type: formData.service_type,
        service_catalog_id: formData.service_catalog_id,
        client_id: formData.client_id || 'CLI-' + Date.now(), // Gerar ID temporário se não houver
        client_name: formData.client_name,
        requester_name: formData.requester_name,
        service_desk_id: serviceDeskId,
      };

      // Adicionar campos opcionais apenas se preenchidos
      if (formData.contact_id) {
        ticketData.contact_id = formData.contact_id;
      }
      if (formData.requester_email) {
        ticketData.requester_email = formData.requester_email;
      }
      if (formData.requester_phone) {
        ticketData.requester_phone = formData.requester_phone;
      }
      if (formData.category) {
        ticketData.category = formData.category;
      }
      if (formData.parent_ticket_id) {
        ticketData.parent_ticket_id = formData.parent_ticket_id;
      }
      if (formData.followers.length > 0) {
        ticketData.followers = formData.followers;
      }

      // Adicionar técnico atribuído se selecionado
      if (assignToTechnician && selectedTechnician) {
        ticketData.assigned_to = selectedTechnician;
      }

      console.log('Dados do ticket a ser criado:', ticketData);
      await createMutation.mutateAsync(ticketData);
      console.log('Ticket criado com sucesso!');

      setShowAssignmentModal(false);
      setSelectedTechnician('');
    } catch (error) {
      console.error('Erro ao criar ticket:', error);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Limpar erro do campo quando o usuário começar a digitar
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleClose = () => {
    if (!createMutation.isPending) {
      resetForm();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Novo Ticket</h2>
          <button
            onClick={handleClose}
            disabled={createMutation.isPending}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Informações do Ticket */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Informações do Ticket
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Título <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors.title
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Descreva o problema brevemente"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Descrição <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors.description
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Descreva o problema em detalhes"
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Catálogo de Serviço <span className="text-red-500">*</span>
                </label>
                <select
                  name="service_catalog_id"
                  value={formData.service_catalog_id}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors.service_catalog_id
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <option value="">Selecione um catálogo</option>
                  {availableCatalogs.map((catalog) => (
                    <option key={catalog.id} value={catalog.id}>
                      {catalog.name}
                    </option>
                  ))}
                </select>
                {errors.service_catalog_id && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.service_catalog_id}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Prioridade <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value={TicketPriority.LOW}>Baixa</option>
                    <option value={TicketPriority.MEDIUM}>Média</option>
                    <option value={TicketPriority.HIGH}>Alta</option>
                    <option value={TicketPriority.URGENT}>Urgente</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tipo de Serviço <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="service_type"
                    value={formData.service_type}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value={ServiceType.REMOTE}>Remoto</option>
                    <option value={ServiceType.INTERNAL}>Interno</option>
                    <option value={ServiceType.EXTERNAL}>Externo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Categoria
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Selecione uma categoria</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Informações do Cliente */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Informações do Cliente
            </h3>
            <div className="space-y-4">
              {/* Busca de Cliente em Tempo Real */}
              <div ref={clientSearchRef}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Buscar Cliente <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <Search size={18} className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={clientSearchTerm}
                    onChange={(e) => {
                      setClientSearchTerm(e.target.value);
                      setShowClientDropdown(true);
                    }}
                    onFocus={() => setShowClientDropdown(true)}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                      errors.client_name
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="Digite o nome, CNPJ ou cidade do cliente..."
                  />

                </div>
                {errors.client_name && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.client_name}</p>
                )}

                {/* Cliente Selecionado */}
                {selectedClient && (
                  <>
                    <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            ✓ {selectedClient.nome_fantasia || selectedClient.nome}
                          </p>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                            {selectedClient.cpf_cnpj && (
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                CNPJ: {selectedClient.cpf_cnpj}
                              </p>
                            )}
                            {selectedClient.cidade && (
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                {selectedClient.cidade}/{selectedClient.estado}
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedClient(null);
                            setClientSearchTerm('');
                            setFormData(prev => ({ ...prev, client_id: '', client_name: '' }));
                          }}
                          className="flex-shrink-0 p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
                          title="Remover cliente"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Card de Contratos - Apenas Ativos */}
                    {clientContracts && (() => {
                      const activeContracts = clientContracts.filter(c =>
                        c.ativo && (!c.data_fim || new Date(c.data_fim) >= new Date())
                      );

                      if (activeContracts.length > 0) {
                        return (
                          <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                            <button
                              type="button"
                              onClick={() => setShowContractDetails(!showContractDetails)}
                              className="w-full flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2">
                                <CheckCircle2 size={16} className="text-green-600 dark:text-green-400" />
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {activeContracts.length} {activeContracts.length === 1 ? 'Contrato Ativo' : 'Contratos Ativos'}
                                </span>
                              </div>
                              {showContractDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>

                            {showContractDetails && (
                              <div className="mt-3 space-y-2 border-t border-green-200 dark:border-green-800 pt-3">
                                {activeContracts.map((contract) => (
                                  <div key={contract.id} className="p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                          {contract.numero_contrato || 'Sem número'}
                                        </p>
                                        {contract.descricao && (
                                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                            {contract.descricao}
                                          </p>
                                        )}
                                        <div className="flex gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                                          {contract.data_inicio && (
                                            <span>Início: {new Date(contract.data_inicio).toLocaleDateString('pt-BR')}</span>
                                          )}
                                          {contract.data_fim && (
                                            <span>Fim: {new Date(contract.data_fim).toLocaleDateString('pt-BR')}</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      } else if (clientContracts.length > 0) {
                        // Tem contratos mas todos vencidos/inativos
                        return (
                          <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                            <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                              <AlertCircle size={16} />
                              <span className="text-sm font-medium">Cliente sem contratos ativos</span>
                            </div>
                          </div>
                        );
                      } else {
                        // Sem contratos
                        return (
                          <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                              <AlertCircle size={16} />
                              <span className="text-sm">Cliente sem contratos cadastrados</span>
                            </div>
                          </div>
                        );
                      }
                    })()}
                  </>
                )}

                  {/* Dropdown de Resultados */}
                  {showClientDropdown && clientSearchTerm.length >= 2 && clientSearchResults?.data && clientSearchResults.data.length > 0 && !selectedClient && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {clientSearchResults.data.map((client) => (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() => handleSelectClient(client)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                        >
                          <p className="font-medium text-gray-900 dark:text-white">
                            {client.nome_fantasia || client.nome}
                          </p>
                          <div className="flex gap-4 mt-1 text-xs text-gray-600 dark:text-gray-400">
                            {client.cpf_cnpj && <span>CNPJ: {client.cpf_cnpj}</span>}
                            {client.cidade && <span>{client.cidade}/{client.estado}</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
              </div>

              {/* Solicitante - Busca em Tempo Real */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Solicitante <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowQuickRequesterModal(true)}
                    className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium flex items-center gap-1"
                  >
                    <UserPlus size={14} />
                    Cadastrar Novo
                  </button>
                </div>

                {formData.client_id && contacts && contacts.length > 0 ? (
                  <select
                    name="contact_id"
                    value={formData.contact_id}
                    onChange={(e) => {
                      const contactId = e.target.value;
                      setFormData(prev => ({ ...prev, contact_id: contactId }));

                      // Preencher dados do solicitante automaticamente
                      if (contactId) {
                        const contact = contacts.find(c => c.id === contactId);
                        if (contact) {
                          setFormData(prev => ({
                            ...prev,
                            requester_name: contact.name,
                            requester_email: contact.email || '',
                            requester_phone: contact.phone || '',
                          }));
                        }
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                      errors.requester_name
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <option value="">Selecione um solicitante</option>
                    {contacts.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.name} {contact.email ? `- ${contact.email}` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                    {!formData.client_id ? (
                      <p>Selecione um cliente primeiro para ver os solicitantes disponíveis</p>
                    ) : (
                      <p>Nenhum solicitante cadastrado para este cliente. Clique em "Cadastrar Novo" para adicionar.</p>
                    )}
                  </div>
                )}

                {errors.requester_name && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.requester_name}
                  </p>
                )}

                {/* Preview do Solicitante Selecionado */}
                {formData.requester_name && (
                  <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {formData.requester_name}
                    </p>
                    {formData.requester_email && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Email: {formData.requester_email}
                      </p>
                    )}
                    {formData.requester_phone && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Tel: {formData.requester_phone}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Informações Adicionais */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Informações Adicionais
            </h3>
            <div className="space-y-4">
              {/* Ticket Pai */}
              <div ref={parentTicketRef}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Link2 size={16} className="inline mr-1" />
                  Ticket Relacionado (Pai)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={parentTicketSearch}
                    onChange={(e) => {
                      setParentTicketSearch(e.target.value);
                      setShowParentTicketDropdown(true);
                    }}
                    onFocus={() => setShowParentTicketDropdown(true)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Digite o número ou título do ticket..."
                  />

                  {/* Dropdown de Tickets */}
                  {showParentTicketDropdown && formData.client_id && clientTickets?.tickets && clientTickets.tickets.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {clientTickets.tickets
                        .filter(ticket =>
                          ticket.ticket_number.toLowerCase().includes(parentTicketSearch.toLowerCase()) ||
                          ticket.title.toLowerCase().includes(parentTicketSearch.toLowerCase())
                        )
                        .slice(0, 10)
                        .map((ticket) => (
                          <button
                            key={ticket.id}
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, parent_ticket_id: ticket.id }));
                              setParentTicketSearch(`#${ticket.ticket_number} - ${ticket.title}`);
                              setShowParentTicketDropdown(false);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                          >
                            <p className="font-medium text-gray-900 dark:text-white text-sm">
                              #{ticket.ticket_number}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {ticket.title}
                            </p>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Use para vincular este ticket a outro ticket existente do mesmo cliente
                </p>
              </div>

              {/* Seguidores (Followers) */}
              <div ref={followerRef}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Mail size={16} className="inline mr-1" />
                  Seguidores
                </label>
                <div className="relative">
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={followerInput}
                      onChange={(e) => {
                        setFollowerInput(e.target.value);
                        if (e.target.value.length > 0) {
                          setShowFollowerDropdown(true);
                        }
                      }}
                      onFocus={() => {
                        if (contacts && contacts.length > 0) {
                          setShowFollowerDropdown(true);
                        }
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddFollower();
                        }
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Selecione um solicitante ou digite um email..."
                    />
                    <button
                      type="button"
                      onClick={() => handleAddFollower()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                      <UserPlus size={16} />
                      Adicionar
                    </button>
                  </div>

                  {/* Dropdown de Solicitantes */}
                  {showFollowerDropdown && contacts && contacts.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {contacts
                        .filter(contact => contact.email && (
                          !followerInput ||
                          contact.name.toLowerCase().includes(followerInput.toLowerCase()) ||
                          contact.email.toLowerCase().includes(followerInput.toLowerCase())
                        ))
                        .map((contact) => (
                          <button
                            key={contact.id}
                            type="button"
                            onClick={() => handleAddFollower(contact.email!)}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
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
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Selecione solicitantes ou digite emails para receber notificações
                </p>

                {/* Lista de Followers */}
                {formData.followers.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {formData.followers.map((email) => (
                      <div
                        key={email}
                        className="flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full text-sm"
                      >
                        <span>{email}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFollower(email)}
                          className="hover:text-red-600 dark:hover:text-red-400"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upload de Arquivos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Upload size={16} className="inline mr-1" />
                  Anexar Arquivos
                </label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    multiple
                    id="file-upload"
                    className="hidden"
                    onChange={(e) => {
                      // TODO: Implementar lógica de upload
                      console.log('Arquivos selecionados:', e.target.files);
                    }}
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <Upload size={32} className="text-gray-400 dark:text-gray-500 mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Clique para selecionar ou arraste arquivos aqui
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Máx: 10MB por arquivo
                    </p>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleClose}
              disabled={createMutation.isPending}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {createMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Criando...
                </>
              ) : (
                'Criar Ticket'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Modal de Cadastro Rápido de Solicitante */}
      {showQuickRequesterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full mx-4">
            {/* Header */}
            <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Cadastro Rápido de Solicitante
              </h3>
              <button
                onClick={() => {
                  setShowQuickRequesterModal(false);
                  setQuickRequesterData({ name: '', email: '', phone: '' });
                }}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nome <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={quickRequesterData.name}
                  onChange={(e) => setQuickRequesterData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Nome completo"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  E-mail
                </label>
                <input
                  type="email"
                  value={quickRequesterData.email}
                  onChange={(e) => setQuickRequesterData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="email@exemplo.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Telefone
                </label>
                <input
                  type="tel"
                  value={quickRequesterData.phone}
                  onChange={(e) => setQuickRequesterData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="(11) 98765-4321"
                />
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                O solicitante será preenchido temporariamente neste ticket. Para salvá-lo permanentemente, acesse a página do cliente.
              </p>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowQuickRequesterModal(false);
                  setQuickRequesterData({ name: '', email: '', phone: '' });
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveQuickRequester}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Atribuição de Técnico */}
      {showAssignmentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full mx-4">
            {/* Header */}
            <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Atribuir Ticket a um Técnico?
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Você pode atribuir este ticket a um técnico agora ou deixar sem atribuição.
              </p>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Lista de Técnicos */}
              {technicians && technicians.length > 0 ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Selecionar Técnico
                  </label>
                  <select
                    value={selectedTechnician}
                    onChange={(e) => setSelectedTechnician(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Selecione um técnico (opcional)</option>
                    {technicians.map((tech) => (
                      <option key={tech.id} value={tech.id}>
                        {tech.name} - {tech.email}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  <p>Nenhum técnico disponível no momento</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex gap-3 justify-end">
              <button
                onClick={() => handleCreateTicket(false)}
                disabled={createMutation.isPending}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {createMutation.isPending ? 'Criando...' : 'Criar Sem Atribuir'}
              </button>
              <button
                onClick={() => handleCreateTicket(true)}
                disabled={createMutation.isPending || !selectedTechnician}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Criando...
                  </div>
                ) : (
                  'Criar e Atribuir'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
