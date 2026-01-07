import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Client } from '@services/client.service';
import { requesterService, type CreateRequesterDto } from '@services/requester.service';
import { ticketService } from '@services/ticket.service';
import { contractService } from '@services/contract.service';

interface ClientDetailsProps {
  client: Client;
  onClose: () => void;
}

type TabType = 'info' | 'requesters' | 'tickets' | 'contracts';

export default function ClientDetails({ client, onClose }: ClientDetailsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [showRequesterForm, setShowRequesterForm] = useState(false);
  const [requesterPage, setRequesterPage] = useState(1);
  const [requesterForm, setRequesterForm] = useState({
    client_id: client.id,
    name: '',
    email: '',
    phone: '',
    department: '',
    position: '',
  });
  const queryClient = useQueryClient();

  // Buscar solicitantes do cliente
  const { data: requestersData, isLoading: loadingRequesters, error: requestersError } = useQuery({
    queryKey: ['requesters', client.id, requesterPage],
    queryFn: () => requesterService.findByClient(client.id, requesterPage, 20),
    enabled: activeTab === 'requesters',
    retry: 1,
  });

  const requesters = requestersData?.data || [];
  const requestersMeta = requestersData?.meta;

  // Buscar tickets do cliente
  const { data: tickets = [], isLoading: loadingTickets } = useQuery({
    queryKey: ['tickets', 'client', client.id],
    queryFn: () => ticketService.getByClient(client.id),
    enabled: activeTab === 'tickets',
  });

  // Buscar contratos do cliente
  const { data: contracts = [], isLoading: loadingContracts } = useQuery({
    queryKey: ['contracts', 'client', client.id],
    queryFn: () => contractService.getByClient(client.id),
    enabled: activeTab === 'contracts',
  });

  // Mutation para criar solicitante
  const createRequesterMutation = useMutation({
    mutationFn: requesterService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requesters', client.id] });
      setRequesterPage(1);
      setShowRequesterForm(false);
      setRequesterForm({
        client_id: client.id,
        name: '',
        email: '',
        phone: '',
        department: '',
        position: '',
      });
    },
  });

  const formatDocument = (doc?: string) => {
    if (!doc) return '-';
    const cleaned = doc.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (cleaned.length === 14) {
      return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return doc;
  };

  const formatPhone = (phone?: string) => {
    if (!phone) return '-';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (cleaned.length === 10) {
      return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return phone;
  };

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value?: number) => {
    if (!value) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      new: 'Novo',
      in_progress: 'Em Andamento',
      waiting_client: 'Aguardando Cliente',
      waiting_third_party: 'Aguardando Terceiro',
      paused: 'Pausado',
      waiting_approval: 'Aguardando Aprovação',
      resolved: 'Resolvido',
      ready_to_invoice: 'Pronto para Faturar',
      closed: 'Fechado',
      cancelled: 'Cancelado',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      waiting_client: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      waiting_third_party: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      paused: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
      waiting_approval: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      resolved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      ready_to_invoice: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
      closed: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      low: 'Baixa',
      medium: 'Média',
      high: 'Alta',
      urgent: 'Urgente',
    };
    return labels[priority] || priority;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return colors[priority] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  const tabs = [
    { id: 'info', label: 'Informações', icon: '📋' },
    { id: 'requesters', label: 'Solicitantes', icon: '👥' },
    { id: 'tickets', label: 'Tickets', icon: '🎫' },
    { id: 'contracts', label: 'Contratos', icon: '📄' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-[95vw] w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {client.nome}
              </h2>
              {client.razao_social && client.razao_social !== client.nome && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {client.razao_social}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <nav className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`
                  flex items-center gap-2 px-6 py-3 text-sm font-medium whitespace-nowrap
                  border-b-2 transition-colors
                  ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }
                `}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'info' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nome
                  </label>
                  <p className="text-gray-900 dark:text-white">{client.nome || '-'}</p>
                </div>

                {client.razao_social && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Razão Social
                    </label>
                    <p className="text-gray-900 dark:text-white">{client.razao_social}</p>
                  </div>
                )}

                {client.nome_fantasia && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nome Fantasia
                    </label>
                    <p className="text-gray-900 dark:text-white">{client.nome_fantasia}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    CPF/CNPJ
                  </label>
                  <p className="text-gray-900 dark:text-white">{formatDocument(client.cpf_cnpj)}</p>
                </div>

                {client.tipo_pessoa && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tipo de Pessoa
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {client.tipo_pessoa === 'F' ? 'Física' : 'Jurídica'}
                    </p>
                  </div>
                )}

                {client.email && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email
                    </label>
                    <p className="text-gray-900 dark:text-white">{client.email}</p>
                  </div>
                )}

                {client.telefone && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Telefone
                    </label>
                    <p className="text-gray-900 dark:text-white">{formatPhone(client.telefone)}</p>
                  </div>
                )}

                {client.celular && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Celular
                    </label>
                    <p className="text-gray-900 dark:text-white">{formatPhone(client.celular)}</p>
                  </div>
                )}
              </div>

              {client.endereco && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Endereço
                  </label>
                  <p className="text-gray-900 dark:text-white">{client.endereco}</p>
                  {(client.cidade || client.estado || client.cep) && (
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      {[client.cidade, client.estado, client.cep].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'requesters' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Solicitantes
                </h3>
                <button
                  onClick={() => setShowRequesterForm(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  + Adicionar Solicitante
                </button>
              </div>

              {/* Formulário de adicionar solicitante */}
              {showRequesterForm && (
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Novo Solicitante</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Nome *
                      </label>
                      <input
                        type="text"
                        value={requesterForm.name}
                        onChange={(e) => setRequesterForm({ ...requesterForm, name: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={requesterForm.email}
                        onChange={(e) => setRequesterForm({ ...requesterForm, email: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Telefone
                      </label>
                      <input
                        type="tel"
                        value={requesterForm.phone}
                        onChange={(e) => setRequesterForm({ ...requesterForm, phone: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Cargo
                      </label>
                      <input
                        type="text"
                        value={requesterForm.position}
                        onChange={(e) => setRequesterForm({ ...requesterForm, position: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => createRequesterMutation.mutate(requesterForm)}
                      disabled={!requesterForm.name || createRequesterMutation.isPending}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
                    >
                      {createRequesterMutation.isPending ? 'Salvando...' : 'Salvar'}
                    </button>
                    <button
                      onClick={() => {
                        setShowRequesterForm(false);
                        setRequesterForm({
                          client_id: client.id,
                          name: '',
                          email: '',
                          phone: '',
                          department: '',
                          position: '',
                        });
                      }}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Lista de solicitantes */}
              {requestersError ? (
                <div className="text-center py-12 text-red-500 dark:text-red-400">
                  Erro ao carregar solicitantes. Tente novamente.
                </div>
              ) : loadingRequesters ? (
                <div className="text-center py-12">
                  <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              ) : requesters.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  Nenhum solicitante cadastrado
                </div>
              ) : (
                <div className="space-y-3">
                  {requesters.map((requester) => (
                    <div
                      key={requester.id}
                      className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {requester.name}
                            {requester.is_primary && (
                              <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                                Principal
                              </span>
                            )}
                          </h4>
                          {requester.position && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {requester.position}
                            </p>
                          )}
                          <div className="mt-2 space-y-1">
                            {requester.email && (
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                <span className="font-medium">Email:</span> {requester.email}
                              </p>
                            )}
                            {requester.phone && (
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                <span className="font-medium">Telefone:</span> {requester.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Paginação de solicitantes */}
              {requestersMeta && requestersMeta.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Mostrando {((requestersMeta.page - 1) * requestersMeta.limit) + 1} - {Math.min(requestersMeta.page * requestersMeta.limit, requestersMeta.total)} de {requestersMeta.total} solicitantes
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setRequesterPage(p => Math.max(1, p - 1))}
                      disabled={requesterPage === 1}
                      className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Anterior
                    </button>
                    <span className="px-3 py-1 text-gray-700 dark:text-gray-300">
                      Página {requestersMeta.page} de {requestersMeta.totalPages}
                    </span>
                    <button
                      onClick={() => setRequesterPage(p => Math.min(requestersMeta.totalPages, p + 1))}
                      disabled={requesterPage === requestersMeta.totalPages}
                      className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'tickets' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Tickets do Cliente
                </h3>
              </div>

              {loadingTickets ? (
                <div className="text-center py-12">
                  <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              ) : tickets.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  Nenhum ticket encontrado
                </div>
              ) : (
                <div className="space-y-3">
                  {tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
                              #{ticket.ticket_number}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded ${getStatusColor(ticket.status)}`}>
                              {getStatusLabel(ticket.status)}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(ticket.priority)}`}>
                              {getPriorityLabel(ticket.priority)}
                            </span>
                          </div>
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                            {ticket.title}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {ticket.description && ticket.description.length > 150
                              ? `${ticket.description.substring(0, 150)}...`
                              : ticket.description || ''}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                            <span>Solicitante: {ticket.requester_name}</span>
                            {ticket.assigned_to && (
                              <span>Atribuído: {ticket.assigned_to.name}</span>
                            )}
                            <span>Criado: {formatDate(ticket.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'contracts' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Contratos
                </h3>
              </div>

              {loadingContracts ? (
                <div className="text-center py-12">
                  <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              ) : contracts.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  Nenhum contrato encontrado
                </div>
              ) : (
                <div className="space-y-3">
                  {contracts.map((contract) => (
                    <div
                      key={contract.id}
                      className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {contract.numero_contrato && (
                              <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                                {contract.numero_contrato}
                              </span>
                            )}
                            {contract.status && (
                              <span className={`text-xs px-2 py-1 rounded ${
                                contract.status === 'ativo' || contract.status === 'active'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                              }`}>
                                {contract.status}
                              </span>
                            )}
                            {contract.tipo && (
                              <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                {contract.tipo}
                              </span>
                            )}
                          </div>

                          {contract.descricao && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                              {contract.descricao}
                            </p>
                          )}

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            {contract.valor_mensal && (
                              <div>
                                <span className="font-medium text-gray-700 dark:text-gray-300">Valor Mensal:</span>
                                <span className="ml-2 text-gray-900 dark:text-white">
                                  {formatCurrency(contract.valor_mensal)}
                                </span>
                              </div>
                            )}
                            {contract.data_inicio && (
                              <div>
                                <span className="font-medium text-gray-700 dark:text-gray-300">Início:</span>
                                <span className="ml-2 text-gray-900 dark:text-white">
                                  {formatDate(contract.data_inicio)}
                                </span>
                              </div>
                            )}
                            {contract.data_fim && (
                              <div>
                                <span className="font-medium text-gray-700 dark:text-gray-300">Fim:</span>
                                <span className="ml-2 text-gray-900 dark:text-white">
                                  {formatDate(contract.data_fim)}
                                </span>
                              </div>
                            )}
                          </div>

                          {contract.observacoes && (
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Observações:</span>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                {contract.observacoes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
