import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, Eye, Trash2, Monitor, Printer, Server, HardDrive, Network, Circle, Download, ChevronDown } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { resourceService } from '@/services/resource.service';
import { useResourcesSocket } from '@/hooks/useResourcesSocket';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  const [page, setPage] = useState(1);
  const perPage = 20;
  const downloadMenuRef = useRef<HTMLDivElement>(null);

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

  // Query para buscar recursos
  const { data, isLoading } = useQuery({
    queryKey: ['resources', { page, perPage, typeFilter, statusFilter, onlineFilter, searchTerm }],
    queryFn: () =>
      resourceService.getAll({
        page,
        perPage,
        resource_type: typeFilter as any || undefined,
        status: statusFilter as any || undefined,
        is_online: onlineFilter ? onlineFilter === 'true' : undefined,
        search: searchTerm || undefined,
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

          <Link
            to="/resources/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus size={20} />
            Novo Recurso
          </Link>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
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
                                <span className="flex items-center gap-1 text-xs text-green-600" title="Online">
                                  <Circle className="text-green-500 fill-green-500" size={8} />
                                  {resource.agent_last_heartbeat && format(new Date(resource.agent_last_heartbeat), 'dd/MM HH:mm', { locale: ptBR })}
                                </span>
                              ) : resource.agent_id && (
                                <span className="flex items-center gap-1 text-xs text-gray-400" title="Offline">
                                  <Circle className="fill-gray-400" size={8} />
                                  {resource.agent_last_heartbeat && format(new Date(resource.agent_last_heartbeat), 'dd/MM HH:mm', { locale: ptBR })}
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
    </div>
  );
}
