import { useState } from 'react';
import { Plus, Search, Filter, Key, AlertTriangle, Check, X, Loader2, Eye, Building2, Calendar, DollarSign, User, FileText, Copy, Trash2, Edit2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { resourceService } from '@/services/resource.service';
import { clientService } from '@/services/client.service';
import { LicenseStatus, LicenseType, CreateLicenseDto, UpdateLicenseDto, ActivationType, DurationType, ResourceLicense } from '@/types/resource.types';
import { useResourcesSocket } from '@/hooks/useResourcesSocket';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';

const licenseTypeLabels: Record<string, string> = {
  windows: 'Windows',
  office: 'Office',
  antivirus: 'Antivírus',
  custom: 'Personalizada',
};

const licenseStatusLabels: Record<string, string> = {
  available: 'Disponível',
  assigned: 'Atribuída',
  expired: 'Expirada',
  suspended: 'Suspensa',
};

const licenseStatusColors: Record<string, string> = {
  available: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  assigned: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  expired: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  suspended: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
};

const activationTypeLabels: Record<string, string> = {
  serial: 'Chave Serial',
  account: 'Conta/Email',
  hybrid: 'Híbrido (Serial + Conta)',
};

const initialFormData: CreateLicenseDto = {
  product_name: '',
  license_type: LicenseType.WINDOWS,
  activation_type: ActivationType.SERIAL,
  license_key: '',
  linked_email: '',
  product_version: '',
  client_id: '',
  contract_id: '',
  max_activations: 1,
  is_perpetual: true,
  expiry_date: '',
  duration_type: undefined,
  duration_value: undefined,
  activation_date: '',
  vendor: '',
  cost: undefined,
  notes: '',
};

export default function ResourceLicenses() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState<CreateLicenseDto>(initialFormData);
  const [selectedLicense, setSelectedLicense] = useState<ResourceLicense | null>(null);
  const [licenseToDelete, setLicenseToDelete] = useState<ResourceLicense | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLicense, setEditingLicense] = useState<ResourceLicense | null>(null);
  const [editFormData, setEditFormData] = useState<CreateLicenseDto>(initialFormData);

  // WebSocket para atualizações em tempo real
  useResourcesSocket({ enabled: true });

  // Query para buscar licenças
  const { data: licenses = [], isLoading } = useQuery({
    queryKey: ['licenses', { typeFilter, statusFilter }],
    queryFn: () =>
      resourceService.getAllLicenses({
        licenseType: typeFilter || undefined,
        licenseStatus: statusFilter || undefined,
      }),
  });

  // Query para licenças expirando
  const { data: expiringLicenses = [] } = useQuery({
    queryKey: ['licenses-expiring'],
    queryFn: () => resourceService.getExpiringLicenses(30),
  });

  // Query para clientes (para o select)
  const { data: clientsData } = useQuery({
    queryKey: ['clients-list'],
    queryFn: () => clientService.findAll(1, 100),
    enabled: showCreateModal,
  });

  // Mutation para criar licença
  const createMutation = useMutation({
    mutationFn: (data: CreateLicenseDto) => resourceService.createLicense(data),
    onSuccess: () => {
      toast.success('Licença criada com sucesso!');
      // Usar predicate para invalidar TODAS as queries de licenças (com ou sem filtros)
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'licenses',
      });
      setShowCreateModal(false);
      setFormData(initialFormData);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao criar licença');
    },
  });

  // Mutation para deletar licença
  const deleteMutation = useMutation({
    mutationFn: resourceService.deleteLicense,
    onSuccess: () => {
      toast.success('Licença excluída com sucesso!');
      // Usar predicate para invalidar TODAS as queries de licenças
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'licenses',
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao excluir licença');
    },
  });

  // Mutation para atualizar licença
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLicenseDto }) =>
      resourceService.updateLicense(id, data),
    onSuccess: () => {
      toast.success('Licença atualizada com sucesso!');
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'licenses',
      });
      setShowEditModal(false);
      setEditingLicense(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao atualizar licença');
    },
  });

  const handleEdit = (license: ResourceLicense) => {
    setEditingLicense(license);
    setEditFormData({
      product_name: license.product_name,
      license_type: license.license_type,
      activation_type: license.activation_type,
      license_key: license.license_key || '',
      linked_email: license.linked_email || '',
      product_version: license.product_version || '',
      client_id: license.client_id,
      contract_id: license.contract_id || '',
      max_activations: license.max_activations || 1,
      is_perpetual: license.is_perpetual,
      expiry_date: license.expiry_date || '',
      duration_type: license.duration_type || undefined,
      duration_value: license.duration_value || undefined,
      activation_date: license.activation_date || '',
      vendor: license.vendor || '',
      cost: license.cost,
      notes: license.notes || '',
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLicense) return;

    const shouldHaveKey = editFormData.activation_type === 'serial' || editFormData.activation_type === 'hybrid';
    const shouldHaveEmail = editFormData.activation_type === 'account' || editFormData.activation_type === 'hybrid';

    const data: UpdateLicenseDto = {
      ...editFormData,
      license_key: shouldHaveKey ? editFormData.license_key || undefined : undefined,
      linked_email: shouldHaveEmail ? editFormData.linked_email || undefined : undefined,
      duration_type: !editFormData.is_perpetual ? editFormData.duration_type : undefined,
      duration_value: !editFormData.is_perpetual ? editFormData.duration_value : undefined,
      activation_date: !editFormData.is_perpetual ? editFormData.activation_date || undefined : undefined,
      expiry_date: undefined,
      contract_id: editFormData.contract_id || undefined,
      cost: editFormData.cost ? Number(editFormData.cost) : undefined,
      max_activations: editFormData.max_activations ? Number(editFormData.max_activations) : 1,
    };

    updateMutation.mutate({ id: editingLicense.id, data });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.product_name || !formData.client_id) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    // Limpar campos não relevantes baseado no tipo de ativação
    const shouldHaveKey = formData.activation_type === 'serial' || formData.activation_type === 'hybrid';
    const shouldHaveEmail = formData.activation_type === 'account' || formData.activation_type === 'hybrid';

    const data: CreateLicenseDto = {
      ...formData,
      license_key: shouldHaveKey ? formData.license_key || undefined : undefined,
      linked_email: shouldHaveEmail ? formData.linked_email || undefined : undefined,
      // Se não perpétua, enviar dados de duração (backend calcula expiry_date)
      duration_type: !formData.is_perpetual ? formData.duration_type : undefined,
      duration_value: !formData.is_perpetual ? formData.duration_value : undefined,
      activation_date: !formData.is_perpetual ? formData.activation_date || undefined : undefined,
      // Não enviar expiry_date manual - backend calcula a partir da duração
      expiry_date: undefined,
      contract_id: formData.contract_id || undefined,
      cost: formData.cost ? Number(formData.cost) : undefined,
      max_activations: formData.max_activations ? Number(formData.max_activations) : 1,
    };

    createMutation.mutate(data);
  };

  const filteredLicenses = licenses.filter(
    (license) =>
      license.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      license.license_key?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: licenses.length,
    available: licenses.filter((l) => l.license_status === LicenseStatus.AVAILABLE).length,
    assigned: licenses.filter((l) => l.license_status === LicenseStatus.ASSIGNED).length,
    expired: licenses.filter((l) => l.license_status === LicenseStatus.EXPIRED).length,
    expiringSoon: expiringLicenses.length,
  };

  // Query para contratos do cliente selecionado
  const { data: contractsData } = useQuery({
    queryKey: ['client-contracts', formData.client_id],
    queryFn: () => clientService.getClientContracts(formData.client_id),
    enabled: !!formData.client_id && showCreateModal,
  });
  const contracts = contractsData || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            Licenças de Software
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gerencie licenças de Windows, Office, antivírus e mais
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus size={20} />
          Nova Licença
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <Key className="text-gray-400" size={28} />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Disponíveis</p>
              <p className="text-2xl font-bold text-green-600">{stats.available}</p>
            </div>
            <Check className="text-green-500" size={28} />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Atribuídas</p>
              <p className="text-2xl font-bold text-blue-600">{stats.assigned}</p>
            </div>
            <Key className="text-blue-500" size={28} />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Expiradas</p>
              <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
            </div>
            <X className="text-red-500" size={28} />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Expirando (30d)</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.expiringSoon}</p>
            </div>
            <AlertTriangle className="text-yellow-500" size={28} />
          </div>
        </div>
      </div>

      {/* Expiring Licenses Alert */}
      {expiringLicenses.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-200">
                Licenças expirando em breve
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                {expiringLicenses.length} {expiringLicenses.length === 1 ? 'licença expira' : 'licenças expiram'} nos próximos 30 dias
              </p>
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
                placeholder="Buscar por produto ou chave..."
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
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
                <option value="windows">Windows</option>
                <option value="office">Office</option>
                <option value="antivirus">Antivírus</option>
                <option value="custom">Personalizada</option>
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
                <option value="available">Disponível</option>
                <option value="assigned">Atribuída</option>
                <option value="expired">Expirada</option>
                <option value="suspended">Suspensa</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Licenses Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Produto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Ativações
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Expira em
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    Carregando...
                  </td>
                </tr>
              ) : filteredLicenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    Nenhuma licença encontrada
                  </td>
                </tr>
              ) : (
                filteredLicenses.map((license) => (
                  <tr
                    key={license.id}
                    onClick={() => setSelectedLicense(license)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Key className="text-gray-400" size={20} />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {license.product_name}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            {license.product_version && <span>v{license.product_version}</span>}
                            {license.activation_type && (
                              <span className="inline-flex px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded">
                                {activationTypeLabels[license.activation_type] || license.activation_type}
                              </span>
                            )}
                          </div>
                          {license.linked_email && (
                            <p className="text-xs text-blue-600 dark:text-blue-400">{license.linked_email}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Building2 className="text-gray-400" size={16} />
                        <span className="text-sm text-gray-900 dark:text-white">
                          {license.client?.nome || license.client?.nomeFantasia || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {licenseTypeLabels[license.license_type] || license.license_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          licenseStatusColors[license.license_status] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {licenseStatusLabels[license.license_status] || license.license_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {license.current_activations}/{license.max_activations || '∞'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {license.is_perpetual ? (
                        <span className="text-gray-500">Perpétua</span>
                      ) : license.expiry_date ? (
                        <div>
                          <span className={new Date(license.expiry_date) < new Date() ? 'text-red-600' : 'text-gray-900 dark:text-white'}>
                            {format(new Date(license.expiry_date), 'dd/MM/yyyy', { locale: ptBR })}
                          </span>
                          {license.duration_type && license.duration_value && (
                            <span className="text-xs text-gray-500 block">
                              ({license.duration_value} {license.duration_type === 'months' ? 'meses' : 'anos'})
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500">Não definida</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLicense(license);
                          }}
                          className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Ver detalhes"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(license);
                          }}
                          className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setLicenseToDelete(license);
                          }}
                          className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Criar Licença */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Key size={24} />
                  Nova Licença
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData(initialFormData);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Cliente */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cliente *
                </label>
                <select
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value, contract_id: '' })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Selecione um cliente</option>
                  {clientsData?.data?.map((client: any) => (
                    <option key={client.id} value={client.id}>
                      {client.nome || client.nome_fantasia || client.razao_social}
                    </option>
                  ))}
                </select>
              </div>

              {/* Contrato (opcional) */}
              {contracts.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Contrato (opcional)
                  </label>
                  <select
                    value={formData.contract_id || ''}
                    onChange={(e) => setFormData({ ...formData, contract_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Sem contrato específico</option>
                    {contracts.map((contract: any) => (
                      <option key={contract.id} value={contract.id}>
                        {contract.numero_contrato || contract.contract_number} - {contract.descricao || contract.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Produto */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nome do Produto *
                  </label>
                  <input
                    type="text"
                    value={formData.product_name}
                    onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                    required
                    placeholder="Ex: Windows 11 Pro"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                {/* Tipo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tipo *
                  </label>
                  <select
                    value={formData.license_type}
                    onChange={(e) => setFormData({ ...formData, license_type: e.target.value as LicenseType })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="windows">Windows</option>
                    <option value="office">Office</option>
                    <option value="antivirus">Antivírus</option>
                    <option value="custom">Personalizada</option>
                  </select>
                </div>

                {/* Versão */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Versão
                  </label>
                  <input
                    type="text"
                    value={formData.product_version || ''}
                    onChange={(e) => setFormData({ ...formData, product_version: e.target.value })}
                    placeholder="Ex: 11, 365, 2024"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                {/* Máx Ativações */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Máx. Ativações
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.max_activations || 1}
                    onChange={(e) => setFormData({ ...formData, max_activations: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">Quantos dispositivos podem usar esta licença</p>
                </div>
              </div>

              {/* Tipo de Ativação */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tipo de Ativação *
                </label>
                <select
                  value={formData.activation_type}
                  onChange={(e) => setFormData({ ...formData, activation_type: e.target.value as ActivationType })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="serial">Chave Serial (Windows, Antivírus)</option>
                  <option value="account">Conta/Email (Microsoft 365)</option>
                  <option value="hybrid">Híbrido - Serial + Conta (Office perpétuo)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.activation_type === 'serial' && 'Apenas chave de produto para ativação'}
                  {formData.activation_type === 'account' && 'Vinculada a uma conta de email'}
                  {formData.activation_type === 'hybrid' && 'Serial para ativar, depois vincula a uma conta'}
                </p>
              </div>

              {/* Chave da Licença - mostrar para SERIAL e HYBRID */}
              {(formData.activation_type === 'serial' || formData.activation_type === 'hybrid') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Chave da Licença
                  </label>
                  <input
                    type="text"
                    value={formData.license_key || ''}
                    onChange={(e) => setFormData({ ...formData, license_key: e.target.value })}
                    placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                  />
                </div>
              )}

              {/* Email Vinculado - mostrar para ACCOUNT e HYBRID */}
              {(formData.activation_type === 'account' || formData.activation_type === 'hybrid') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email Vinculado
                  </label>
                  <input
                    type="email"
                    value={formData.linked_email || ''}
                    onChange={(e) => setFormData({ ...formData, linked_email: e.target.value })}
                    placeholder="usuario@empresa.com"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              )}

              {/* Perpétua / Validade */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_perpetual"
                    checked={formData.is_perpetual}
                    onChange={(e) => setFormData({
                      ...formData,
                      is_perpetual: e.target.checked,
                      duration_type: e.target.checked ? undefined : formData.duration_type,
                      duration_value: e.target.checked ? undefined : formData.duration_value,
                      activation_date: e.target.checked ? '' : formData.activation_date,
                      expiry_date: e.target.checked ? '' : formData.expiry_date,
                    })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="is_perpetual" className="text-sm text-gray-700 dark:text-gray-300">
                    Licença perpétua (sem data de expiração)
                  </label>
                </div>

                {!formData.is_perpetual && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    {/* Tipo de Duração */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Tipo de Duração
                      </label>
                      <select
                        value={formData.duration_type || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          duration_type: (e.target.value as DurationType) || undefined
                        })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">Selecione</option>
                        <option value="months">Meses</option>
                        <option value="years">Anos</option>
                      </select>
                    </div>

                    {/* Quantidade */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Quantidade
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.duration_value || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          duration_value: parseInt(e.target.value) || undefined
                        })}
                        placeholder="Ex: 12"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    {/* Data de Ativação */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Data de Ativação
                      </label>
                      <input
                        type="date"
                        value={formData.activation_date || ''}
                        onChange={(e) => setFormData({ ...formData, activation_date: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Data a partir da qual começa a contar o período
                      </p>
                    </div>

                    {/* Preview da Data de Expiração */}
                    {formData.duration_type && formData.duration_value && formData.activation_date && (
                      <div className="md:col-span-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          <span className="font-medium">Data de expiração calculada:</span>{' '}
                          {(() => {
                            const date = new Date(formData.activation_date + 'T00:00:00');
                            if (formData.duration_type === 'months') {
                              date.setMonth(date.getMonth() + formData.duration_value);
                            } else {
                              date.setFullYear(date.getFullYear() + formData.duration_value);
                            }
                            return format(date, 'dd/MM/yyyy', { locale: ptBR });
                          })()}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Fornecedor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Fornecedor
                  </label>
                  <input
                    type="text"
                    value={formData.vendor || ''}
                    onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                    placeholder="Ex: Microsoft, Kaspersky"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                {/* Custo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Custo (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.cost || ''}
                    onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || undefined })}
                    placeholder="0.00"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Observações
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  placeholder="Informações adicionais sobre a licença..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                />
              </div>

              {/* Botões */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData(initialFormData);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      Criar Licença
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalhes da Licença */}
      {selectedLicense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Key size={24} />
                  Detalhes da Licença
                </h2>
                <button
                  onClick={() => setSelectedLicense(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Produto */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {selectedLicense.product_name}
                  {selectedLicense.product_version && (
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      v{selectedLicense.product_version}
                    </span>
                  )}
                </h3>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    {licenseTypeLabels[selectedLicense.license_type] || selectedLicense.license_type}
                  </span>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${licenseStatusColors[selectedLicense.license_status]}`}>
                    {licenseStatusLabels[selectedLicense.license_status] || selectedLicense.license_status}
                  </span>
                  {selectedLicense.activation_type && (
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                      {activationTypeLabels[selectedLicense.activation_type]}
                    </span>
                  )}
                </div>
              </div>

              {/* Cliente */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <Building2 size={16} />
                  Cliente
                </h4>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedLicense.client?.nome || selectedLicense.client?.nomeFantasia || 'Não informado'}
                  </p>
                  {selectedLicense.client?.razaoSocial && (
                    <p className="text-sm text-gray-500">{selectedLicense.client.razaoSocial}</p>
                  )}
                  {selectedLicense.client?.cpfCnpj && (
                    <p className="text-sm text-gray-500">{selectedLicense.client.cpfCnpj}</p>
                  )}
                  {selectedLicense.client?.email && (
                    <p className="text-sm text-blue-600 dark:text-blue-400">{selectedLicense.client.email}</p>
                  )}
                  {selectedLicense.client?.telefone && (
                    <p className="text-sm text-gray-500">{selectedLicense.client.telefone}</p>
                  )}
                </div>
              </div>

              {/* Chave e Email */}
              {(selectedLicense.license_key || selectedLicense.linked_email) && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <Key size={16} />
                    Credenciais
                  </h4>
                  <div className="space-y-2">
                    {selectedLicense.license_key && (
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Chave da Licença</p>
                          <p className="font-mono text-sm text-gray-900 dark:text-white">
                            {selectedLicense.license_key}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(selectedLicense.license_key || '');
                            toast.success('Chave copiada!');
                          }}
                          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
                        >
                          <Copy size={16} className="text-gray-500" />
                        </button>
                      </div>
                    )}
                    {selectedLicense.linked_email && (
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Email Vinculado</p>
                          <p className="text-sm text-blue-600 dark:text-blue-400">
                            {selectedLicense.linked_email}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(selectedLicense.linked_email || '');
                            toast.success('Email copiado!');
                          }}
                          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
                        >
                          <Copy size={16} className="text-gray-500" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Informações de Uso */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <User size={16} />
                    <span className="text-xs uppercase">Ativações</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedLicense.current_activations}/{selectedLicense.max_activations || '∞'}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <Calendar size={16} />
                    <span className="text-xs uppercase">Validade</span>
                  </div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedLicense.is_perpetual ? (
                      'Perpétua'
                    ) : selectedLicense.expiry_date ? (
                      format(new Date(selectedLicense.expiry_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                    ) : (
                      'Não definida'
                    )}
                  </p>
                </div>
              </div>

              {/* Informações Financeiras */}
              {(selectedLicense.vendor || selectedLicense.cost || selectedLicense.purchase_date) && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <DollarSign size={16} />
                    Informações de Compra
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {selectedLicense.vendor && (
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Fornecedor</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedLicense.vendor}</p>
                      </div>
                    )}
                    {selectedLicense.cost && (
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Custo</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          R$ {Number(selectedLicense.cost).toFixed(2)}
                        </p>
                      </div>
                    )}
                    {selectedLicense.purchase_date && (
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Data de Compra</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {format(new Date(selectedLicense.purchase_date), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      </div>
                    )}
                    {selectedLicense.purchase_order && (
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Ordem de Compra</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedLicense.purchase_order}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Observações */}
              {selectedLicense.notes && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <FileText size={16} />
                    Observações
                  </h4>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {selectedLicense.notes}
                    </p>
                  </div>
                </div>
              )}

              {/* Dispositivos Atribuídos */}
              {selectedLicense.device_assignments && selectedLicense.device_assignments.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Dispositivos Atribuídos ({selectedLicense.device_assignments.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedLicense.device_assignments.map((assignment) => (
                      <div key={assignment.id} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {assignment.resource?.name || assignment.resource?.hostname || 'Dispositivo'}
                          </p>
                          <p className="text-xs text-gray-500">
                            Atribuído em {format(new Date(assignment.assigned_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="text-xs text-gray-500 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-1">
                <p>Criada em: {format(new Date(selectedLicense.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                {selectedLicense.activated_at && (
                  <p>Primeira ativação: {format(new Date(selectedLicense.activated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                )}
              </div>
            </div>

            {/* Footer com ações */}
            <div className="sticky bottom-0 bg-white dark:bg-gray-800 p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setSelectedLicense(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  handleEdit(selectedLicense);
                  setSelectedLicense(null);
                }}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Edit2 size={16} />
                Editar
              </button>
              <button
                onClick={() => {
                  setSelectedLicense(null);
                  setLicenseToDelete(selectedLicense);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Trash2 size={16} />
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {licenseToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                  <Trash2 className="text-red-600 dark:text-red-400" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Excluir Licença
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Esta ação não pode ser desfeita
                  </p>
                </div>
              </div>

              <p className="text-gray-700 dark:text-gray-300 mb-6">
                Tem certeza que deseja excluir a licença <strong>{licenseToDelete.product_name}</strong>?
              </p>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setLicenseToDelete(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    deleteMutation.mutate(licenseToDelete.id);
                    setLicenseToDelete(null);
                  }}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {deleteMutation.isPending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} />
                      Excluir
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {showEditModal && editingLicense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Edit2 size={24} />
                  Editar Licença
                </h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingLicense(null);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              {/* Info: Cliente não pode ser alterado */}
              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Cliente:</strong> {editingLicense.client?.nome || editingLicense.client?.nomeFantasia || 'N/A'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Produto */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nome do Produto *
                  </label>
                  <input
                    type="text"
                    value={editFormData.product_name}
                    onChange={(e) => setEditFormData({ ...editFormData, product_name: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                {/* Tipo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tipo *
                  </label>
                  <select
                    value={editFormData.license_type}
                    onChange={(e) => setEditFormData({ ...editFormData, license_type: e.target.value as LicenseType })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="windows">Windows</option>
                    <option value="office">Office</option>
                    <option value="antivirus">Antivírus</option>
                    <option value="custom">Personalizada</option>
                  </select>
                </div>

                {/* Versão */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Versão
                  </label>
                  <input
                    type="text"
                    value={editFormData.product_version || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, product_version: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                {/* Máx Ativações */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Máx. Ativações
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editFormData.max_activations || 1}
                    onChange={(e) => setEditFormData({ ...editFormData, max_activations: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Tipo de Ativação */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tipo de Ativação
                </label>
                <select
                  value={editFormData.activation_type}
                  onChange={(e) => setEditFormData({ ...editFormData, activation_type: e.target.value as ActivationType })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="serial">Chave Serial</option>
                  <option value="account">Conta/Email</option>
                  <option value="hybrid">Híbrido</option>
                </select>
              </div>

              {/* Chave da Licença */}
              {(editFormData.activation_type === 'serial' || editFormData.activation_type === 'hybrid') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Chave da Licença
                  </label>
                  <input
                    type="text"
                    value={editFormData.license_key || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, license_key: e.target.value })}
                    placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                  />
                </div>
              )}

              {/* Email Vinculado */}
              {(editFormData.activation_type === 'account' || editFormData.activation_type === 'hybrid') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email Vinculado
                  </label>
                  <input
                    type="email"
                    value={editFormData.linked_email || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, linked_email: e.target.value })}
                    placeholder="usuario@empresa.com"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              )}

              {/* Perpétua / Validade */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit_is_perpetual"
                    checked={editFormData.is_perpetual}
                    onChange={(e) => setEditFormData({
                      ...editFormData,
                      is_perpetual: e.target.checked,
                      duration_type: e.target.checked ? undefined : editFormData.duration_type,
                      duration_value: e.target.checked ? undefined : editFormData.duration_value,
                      activation_date: e.target.checked ? '' : editFormData.activation_date,
                    })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="edit_is_perpetual" className="text-sm text-gray-700 dark:text-gray-300">
                    Licença perpétua (sem data de expiração)
                  </label>
                </div>

                {!editFormData.is_perpetual && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    {/* Tipo de Duração */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Tipo de Duração
                      </label>
                      <select
                        value={editFormData.duration_type || ''}
                        onChange={(e) => setEditFormData({
                          ...editFormData,
                          duration_type: (e.target.value as DurationType) || undefined
                        })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">Selecione</option>
                        <option value="months">Meses</option>
                        <option value="years">Anos</option>
                      </select>
                    </div>

                    {/* Quantidade */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Quantidade
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={editFormData.duration_value || ''}
                        onChange={(e) => setEditFormData({
                          ...editFormData,
                          duration_value: parseInt(e.target.value) || undefined
                        })}
                        placeholder="Ex: 12"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    {/* Data de Ativação */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Data de Ativação
                      </label>
                      <input
                        type="date"
                        value={editFormData.activation_date || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, activation_date: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Data a partir da qual começa a contar
                      </p>
                    </div>

                    {/* Preview da Data de Expiração */}
                    {editFormData.duration_type && editFormData.duration_value && editFormData.activation_date && (
                      <div className="md:col-span-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          <span className="font-medium">Data de expiração calculada:</span>{' '}
                          {(() => {
                            const date = new Date(editFormData.activation_date + 'T00:00:00');
                            if (editFormData.duration_type === 'months') {
                              date.setMonth(date.getMonth() + editFormData.duration_value);
                            } else {
                              date.setFullYear(date.getFullYear() + editFormData.duration_value);
                            }
                            return format(date, 'dd/MM/yyyy', { locale: ptBR });
                          })()}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Fornecedor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Fornecedor
                  </label>
                  <input
                    type="text"
                    value={editFormData.vendor || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, vendor: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                {/* Custo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Custo (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editFormData.cost || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, cost: parseFloat(e.target.value) || undefined })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Observações
                </label>
                <textarea
                  value={editFormData.notes || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                />
              </div>

              {/* Botões */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingLicense(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      Salvar Alterações
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
