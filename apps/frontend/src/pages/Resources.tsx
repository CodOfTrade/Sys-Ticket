import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, Eye, Trash2, Monitor, Printer, Server, HardDrive, Network, Circle, Download, ChevronDown, Key, Copy, Check, X, ChevronRight, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { resourceService } from '@/services/resource.service';
import { clientService } from '@/services/client.service';
import { useResourcesSocket } from '@/hooks/useResourcesSocket';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { ResourceType, ResourceStatus, CreateResourceDto } from '@/types/resource.types';

const resourceTypeIcons = {
  computer: HardDrive,
  printer: Printer,
  monitor: Monitor,
  server: Server,
  network_device: Network,
};

const resourceTypeLabels = {
  computer: 'Computador',
  printer: 'Impressora',
  monitor: 'Monitor',
  server: 'Servidor',
  network_device: 'Dispositivo de Rede',
};

const statusLabels = {
  active: 'Ativo',
  inactive: 'Inativo',
  maintenance: 'Manutenção',
  retired: 'Desativado',
};

const statusColors = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  maintenance: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  retired: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

export default function Resources() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [onlineFilter, setOnlineFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [codeExpiresAt, setCodeExpiresAt] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 20;
  const downloadMenuRef = useRef<HTMLDivElement>(null);

  // Estado para filtro por cliente
  const [clientFilter, setClientFilter] = useState<string>('');
  const [clientFilterSearch, setClientFilterSearch] = useState('');
  const [clientFilterName, setClientFilterName] = useState('');
  const [showClientFilterDropdown, setShowClientFilterDropdown] = useState(false);
  const [clientFilterResults, setClientFilterResults] = useState<any[]>([]);
  const [isSearchingClients, setIsSearchingClients] = useState(false);

  // Estado para modal de novo recurso
  const [showNewResourceModal, setShowNewResourceModal] = useState(false);
  const [newResource, setNewResource] = useState<Partial<CreateResourceDto>>({
    name: '',
    resource_type: ResourceType.COMPUTER,
    client_id: '',
    manufacturer: '',
    model: '',
    status: ResourceStatus.ACTIVE,
  });
  const [newResourceClientSearch, setNewResourceClientSearch] = useState('');
  const [newResourceClientResults, setNewResourceClientResults] = useState<any[]>([]);
  const [showNewResourceClientDropdown, setShowNewResourceClientDropdown] = useState(false);
  const [newResourceContracts, setNewResourceContracts] = useState<any[]>([]);
  const [isSearchingNewResourceClients, setIsSearchingNewResourceClients] = useState(false);
  const [showAdditionalFields, setShowAdditionalFields] = useState(false);

  // Fechar menu ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
        setShowDownloadMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // WebSocket para atualizações em tempo real
  useResourcesSocket({
    enabled: true,
    onStatusChanged: () => {
      queryClient.invalidateQueries({ queryKey: ['resources-stats'] });
    },
    onRegistered: () => {
      queryClient.invalidateQueries({ queryKey: ['resources-stats'] });
    },
  });

  // Query para buscar recursos (com filtro de cliente)
  const { data, isLoading } = useQuery({
    queryKey: ['resources', { page, perPage, typeFilter, statusFilter, onlineFilter, searchTerm, clientFilter }],
    queryFn: () =>
      resourceService.getAll({
        page,
        perPage,
        resource_type: typeFilter as any || undefined,
        status: statusFilter as any || undefined,
        is_online: onlineFilter ? onlineFilter === 'true' : undefined,
        search: searchTerm || undefined,
        client_id: clientFilter || undefined,
      }),
  });

  // Query para estatísticas
  const { data: stats } = useQuery({
    queryKey: ['resources-stats'],
    queryFn: () => resourceService.getStats(),
  });

  // Mutation para deletar recurso
  const deleteMutation = useMutation({
    mutationFn: resourceService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      queryClient.invalidateQueries({ queryKey: ['resources-stats'] });
    },
  });

  // Mutation para criar recurso
  const createResourceMutation = useMutation({
    mutationFn: (data: CreateResourceDto) => resourceService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      queryClient.invalidateQueries({ queryKey: ['resources-stats'] });
      toast.success('Recurso criado com sucesso');
      handleCloseNewResourceModal();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erro ao criar recurso');
    },
  });

  // Buscar clientes para o filtro
  useEffect(() => {
    const searchClients = async () => {
      if (clientFilterSearch.length < 2) {
        setClientFilterResults([]);
        return;
      }
      setIsSearchingClients(true);
      try {
        const result = await clientService.search({ name: clientFilterSearch, page: 1, per_page: 10 });
        setClientFilterResults(result.data || []);
      } catch (error) {
        console.error('Erro ao buscar clientes:', error);
      } finally {
        setIsSearchingClients(false);
      }
    };

    const debounce = setTimeout(searchClients, 300);
    return () => clearTimeout(debounce);
  }, [clientFilterSearch]);

  // Buscar clientes para o modal de novo recurso
  useEffect(() => {
    const searchClients = async () => {
      if (newResourceClientSearch.length < 2) {
        setNewResourceClientResults([]);
        return;
      }
      setIsSearchingNewResourceClients(true);
      try {
        const result = await clientService.search({ name: newResourceClientSearch, page: 1, per_page: 10 });
        setNewResourceClientResults(result.data || []);
      } catch (error) {
        console.error('Erro ao buscar clientes:', error);
      } finally {
        setIsSearchingNewResourceClients(false);
      }
    };

    const debounce = setTimeout(searchClients, 300);
    return () => clearTimeout(debounce);
  }, [newResourceClientSearch]);

  // Mutation para gerar código de ativação
  const generateCodeMutation = useMutation({
    mutationFn: (params: { description?: string; expiresInHours?: number; maxUses?: number }) =>
      resourceService.generateActivationCode(params),
    onSuccess: (data) => {
      setGeneratedCode(data.code);
      setCodeExpiresAt(data.expiresAt);
      toast.success('Código de ativação gerado com sucesso');
    },
    onError: () => {
      toast.error('Erro ao gerar código de ativação');
    },
  });

  const handleGenerateCode = () => {
    generateCodeMutation.mutate({
      description: 'Código para instalação de agentes',
      expiresInHours: 24,
      maxUses: 0, // ilimitado
    });
  };

  const handleCopyCode = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      setCodeCopied(true);
      toast.success('Código copiado para a área de transferência');
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const handleCloseModal = () => {
    setShowActivationModal(false);
    setGeneratedCode(null);
    setCodeCopied(false);
    setCodeExpiresAt(null);
  };

  // Handlers para filtro por cliente
  const handleSelectClientFilter = (client: any) => {
    setClientFilter(client.sigeId || client.id);
    setClientFilterName(client.nome || client.name || client.razaoSocial);
    setClientFilterSearch('');
    setShowClientFilterDropdown(false);
    setPage(1);
  };

  const handleClearClientFilter = () => {
    setClientFilter('');
    setClientFilterName('');
    setClientFilterSearch('');
    setPage(1);
  };

  // Handlers para modal de novo recurso
  const handleCloseNewResourceModal = () => {
    setShowNewResourceModal(false);
    setNewResource({
      name: '',
      resource_type: ResourceType.COMPUTER,
      client_id: '',
      manufacturer: '',
      model: '',
      status: ResourceStatus.ACTIVE,
    });
    setNewResourceClientSearch('');
    setNewResourceClientResults([]);
    setNewResourceContracts([]);
    setShowAdditionalFields(false);
  };

  const handleSelectNewResourceClient = async (client: any) => {
    const clientId = client.sigeId || client.id;
    setNewResource({ ...newResource, client_id: clientId, contract_id: undefined });
    setNewResourceClientSearch(client.nome || client.name || client.razaoSocial);
    setShowNewResourceClientDropdown(false);
    setNewResourceClientResults([]);

    // Buscar contratos do cliente
    try {
      const contracts = await clientService.getContracts(clientId);
      setNewResourceContracts(contracts || []);
    } catch (error) {
      console.error('Erro ao buscar contratos:', error);
      setNewResourceContracts([]);
    }
  };

  const handleCreateResource = () => {
    if (!newResource.name || !newResource.resource_type || !newResource.client_id || !newResource.manufacturer || !newResource.model) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    createResourceMutation.mutate(newResource as CreateResourceDto);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este recurso?')) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (error) {
        console.error('Erro ao excluir recurso:', error);
      }
    }
  };

  const resources = data?.data || [];
  const total = data?.total || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            Recursos / Ativos
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gerencie computadores, impressoras, licenças e mais
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Botão Gerar Código de Ativação */}
          <button
            onClick={() => setShowActivationModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
          >
            <Key size={20} />
            Código de Ativação
          </button>

          {/* Download Agente Dropdown */}
          <div className="relative" ref={downloadMenuRef}>
            <button
              onClick={() => setShowDownloadMenu(!showDownloadMenu)}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
            >
              <Download size={20} />
              Download Agente
              <ChevronDown size={16} className={`transition-transform ${showDownloadMenu ? 'rotate-180' : ''}`} />
            </button>
            {showDownloadMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
                <a
                  href="/api/v1/downloads/agent/installer"
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => setShowDownloadMenu(false)}
                >
                  <Download size={16} className="text-blue-500" />
                  <div>
                    <p className="font-medium">Instalador (NSIS)</p>
                    <p className="text-xs text-gray-500">Recomendado - com auto-start</p>
                  </div>
                </a>
                <a
                  href="/api/v1/downloads/agent/portable"
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => setShowDownloadMenu(false)}
                >
                  <Download size={16} className="text-green-500" />
                  <div>
                    <p className="font-medium">Portátil (EXE)</p>
                    <p className="text-xs text-gray-500">Sem instalação</p>
                  </div>
                </a>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowNewResourceModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus size={20} />
            Novo Recurso
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              <HardDrive className="text-gray-400" size={32} />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Online</p>
                <p className="text-2xl font-bold text-green-600">{stats.online}</p>
              </div>
              <Circle className="text-green-500 fill-green-500" size={32} />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Offline</p>
                <p className="text-2xl font-bold text-gray-600">{stats.offline}</p>
              </div>
              <Circle className="text-gray-400 fill-gray-400" size={32} />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Com Agente</p>
                <p className="text-2xl font-bold text-blue-600">
                  {resources.filter(r => r.agent_id).length}
                </p>
              </div>
              <Monitor className="text-blue-400" size={32} />
            </div>
          </div>
        </div>
      )}

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
                placeholder="Buscar por nome, código, hostname..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Filter Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
          >
            <Filter size={20} />
            Filtros
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            {/* Filtro por Cliente */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Cliente
              </label>
              {clientFilterName ? (
                <div className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <span className="flex-1 text-sm text-gray-900 dark:text-white truncate">{clientFilterName}</span>
                  <button
                    onClick={handleClearClientFilter}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      placeholder="Buscar cliente..."
                      value={clientFilterSearch}
                      onChange={(e) => {
                        setClientFilterSearch(e.target.value);
                        setShowClientFilterDropdown(true);
                      }}
                      onFocus={() => setShowClientFilterDropdown(true)}
                      className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                    {isSearchingClients && (
                      <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 animate-spin" size={16} />
                    )}
                  </div>
                  {showClientFilterDropdown && clientFilterResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {clientFilterResults.map((client) => (
                        <button
                          key={client.id}
                          onClick={() => handleSelectClientFilter(client)}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          {client.nome || client.name || client.razaoSocial}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tipo
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Todos</option>
                <option value="computer">Computador</option>
                <option value="printer">Impressora</option>
                <option value="monitor">Monitor</option>
                <option value="server">Servidor</option>
                <option value="network_device">Dispositivo de Rede</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Todos</option>
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
                <option value="maintenance">Manutenção</option>
                <option value="retired">Desativado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Conexão
              </label>
              <select
                value={onlineFilter}
                onChange={(e) => setOnlineFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Todos</option>
                <option value="true">Online</option>
                <option value="false">Offline</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Resources Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Recurso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Localização
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Última Visualização
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Carregando...
                  </td>
                </tr>
              ) : resources.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Nenhum recurso encontrado
                  </td>
                </tr>
              ) : (
                resources.map((resource) => {
                  const Icon = resourceTypeIcons[resource.resource_type];
                  return (
                    <tr
                      key={resource.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <Icon className="text-gray-400" size={20} />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900 dark:text-white">
                                {resource.name}
                              </p>
                              {resource.is_online ? (
                                <span title="Online">
                                  <Circle className="text-green-500 fill-green-500" size={8} />
                                </span>
                              ) : resource.agent_id && (
                                <span title="Offline">
                                  <Circle className="fill-gray-400" size={8} />
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {resource.resource_code}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 dark:text-white">
                          {resourceTypeLabels[resource.resource_type]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            statusColors[resource.status]
                          }`}
                        >
                          {statusLabels[resource.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 dark:text-white">
                          {resource.location || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {resource.last_seen_at
                          ? format(new Date(resource.last_seen_at), 'dd/MM/yyyy HH:mm', {
                              locale: ptBR,
                            })
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/resources/${resource.id}`}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            <Eye size={18} />
                          </Link>
                          <button
                            onClick={() => handleDelete(resource.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > perPage && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Mostrando {(page - 1) * perPage + 1} até {Math.min(page * perPage, total)} de{' '}
              {total} recursos
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page * perPage >= total}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Novo Recurso */}
      {showNewResourceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
              <div className="flex items-center gap-3">
                <Plus className="text-blue-500" size={24} />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Novo Recurso
                </h2>
              </div>
              <button
                onClick={handleCloseNewResourceModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-6 space-y-6">
              {/* Informações Básicas */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                  Informações Básicas
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nome do Recurso *
                    </label>
                    <input
                      type="text"
                      value={newResource.name || ''}
                      onChange={(e) => setNewResource({ ...newResource, name: e.target.value })}
                      placeholder="Ex: Impressora HP Recepção"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tipo *
                    </label>
                    <select
                      value={newResource.resource_type || ''}
                      onChange={(e) => setNewResource({ ...newResource, resource_type: e.target.value as ResourceType })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="computer">Computador</option>
                      <option value="printer">Impressora</option>
                      <option value="monitor">Monitor</option>
                      <option value="server">Servidor</option>
                      <option value="network_device">Dispositivo de Rede</option>
                    </select>
                  </div>
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Cliente *
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type="text"
                        value={newResourceClientSearch}
                        onChange={(e) => {
                          setNewResourceClientSearch(e.target.value);
                          setShowNewResourceClientDropdown(true);
                          if (!e.target.value) {
                            setNewResource({ ...newResource, client_id: '', contract_id: undefined });
                            setNewResourceContracts([]);
                          }
                        }}
                        onFocus={() => setShowNewResourceClientDropdown(true)}
                        placeholder="Buscar cliente..."
                        className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      {isSearchingNewResourceClients && (
                        <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 animate-spin" size={16} />
                      )}
                    </div>
                    {showNewResourceClientDropdown && newResourceClientResults.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {newResourceClientResults.map((client) => (
                          <button
                            key={client.id}
                            onClick={() => handleSelectNewResourceClient(client)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            {client.nome || client.name || client.razaoSocial}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Contrato
                    </label>
                    <select
                      value={newResource.contract_id || ''}
                      onChange={(e) => setNewResource({ ...newResource, contract_id: e.target.value || undefined })}
                      disabled={!newResource.client_id || newResourceContracts.length === 0}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                    >
                      <option value="">Selecione...</option>
                      {newResourceContracts.map((contract) => (
                        <option key={contract.id} value={contract.id}>
                          {contract.numero || contract.id} - {contract.descricao || 'Contrato'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Detalhes do Equipamento */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                  Detalhes do Equipamento
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Fabricante *
                    </label>
                    <input
                      type="text"
                      value={newResource.manufacturer || ''}
                      onChange={(e) => setNewResource({ ...newResource, manufacturer: e.target.value })}
                      placeholder="Ex: HP, Dell, Samsung"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Modelo *
                    </label>
                    <input
                      type="text"
                      value={newResource.model || ''}
                      onChange={(e) => setNewResource({ ...newResource, model: e.target.value })}
                      placeholder="Ex: LaserJet Pro M404"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Número de Série
                    </label>
                    <input
                      type="text"
                      value={newResource.serial_number || ''}
                      onChange={(e) => setNewResource({ ...newResource, serial_number: e.target.value })}
                      placeholder="Ex: ABC123456789"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tag de Patrimônio
                    </label>
                    <input
                      type="text"
                      value={newResource.asset_tag || ''}
                      onChange={(e) => setNewResource({ ...newResource, asset_tag: e.target.value })}
                      placeholder="Ex: PAT-00123"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Localização */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                  Localização
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Local
                    </label>
                    <input
                      type="text"
                      value={newResource.location || ''}
                      onChange={(e) => setNewResource({ ...newResource, location: e.target.value })}
                      placeholder="Ex: Matriz - Sala 101"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Departamento
                    </label>
                    <input
                      type="text"
                      value={newResource.department || ''}
                      onChange={(e) => setNewResource({ ...newResource, department: e.target.value })}
                      placeholder="Ex: Financeiro"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Campos Adicionais (expansíveis) */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowAdditionalFields(!showAdditionalFields)}
                  className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700"
                >
                  <ChevronRight size={16} className={`transition-transform ${showAdditionalFields ? 'rotate-90' : ''}`} />
                  Informações Adicionais
                </button>

                {showAdditionalFields && (
                  <div className="mt-4 space-y-4">
                    {/* Rede */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          IP Address
                        </label>
                        <input
                          type="text"
                          value={newResource.ip_address || ''}
                          onChange={(e) => setNewResource({ ...newResource, ip_address: e.target.value })}
                          placeholder="Ex: 192.168.1.100"
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          MAC Address
                        </label>
                        <input
                          type="text"
                          value={newResource.mac_address || ''}
                          onChange={(e) => setNewResource({ ...newResource, mac_address: e.target.value })}
                          placeholder="Ex: AA:BB:CC:DD:EE:FF"
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Hostname
                        </label>
                        <input
                          type="text"
                          value={newResource.hostname || ''}
                          onChange={(e) => setNewResource({ ...newResource, hostname: e.target.value })}
                          placeholder="Ex: IMPRESSORA-01"
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>

                    {/* Garantia */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Data de Compra
                        </label>
                        <input
                          type="date"
                          value={newResource.purchase_date || ''}
                          onChange={(e) => setNewResource({ ...newResource, purchase_date: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Fim da Garantia
                        </label>
                        <input
                          type="date"
                          value={newResource.warranty_expiry_date || ''}
                          onChange={(e) => setNewResource({ ...newResource, warranty_expiry_date: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>

                    {/* Observações */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Observações
                      </label>
                      <textarea
                        value={newResource.notes || ''}
                        onChange={(e) => setNewResource({ ...newResource, notes: e.target.value })}
                        rows={3}
                        placeholder="Observações adicionais sobre o recurso..."
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-b-xl sticky bottom-0">
              <button
                onClick={handleCloseNewResourceModal}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateResource}
                disabled={createResourceMutation.isPending}
                className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {createResourceMutation.isPending ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
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

      {/* Modal de Código de Ativação */}
      {showActivationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <Key className="text-blue-500" size={24} />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Código de Ativação
                </h2>
              </div>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-6">
              {!generatedCode ? (
                <div className="text-center">
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Gere um código de ativação para autorizar a instalação de agentes.
                    O código será válido por 24 horas.
                  </p>
                  <button
                    onClick={handleGenerateCode}
                    disabled={generateCodeMutation.isPending}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {generateCodeMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Gerando...
                      </>
                    ) : (
                      <>
                        <Key size={20} />
                        Gerar Código
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Use este código no wizard de instalação do agente:
                  </p>

                  {/* Código Gerado */}
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-2xl font-mono font-bold text-gray-900 dark:text-white tracking-wider">
                        {generatedCode}
                      </span>
                      <button
                        onClick={handleCopyCode}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                        title="Copiar código"
                      >
                        {codeCopied ? (
                          <Check className="text-green-500" size={20} />
                        ) : (
                          <Copy className="text-gray-500" size={20} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Informações */}
                  <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                    <p>
                      Válido até:{' '}
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {codeExpiresAt
                          ? format(new Date(codeExpiresAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                          : '-'}
                      </span>
                    </p>
                    <p>Uso: <span className="font-medium text-gray-700 dark:text-gray-300">Ilimitado</span></p>
                  </div>

                  {/* Botão para gerar novo código */}
                  <button
                    onClick={handleGenerateCode}
                    disabled={generateCodeMutation.isPending}
                    className="mt-6 text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm font-medium"
                  >
                    Gerar novo código
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-b-xl">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                O código é necessário para instalar novos agentes. Compartilhe apenas com pessoas autorizadas.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
