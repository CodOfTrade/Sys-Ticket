import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
  Settings,
} from 'lucide-react';
import { resourceService } from '@/services/resource.service';
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

type TabType = 'info' | 'specs' | 'licenses' | 'history';

export default function ResourceDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('info');

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
                {resource.is_online && (
                  <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                    <Circle className="fill-green-500" size={8} />
                    Online
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
                </dl>
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
              </dl>
            </div>

            {resource.specifications && Object.keys(resource.specifications).length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Hardware
                </h3>
                <dl className="space-y-3">
                  {Object.entries(resource.specifications).map(([key, value]) => (
                    <div key={key}>
                      <dt className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                        {key.replace(/_/g, ' ')}
                      </dt>
                      <dd className="text-sm font-medium text-gray-900 dark:text-white">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        )}

        {/* Licenças */}
        {activeTab === 'licenses' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Licenças Atribuídas
              </h3>
              {resource.licenses && resource.licenses.length > 0 ? (
                <div className="space-y-3">
                  {resource.licenses.map((license) => (
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
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          license.license_status === 'assigned'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                        }`}
                      >
                        {license.license_status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Nenhuma licença atribuída a este recurso
                </p>
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
    </div>
  );
}
