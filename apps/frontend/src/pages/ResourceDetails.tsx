import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
  ArrowLeft,
  HardDrive,
  Printer,
  Monitor,
  Server,
  Network,
  Circle,
  Calendar,
  MapPin,
  User,
  Key,
  History,
  Trash2,
  RefreshCw,
  Download,
  AlertTriangle,
  Loader2,
  Plus,
  X,
  Search,
  Package,
  Image,
} from 'lucide-react';
import { resourceService } from '@/services/resource.service';
import { useResourcesSocket } from '@/hooks/useResourcesSocket';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';

const resourceTypeIcons: Record<string, any> = {
  computer: HardDrive,
  printer: Printer,
  monitor: Monitor,
  server: Server,
  network_device: Network,
  other: Package,
};

const resourceTypeLabels: Record<string, string> = {
  computer: 'Computador',
  printer: 'Impressora',
  monitor: 'Monitor',
  server: 'Servidor',
  network_device: 'Dispositivo de Rede',
  other: 'Outros',
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

type TabType = 'info' | 'specs' | 'licenses' | 'history';

export default function ResourceDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [showUninstallConfirm, setShowUninstallConfirm] = useState(false);
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [licenseSearch, setLicenseSearch] = useState('');

  // Mutation para enviar comandos
  const sendCommandMutation = useMutation({
    mutationFn: ({ resourceId, command }: { resourceId: string; command: string }) =>
      resourceService.sendCommand(resourceId, command),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ['resource', id] });
      setShowUninstallConfirm(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao enviar comando');
    },
  });

  // Mutation para cancelar comando pendente
  const cancelCommandMutation = useMutation({
    mutationFn: (resourceId: string) => resourceService.cancelCommand(resourceId),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ['resource', id] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao cancelar comando');
    },
  });

  // WebSocket para atualizações em tempo real
  useResourcesSocket({
    enabled: true,
    onHeartbeat: (event) => {
      if (event.resourceId === id) {
        // Atualizar recurso atual com novos dados de heartbeat
        queryClient.setQueryData(['resource', id], (old: any) => {
          if (!old) return old;
          return {
            ...old,
            is_online: true,
            agent_last_heartbeat: event.timestamp,
            metadata: {
              ...old.metadata,
              lastQuickStatus: event.quickStatus,
            },
          };
        });
      }
    },
    onCommandExecuted: (event) => {
      if (event.resourceId === id) {
        const commandLabels: Record<string, string> = {
          collect_info: 'Coletar Informações',
          restart: 'Reiniciar Agente',
          update: 'Atualizar Agente',
          uninstall: 'Desinstalar Agente',
        };

        const commandLabel = commandLabels[event.command] || event.command;

        if (event.success) {
          toast.success(
            `Comando "${commandLabel}" executado com sucesso!${
              event.message ? `\n${event.message}` : ''
            }`,
            {
              duration: 5000,
            }
          );
        } else {
          toast.error(
            `Comando "${commandLabel}" falhou${event.message ? `:\n${event.message}` : ''}`,
            {
              duration: 7000,
            }
          );
        }
      }
    },
    onCommandExpired: (event) => {
      if (event.resourceId === id) {
        const commandLabels: Record<string, string> = {
          collect_info: 'Coletar Informações',
          restart: 'Reiniciar Agente',
          update: 'Atualizar Agente',
          uninstall: 'Desinstalar Agente',
        };

        const commandLabel = commandLabels[event.command] || event.command;

        toast.error(
          `Comando "${commandLabel}" expirou após 1 hora sem execução. O agente pode estar offline.`,
          {
            duration: 7000,
          }
        );
      }
    },
  });

  const { data: resource, isLoading } = useQuery({
    queryKey: ['resource', id],
    queryFn: () => resourceService.getById(id!),
    enabled: !!id,
  });

  const { data: history } = useQuery({
    queryKey: ['resource-history', id],
    queryFn: () => resourceService.getHistory(id!),
    enabled: !!id && activeTab === 'history',
  });

  // Query para licenças atribuídas ao recurso
  const { data: resourceLicenses, isLoading: isLoadingResourceLicenses } = useQuery({
    queryKey: ['resource-licenses', id],
    queryFn: () => resourceService.getLicensesByResource(id!),
    enabled: !!id && activeTab === 'licenses',
  });

  // Query para licenças disponíveis do cliente
  const { data: availableLicenses, isLoading: isLoadingLicenses } = useQuery({
    queryKey: ['available-licenses', resource?.client_id],
    queryFn: () => resourceService.getAvailableLicenses(resource!.client_id),
    enabled: !!resource?.client_id && showLicenseModal,
  });

  // Mutation para atribuir licença
  const assignLicenseMutation = useMutation({
    mutationFn: ({ licenseId, resourceId }: { licenseId: string; resourceId: string }) =>
      resourceService.assignLicense(licenseId, resourceId),
    onSuccess: () => {
      toast.success('Licença atribuída com sucesso');
      queryClient.invalidateQueries({ queryKey: ['resource', id] });
      queryClient.invalidateQueries({ queryKey: ['resource-licenses', id] });
      queryClient.invalidateQueries({ queryKey: ['available-licenses'] });
      setShowLicenseModal(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao atribuir licença');
    },
  });

  // Mutation para remover licença
  const unassignLicenseMutation = useMutation({
    mutationFn: (licenseId: string) => resourceService.unassignLicense(licenseId, id!),
    onSuccess: () => {
      toast.success('Licença removida com sucesso');
      queryClient.invalidateQueries({ queryKey: ['resource', id] });
      queryClient.invalidateQueries({ queryKey: ['resource-licenses', id] });
      queryClient.invalidateQueries({ queryKey: ['available-licenses'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao remover licença');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Carregando...</p>
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Recurso não encontrado</p>
      </div>
    );
  }

  const Icon = resourceTypeIcons[resource.resource_type];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/resources')}
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <ArrowLeft size={20} />
          Voltar
        </button>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Icon className="text-blue-600 dark:text-blue-400" size={32} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {resource.name}
                </h1>
                {resource.is_online ? (
                  <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                    <Circle className="fill-green-500" size={8} />
                    Online
                    {resource.agent_last_heartbeat && (
                      <span className="text-gray-400 dark:text-gray-500 ml-1">
                        • {format(new Date(resource.agent_last_heartbeat), 'dd/MM HH:mm', { locale: ptBR })}
                      </span>
                    )}
                  </span>
                ) : resource.agent_id && (
                  <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                    <Circle className="fill-gray-400" size={8} />
                    Offline
                    {resource.agent_last_heartbeat && (
                      <span className="ml-1">
                        • {format(new Date(resource.agent_last_heartbeat), 'dd/MM HH:mm', { locale: ptBR })}
                      </span>
                    )}
                  </span>
                )}
              </div>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {resource.resource_code} • {resourceTypeLabels[resource.resource_type]}
              </p>
            </div>
          </div>

          <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusColors[resource.status]}`}>
            {statusLabels[resource.status]}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('info')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'info'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Informações Gerais
          </button>
          <button
            onClick={() => setActiveTab('specs')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'specs'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Especificações Técnicas
          </button>
          <button
            onClick={() => setActiveTab('licenses')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'licenses'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Licenças
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Histórico
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {/* Informações Gerais */}
        {activeTab === 'info' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Imagem do Recurso */}
            {resource.image_url && (
              <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Image size={20} className="text-blue-500" />
                  Foto do Equipamento
                </h3>
                <div className="flex justify-center">
                  <img
                    src={resource.image_url}
                    alt={resource.name}
                    className="max-w-md max-h-64 object-contain rounded-lg border border-gray-200 dark:border-gray-700"
                  />
                </div>
              </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Dados Básicos
              </h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Fabricante</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white">
                    {resource.manufacturer || '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Modelo</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white">
                    {resource.model || '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Número de Série</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white">
                    {resource.serial_number || '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Tag Patrimonial</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white">
                    {resource.asset_tag || '-'}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Localização e Usuário
              </h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">
                    <MapPin size={14} className="inline mr-1" />
                    Localização
                  </dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white">
                    {resource.location || '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Departamento</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white">
                    {resource.department || '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">
                    <User size={14} className="inline mr-1" />
                    Usuário Responsável
                  </dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white">
                    {resource.assigned_user_name || '-'}
                  </dd>
                </div>
                {resource.assigned_user_email && (
                  <div>
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Email</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">
                      {resource.assigned_user_email}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {resource.agent_id && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Informações do Agente
                </h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Agent ID</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white font-mono">
                      {resource.agent_id}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Versão</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">
                      {resource.agent_version || '-'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Último Heartbeat</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">
                      {resource.agent_last_heartbeat
                        ? format(new Date(resource.agent_last_heartbeat), 'dd/MM/yyyy HH:mm', {
                            locale: ptBR,
                          })
                        : '-'}
                    </dd>
                  </div>

                  {/* Comando Pendente */}
                  {resource.pending_command && (
                    <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-yellow-800 dark:text-yellow-300 flex items-center gap-2">
                          <Loader2 size={16} className="animate-spin" />
                          Comando pendente: <strong>
                            {{
                              collect_info: 'Coletar Informações',
                              restart: 'Reiniciar Agente',
                              update: 'Atualizar Agente',
                              uninstall: 'Desinstalar Agente',
                            }[resource.pending_command] || resource.pending_command}
                          </strong>
                        </p>
                        <button
                          onClick={() => cancelCommandMutation.mutate(resource.id)}
                          disabled={cancelCommandMutation.isPending}
                          className="text-xs px-2 py-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                        >
                          {cancelCommandMutation.isPending ? 'Cancelando...' : 'Cancelar'}
                        </button>
                      </div>
                    </div>
                  )}
                </dl>

                {/* Botões de Comando */}
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Comandos Remotos</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => sendCommandMutation.mutate({ resourceId: resource.id, command: 'collect_info' })}
                      disabled={sendCommandMutation.isPending || !!resource.pending_command}
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sendCommandMutation.isPending && sendCommandMutation.variables?.command === 'collect_info' ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Download size={16} />
                      )}
                      Coletar Info
                    </button>
                    <button
                      onClick={() => sendCommandMutation.mutate({ resourceId: resource.id, command: 'restart' })}
                      disabled={sendCommandMutation.isPending || !!resource.pending_command}
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sendCommandMutation.isPending && sendCommandMutation.variables?.command === 'restart' ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <RefreshCw size={16} />
                      )}
                      Reiniciar Agente
                    </button>
                    <button
                      onClick={() => setShowUninstallConfirm(true)}
                      disabled={sendCommandMutation.isPending || !!resource.pending_command}
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-900/30 dark:hover:bg-red-900/50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={16} />
                      Desinstalar
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Datas
              </h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">
                    <Calendar size={14} className="inline mr-1" />
                    Data de Compra
                  </dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white">
                    {resource.purchase_date
                      ? format(new Date(resource.purchase_date), 'dd/MM/yyyy', { locale: ptBR })
                      : '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Garantia até</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white">
                    {resource.warranty_expiry_date
                      ? format(new Date(resource.warranty_expiry_date), 'dd/MM/yyyy', {
                          locale: ptBR,
                        })
                      : '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Cadastrado em</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white">
                    {format(new Date(resource.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {/* Especificações Técnicas */}
        {activeTab === 'specs' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Sistema Operacional
              </h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Nome</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white">
                    {resource.os_name || '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Versão</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white">
                    {resource.os_version || '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Arquitetura</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white">
                    {resource.os_architecture || '-'}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Antivírus
              </h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Nome</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white">
                    {resource.antivirus_name || '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Versão</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white">
                    {resource.antivirus_version || '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Status</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white">
                    {resource.antivirus_status || '-'}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Rede</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Hostname</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white">
                    {resource.hostname || '-'}
                  </dd>
                </div>

                {/* Múltiplas Interfaces de Rede */}
                {resource.specifications?.network?.interfaces &&
                 resource.specifications.network.interfaces.length > 0 ? (
                  <div>
                    <dt className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      Interfaces de Rede ({resource.specifications.network.interfaces.length})
                    </dt>
                    <div className="space-y-2">
                      {resource.specifications.network.interfaces.map((iface: { name?: string; ip4?: string; mac?: string }, index: number) => (
                        <div
                          key={index}
                          className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                        >
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {iface.name || `Interface ${index + 1}`}
                          </p>
                          <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
                            <span className="text-gray-500 dark:text-gray-400">
                              IP: <span className="font-mono text-gray-900 dark:text-white">
                                {iface.ip4 || '-'}
                              </span>
                            </span>
                            <span className="text-gray-500 dark:text-gray-400">
                              MAC: <span className="font-mono text-gray-900 dark:text-white">
                                {iface.mac || '-'}
                              </span>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Endereço IP</dt>
                      <dd className="text-sm font-medium text-gray-900 dark:text-white font-mono">
                        {resource.ip_address || '-'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">MAC Address</dt>
                      <dd className="text-sm font-medium text-gray-900 dark:text-white font-mono">
                        {resource.mac_address || '-'}
                      </dd>
                    </div>
                  </>
                )}
              </dl>
            </div>

            {/* Processador */}
            {resource.specifications?.cpu && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Processador
                </h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Modelo</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">
                      {resource.specifications.cpu.manufacturer} {resource.specifications.cpu.brand}
                    </dd>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Núcleos</dt>
                      <dd className="text-sm font-medium text-gray-900 dark:text-white">
                        {resource.specifications.cpu.cores || '-'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Velocidade</dt>
                      <dd className="text-sm font-medium text-gray-900 dark:text-white">
                        {resource.specifications.cpu.speed ? `${resource.specifications.cpu.speed} GHz` : '-'}
                      </dd>
                    </div>
                  </div>
                </dl>
              </div>
            )}

            {/* Memória RAM */}
            {resource.specifications?.memory && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Memória RAM
                </h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Total</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">
                      {resource.specifications.memory.total
                        ? `${(resource.specifications.memory.total / (1024 * 1024 * 1024)).toFixed(2)} GB`
                        : '-'}
                    </dd>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Usado</dt>
                      <dd className="text-sm font-medium text-gray-900 dark:text-white">
                        {resource.specifications.memory.used
                          ? `${(resource.specifications.memory.used / (1024 * 1024 * 1024)).toFixed(2)} GB`
                          : '-'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Livre</dt>
                      <dd className="text-sm font-medium text-gray-900 dark:text-white">
                        {resource.specifications.memory.free
                          ? `${(resource.specifications.memory.free / (1024 * 1024 * 1024)).toFixed(2)} GB`
                          : '-'}
                      </dd>
                    </div>
                  </div>
                  {resource.specifications.memory.total && resource.specifications.memory.used && (
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                        <span>Uso de Memória</span>
                        <span>{((resource.specifications.memory.used / resource.specifications.memory.total) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${Math.min((resource.specifications.memory.used / resource.specifications.memory.total) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {/* Armazenamento */}
            {resource.specifications?.disks && resource.specifications.disks.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Armazenamento
                </h3>
                <div className="space-y-3">
                  {resource.specifications.disks.map((disk: { name?: string; type?: string; size?: number; used?: number }, index: number) => {
                    const usagePercent = disk.size && disk.size > 0 ? (disk.used || 0) / disk.size * 100 : 0;
                    return (
                      <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {disk.name || `Disco ${index + 1}`}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {disk.type || 'Desconhecido'}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mb-2">
                          <div
                            className={`h-2 rounded-full ${usagePercent > 90 ? 'bg-red-500' : usagePercent > 70 ? 'bg-yellow-500' : 'bg-blue-600'}`}
                            style={{ width: `${Math.min(usagePercent, 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>
                            Usado: {disk.used ? `${(disk.used / (1024 * 1024 * 1024)).toFixed(2)} GB` : '-'}
                          </span>
                          <span>
                            Total: {disk.size ? `${(disk.size / (1024 * 1024 * 1024)).toFixed(2)} GB` : '-'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Licenças */}
        {activeTab === 'licenses' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Licenças Atribuídas
                </h3>
                {resource.client_id && (
                  <button
                    onClick={() => setShowLicenseModal(true)}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                  >
                    <Plus size={16} />
                    Atribuir Licença
                  </button>
                )}
              </div>
              {isLoadingResourceLicenses ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin text-blue-600" size={32} />
                </div>
              ) : resourceLicenses && resourceLicenses.length > 0 ? (
                <div className="space-y-3">
                  {resourceLicenses.map((license) => (
                    <div
                      key={license.id}
                      className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Key className="text-gray-400" size={20} />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {license.product_name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {license.license_type.toUpperCase()}
                            {license.product_version && ` • v${license.product_version}`}
                          </p>
                          {license.max_activations && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                              Ativações: {license.current_activations}/{license.max_activations}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {license.max_activations && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">
                            {Math.round((license.current_activations / license.max_activations) * 100)}%
                          </span>
                        )}
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            license.license_status === 'assigned'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                          }`}
                        >
                          {license.license_status}
                        </span>
                        <button
                          onClick={() => unassignLicenseMutation.mutate(license.id)}
                          disabled={unassignLicenseMutation.isPending}
                          className="p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50"
                          title="Remover licença deste dispositivo"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Key className="mx-auto text-gray-300 dark:text-gray-600 mb-3" size={40} />
                  <p className="text-gray-500 dark:text-gray-400">
                    Nenhuma licença atribuída a este recurso
                  </p>
                  {resource.client_id && (
                    <button
                      onClick={() => setShowLicenseModal(true)}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      <Plus size={16} />
                      Atribuir primeira licença
                    </button>
                  )}
                  {!resource.client_id && (
                    <p className="mt-2 text-sm text-yellow-600 dark:text-yellow-400">
                      Este recurso não está vinculado a um cliente.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Histórico */}
        {activeTab === 'history' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Histórico de Alterações
              </h3>
              {history && history.length > 0 ? (
                <div className="space-y-4">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-4 pb-4 border-b border-gray-200 dark:border-gray-700 last:border-0"
                    >
                      <div className="flex-shrink-0">
                        <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full">
                          <History size={16} className="text-gray-600 dark:text-gray-400" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {item.event_description || item.event_type}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {format(new Date(item.created_at), "dd/MM/yyyy 'às' HH:mm", {
                            locale: ptBR,
                          })}
                          {item.changed_by_agent && ' • Alterado pelo agente'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">Nenhum histórico disponível</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal de Confirmação de Desinstalação */}
      {showUninstallConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-4">
              <AlertTriangle size={24} />
              <h3 className="text-lg font-semibold">Confirmar Desinstalação</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Tem certeza que deseja desinstalar o agente de <strong>{resource.name}</strong>?
              Esta ação irá remover o agente do computador e não poderá ser desfeita remotamente.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowUninstallConfirm(false)}
                disabled={sendCommandMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={() => sendCommandMutation.mutate({ resourceId: resource.id, command: 'uninstall' })}
                disabled={sendCommandMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 flex items-center gap-2"
              >
                {sendCommandMutation.isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Desinstalar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Atribuição de Licença */}
      {showLicenseModal && (() => {
        // Filtrar licenças: apenas vigentes (não expiradas) e que correspondam à busca
        const filteredLicenses = availableLicenses?.filter((license) => {
          // Filtrar licenças expiradas
          if (license.license_status === 'expired') return false;
          if (license.expiry_date && !license.is_perpetual) {
            const expiryDate = new Date(license.expiry_date);
            if (expiryDate < new Date()) return false;
          }

          // Filtrar por busca
          if (licenseSearch.trim()) {
            const searchLower = licenseSearch.toLowerCase();
            const matchesProduct = license.product_name?.toLowerCase().includes(searchLower);
            const matchesType = license.license_type?.toLowerCase().includes(searchLower);
            const matchesVendor = license.vendor?.toLowerCase().includes(searchLower);
            const matchesClient = license.client?.nome?.toLowerCase().includes(searchLower) ||
                                  license.client?.razaoSocial?.toLowerCase().includes(searchLower);
            return matchesProduct || matchesType || matchesVendor || matchesClient;
          }

          return true;
        }) || [];

        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full mx-4 shadow-xl max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Key size={20} />
                  Atribuir Licença
                </h3>
                <button
                  onClick={() => {
                    setShowLicenseModal(false);
                    setLicenseSearch('');
                  }}
                  className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Campo de Busca */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={licenseSearch}
                  onChange={(e) => setLicenseSearch(e.target.value)}
                  placeholder="Buscar licença por nome, tipo ou fornecedor..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Exibindo apenas licenças vigentes ({filteredLicenses.length} disponíveis)
              </p>

              <div className="flex-1 overflow-y-auto">
                {isLoadingLicenses ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="animate-spin text-blue-600" size={32} />
                  </div>
                ) : filteredLicenses.length > 0 ? (
                  <div className="space-y-2">
                    {filteredLicenses.map((license) => {
                      const remaining = license.max_activations
                        ? license.max_activations - license.current_activations
                        : null;
                      return (
                        <div
                          key={license.id}
                          className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50"
                        >
                          <div className="flex items-center gap-3">
                            <Key className="text-blue-500" size={20} />
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {license.product_name}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {license.license_type.toUpperCase()}
                                {license.product_version && ` • v${license.product_version}`}
                              </p>
                              {license.client && (
                                <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
                                  Cliente: {license.client.nome || license.client.razaoSocial}
                                </p>
                              )}
                              {license.max_activations && (
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                  {remaining} de {license.max_activations} ativações disponíveis
                                </p>
                              )}
                              {!license.max_activations && (
                                <p className="text-xs text-green-500 dark:text-green-400 mt-1">
                                  Ativações ilimitadas
                                </p>
                              )}
                              {license.expiry_date && !license.is_perpetual && (
                                <p className="text-xs text-orange-500 dark:text-orange-400 mt-1">
                                  Expira em: {format(new Date(license.expiry_date), 'dd/MM/yyyy', { locale: ptBR })}
                                </p>
                              )}
                              {license.is_perpetual && (
                                <p className="text-xs text-green-500 dark:text-green-400 mt-1">
                                  Licença perpétua
                                </p>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => assignLicenseMutation.mutate({
                              licenseId: license.id,
                              resourceId: resource.id,
                            })}
                            disabled={assignLicenseMutation.isPending}
                            className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 flex items-center gap-1"
                          >
                            {assignLicenseMutation.isPending ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Plus size={14} />
                            )}
                            Atribuir
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Key className="mx-auto text-gray-300 dark:text-gray-600 mb-3" size={40} />
                    <p className="text-gray-500 dark:text-gray-400">
                      {licenseSearch ? 'Nenhuma licença encontrada' : 'Nenhuma licença disponível'}
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                      {licenseSearch
                        ? 'Tente buscar por outro termo.'
                        : 'Não há licenças vigentes cadastradas para este cliente ou todas atingiram o limite de ativações.'}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                <button
                  onClick={() => {
                    setShowLicenseModal(false);
                    setLicenseSearch('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
