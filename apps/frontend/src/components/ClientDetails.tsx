import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Client } from '@services/client.service';
import { contractService, Contract, ContractQuota, CreateQuotaDto } from '@services/contract.service';
import ClientRequesters from './ClientRequesters';
import { Monitor, Printer, Server, HardDrive, Shield, FileText, Settings, Save, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface ClientDetailsProps {
  client: Client;
  onClose: () => void;
}

type TabType = 'info' | 'requesters' | 'contracts';

export default function ClientDetails({ client, onClose }: ClientDetailsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [expandedContract, setExpandedContract] = useState<string | null>(null);
  const [editingQuota, setEditingQuota] = useState<string | null>(null);
  const [quotaForm, setQuotaForm] = useState<Partial<CreateQuotaDto>>({});
  const queryClient = useQueryClient();

  // Buscar contratos do cliente (usando localId se disponível)
  const clientIdForContracts = client.localId || client.id;
  const { data: contracts = [], isLoading: loadingContracts } = useQuery({
    queryKey: ['contracts', 'client', clientIdForContracts],
    queryFn: () => contractService.getByClient(clientIdForContracts),
    enabled: activeTab === 'contracts' && !!clientIdForContracts,
  });

  // Query para buscar quota do contrato expandido
  const { data: quotaUsage, isLoading: loadingQuota

 } = useQuery({
    queryKey: ['contract-quota', expandedContract],
    queryFn: () => contractService.getQuotaUsage(expandedContract!),
    enabled: !!expandedContract,
  });

  // Mutation para criar quota
  const createQuotaMutation = useMutation({
    mutationFn: (data: CreateQuotaDto) => contractService.createContractQuota(data),
    onSuccess: () => {
      toast.success('Quota configurada com sucesso');
      queryClient.invalidateQueries({ queryKey: ['contract-quota', expandedContract] });
      setEditingQuota(null);
    },
    onError: () => {
      toast.error('Erro ao configurar quota');
    },
  });

  // Mutation para atualizar quota
  const updateQuotaMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateQuotaDto> }) =>
      contractService.updateContractQuota(id, data),
    onSuccess: () => {
      toast.success('Quota atualizada com sucesso');
      queryClient.invalidateQueries({ queryKey: ['contract-quota', expandedContract] });
      setEditingQuota(null);
    },
    onError: () => {
      toast.error('Erro ao atualizar quota');
    },
  });

  // Mutation para recalcular quota
  const recalculateMutation = useMutation({
    mutationFn: (contractId: string) => contractService.recalculateQuota(contractId),
    onSuccess: () => {
      toast.success('Uso recalculado');
      queryClient.invalidateQueries({ queryKey: ['contract-quota', expandedContract] });
    },
  });

  // Função para expandir/colapsar contrato
  const toggleContract = (contractId: string) => {
    if (expandedContract === contractId) {
      setExpandedContract(null);
      setEditingQuota(null);
    } else {
      setExpandedContract(contractId);
      setEditingQuota(null);
    }
  };

  // Função para iniciar edição de quota
  const startEditQuota = (contract: Contract, quota: ContractQuota | null) => {
    setEditingQuota(contract.id);
    if (quota) {
      setQuotaForm({
        computers_quota: quota.computers_quota,
        printers_quota: quota.printers_quota,
        monitors_quota: quota.monitors_quota,
        servers_quota: quota.servers_quota,
        windows_licenses_quota: quota.windows_licenses_quota,
        office_licenses_quota: quota.office_licenses_quota,
        antivirus_licenses_quota: quota.antivirus_licenses_quota,
        allow_exceed: quota.allow_exceed,
        alert_threshold: quota.alert_threshold,
      });
    } else {
      setQuotaForm({
        computers_quota: 0,
        printers_quota: 0,
        monitors_quota: 0,
        servers_quota: 0,
        windows_licenses_quota: 0,
        office_licenses_quota: 0,
        antivirus_licenses_quota: 0,
        allow_exceed: false,
        alert_threshold: 90,
      });
    }
  };

  // Função para salvar quota
  const saveQuota = (contract: Contract, existingQuota: ContractQuota | null) => {
    if (existingQuota) {
      updateQuotaMutation.mutate({ id: existingQuota.id, data: quotaForm });
    } else {
      createQuotaMutation.mutate({
        contract_id: contract.sige_id || contract.id,
        client_id: clientIdForContracts,
        ...quotaForm,
      } as CreateQuotaDto);
    }
  };

  // Componente de barra de progresso
  const ProgressBar = ({ label, icon: Icon, quota, used, percentage }: {
    label: string;
    icon: any;
    quota: number;
    used: number;
    percentage: number;
  }) => {
    const getColor = () => {
      if (percentage >= 100) return 'bg-red-500';
      if (percentage >= 90) return 'bg-yellow-500';
      return 'bg-green-500';
    };

    return (
      <div className="mb-3">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
            <Icon size={14} />
            {label}
          </span>
          <span className="text-gray-600 dark:text-gray-400">
            {used} / {quota}
          </span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
          <div
            className={`h-full ${getColor()} transition-all`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
    );
  };

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

  // Função para verificar se o contrato está vigente (data atual entre início e fim)
  const isContractValid = (dataInicio?: string, dataFim?: string) => {
    if (!dataInicio || !dataFim) return false;
    const hoje = new Date();
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    return hoje >= inicio && hoje <= fim;
  };

  // Função para obter a cor do status
  const getStatusColor = (status?: string) => {
    if (!status) return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';

    const statusLower = status.toLowerCase();
    if (statusLower === 'ativo' || statusLower === 'active') {
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    }
    if (statusLower === 'rescindido' || statusLower === 'cancelado') {
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    }
    if (statusLower === 'suspenso') {
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
    return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
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

  const tabs = [
    { id: 'info', label: 'Informações', icon: '📋' },
    { id: 'requesters', label: 'Solicitantes', icon: '👥' },
    { id: 'contracts', label: 'Contratos', icon: '📄' },
  ];

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        // Fechar ao clicar no backdrop (fora do modal)
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl h-[600px] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 p-6 border-b border-gray-200 dark:border-gray-700">
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
        <div className="sticky top-0 z-10 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
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
                    <a
                      href={`mailto:${client.email}`}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline"
                    >
                      {client.email}
                    </a>
                  </div>
                )}

                {client.telefone && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Telefone
                    </label>
                    <a
                      href={`tel:${client.telefone.replace(/\D/g, '')}`}
                      className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 hover:underline"
                    >
                      {formatPhone(client.telefone)}
                    </a>
                  </div>
                )}

                {client.celular && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Celular
                    </label>
                    <a
                      href={`tel:${client.celular.replace(/\D/g, '')}`}
                      className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 hover:underline"
                    >
                      {formatPhone(client.celular)}
                    </a>
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
            <ClientRequesters clientId={clientIdForContracts} />
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
                <div className="space-y-2">
                  {contracts.map((contract) => {
                    const vigente = isContractValid(contract.data_inicio, contract.data_fim);
                    const isExpanded = expandedContract === contract.id;
                    const contractSigeId = contract.sige_id || contract.id;

                    return (
                      <div
                        key={contract.id}
                        className={`bg-white dark:bg-gray-700 border rounded-lg transition-all ${
                          isExpanded
                            ? 'border-blue-500 shadow-lg'
                            : 'border-gray-200 dark:border-gray-600 hover:shadow-md'
                        }`}
                      >
                        {/* Header do contrato */}
                        <div
                          className="p-3 cursor-pointer"
                          onClick={() => toggleContract(contract.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                {contract.numero_contrato && (
                                  <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                                    #{contract.numero_contrato}
                                  </span>
                                )}

                                {vigente && (
                                  <span className="text-xs px-3 py-1 rounded-full font-bold bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg">
                                    ✓ VIGENTE
                                  </span>
                                )}

                                {contract.status && (
                                  <span className={`text-xs px-2 py-1 rounded font-medium ${getStatusColor(contract.status)}`}>
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
                                <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                                  {contract.descricao}
                                </p>
                              )}

                              <div className="flex gap-4 text-xs text-gray-600 dark:text-gray-400">
                                {contract.data_inicio && (
                                  <span><strong>Início:</strong> {formatDate(contract.data_inicio)}</span>
                                )}
                                {contract.data_fim && (
                                  <span><strong>Fim:</strong> {formatDate(contract.data_fim)}</span>
                                )}
                              </div>
                            </div>

                            <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                              {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </button>
                          </div>
                        </div>

                        {/* Seção expandida de Quotas */}
                        {isExpanded && (
                          <div className="border-t border-gray-200 dark:border-gray-600 p-4 bg-gray-50 dark:bg-gray-800">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <Server size={18} />
                                Recursos do Contrato
                              </h4>
                              <div className="flex gap-2">
                                {quotaUsage?.quota && (
                                  <button
                                    onClick={() => recalculateMutation.mutate(contractSigeId)}
                                    disabled={recalculateMutation.isPending}
                                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                    title="Recalcular uso"
                                  >
                                    <RefreshCw size={16} className={recalculateMutation.isPending ? 'animate-spin' : ''} />
                                  </button>
                                )}
                                {editingQuota !== contract.id ? (
                                  <button
                                    onClick={() => startEditQuota(contract, quotaUsage?.quota || null)}
                                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                                  >
                                    <Settings size={14} />
                                    {quotaUsage?.quota ? 'Editar' : 'Configurar'}
                                  </button>
                                ) : (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => setEditingQuota(null)}
                                      className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                                    >
                                      Cancelar
                                    </button>
                                    <button
                                      onClick={() => saveQuota(contract, quotaUsage?.quota || null)}
                                      disabled={createQuotaMutation.isPending || updateQuotaMutation.isPending}
                                      className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
                                    >
                                      <Save size={14} />
                                      Salvar
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {loadingQuota ? (
                              <div className="text-center py-4">
                                <svg className="animate-spin h-6 w-6 text-blue-600 mx-auto" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                              </div>
                            ) : editingQuota === contract.id ? (
                              /* Formulário de edição */
                              <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                                    Define quantos recursos este contrato permite cadastrar.
                                  </p>
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    <Monitor size={12} className="inline mr-1" /> Computadores
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={quotaForm.computers_quota || 0}
                                    onChange={(e) => setQuotaForm({ ...quotaForm, computers_quota: parseInt(e.target.value) || 0 })}
                                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    <Printer size={12} className="inline mr-1" /> Impressoras
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={quotaForm.printers_quota || 0}
                                    onChange={(e) => setQuotaForm({ ...quotaForm, printers_quota: parseInt(e.target.value) || 0 })}
                                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    <HardDrive size={12} className="inline mr-1" /> Monitores
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={quotaForm.monitors_quota || 0}
                                    onChange={(e) => setQuotaForm({ ...quotaForm, monitors_quota: parseInt(e.target.value) || 0 })}
                                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    <Server size={12} className="inline mr-1" /> Servidores
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={quotaForm.servers_quota || 0}
                                    onChange={(e) => setQuotaForm({ ...quotaForm, servers_quota: parseInt(e.target.value) || 0 })}
                                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                  />
                                </div>

                                <div className="col-span-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Licenças de Software</p>
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Windows
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={quotaForm.windows_licenses_quota || 0}
                                    onChange={(e) => setQuotaForm({ ...quotaForm, windows_licenses_quota: parseInt(e.target.value) || 0 })}
                                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Office
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={quotaForm.office_licenses_quota || 0}
                                    onChange={(e) => setQuotaForm({ ...quotaForm, office_licenses_quota: parseInt(e.target.value) || 0 })}
                                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    <Shield size={12} className="inline mr-1" /> Antivírus
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={quotaForm.antivirus_licenses_quota || 0}
                                    onChange={(e) => setQuotaForm({ ...quotaForm, antivirus_licenses_quota: parseInt(e.target.value) || 0 })}
                                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Alerta (%)
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={quotaForm.alert_threshold || 90}
                                    onChange={(e) => setQuotaForm({ ...quotaForm, alert_threshold: parseInt(e.target.value) || 90 })}
                                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                  />
                                </div>

                                <div className="col-span-2">
                                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                    <input
                                      type="checkbox"
                                      checked={quotaForm.allow_exceed || false}
                                      onChange={(e) => setQuotaForm({ ...quotaForm, allow_exceed: e.target.checked })}
                                      className="rounded border-gray-300 dark:border-gray-600"
                                    />
                                    Permitir exceder quota
                                  </label>
                                </div>
                              </div>
                            ) : quotaUsage?.quota ? (
                              /* Visualização das quotas */
                              <div>
                                {quotaUsage.alerts && quotaUsage.alerts.length > 0 && (
                                  <div className="mb-4 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                                    {quotaUsage.alerts.map((alert, i) => (
                                      <p key={i} className="text-xs text-yellow-700 dark:text-yellow-300">⚠️ {alert}</p>
                                    ))}
                                  </div>
                                )}

                                <div className="grid grid-cols-2 gap-x-6">
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Recursos</p>
                                    <ProgressBar label="Computadores" icon={Monitor} {...quotaUsage.usage.computers} />
                                    <ProgressBar label="Impressoras" icon={Printer} {...quotaUsage.usage.printers} />
                                    <ProgressBar label="Monitores" icon={HardDrive} {...quotaUsage.usage.monitors} />
                                    <ProgressBar label="Servidores" icon={Server} {...quotaUsage.usage.servers} />
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Licenças</p>
                                    <ProgressBar label="Windows" icon={FileText} {...quotaUsage.usage.windows_licenses} />
                                    <ProgressBar label="Office" icon={FileText} {...quotaUsage.usage.office_licenses} />
                                    <ProgressBar label="Antivírus" icon={Shield} {...quotaUsage.usage.antivirus_licenses} />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              /* Sem quota configurada */
                              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                                <Server size={32} className="mx-auto mb-2 opacity-50" />
                                <p className="text-sm">Nenhuma quota configurada para este contrato</p>
                                <p className="text-xs mt-1">Clique em "Configurar" para definir os limites de recursos</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
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
