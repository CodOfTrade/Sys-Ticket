import { useState } from 'react';
import { Plus, Search, Filter, Key, AlertTriangle, Check, X, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { resourceService } from '@/services/resource.service';
import { clientService } from '@/services/client.service';
import { LicenseStatus, LicenseType, CreateLicenseDto } from '@/types/resource.types';
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

const initialFormData: CreateLicenseDto = {
  product_name: '',
  license_type: LicenseType.WINDOWS,
  license_key: '',
  product_version: '',
  client_id: '',
  contract_id: '',
  max_activations: 1,
  is_perpetual: true,
  expiry_date: '',
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
    queryFn: () => clientService.getAll({ perPage: 100 }),
    enabled: showCreateModal,
  });

  // Mutation para criar licença
  const createMutation = useMutation({
    mutationFn: (data: CreateLicenseDto) => resourceService.createLicense(data),
    onSuccess: () => {
      toast.success('Licença criada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
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
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao excluir licença');
    },
  });

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta licença?')) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (error) {
        console.error('Erro ao excluir licença:', error);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.product_name || !formData.client_id) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    const data: CreateLicenseDto = {
      ...formData,
      expiry_date: formData.is_perpetual ? undefined : formData.expiry_date || undefined,
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

  // Buscar contratos do cliente selecionado
  const selectedClient = clientsData?.data?.find((c: any) => c.id === formData.client_id);
  const contracts = selectedClient?.contracts || [];

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
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Carregando...
                  </td>
                </tr>
              ) : filteredLicenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Nenhuma licença encontrada
                  </td>
                </tr>
              ) : (
                filteredLicenses.map((license) => (
                  <tr
                    key={license.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Key className="text-gray-400" size={20} />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {license.product_name}
                          </p>
                          {license.product_version && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              v{license.product_version}
                            </p>
                          )}
                        </div>
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
                        <span className={new Date(license.expiry_date) < new Date() ? 'text-red-600' : 'text-gray-900 dark:text-white'}>
                          {format(new Date(license.expiry_date), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDelete(license.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Excluir
                      </button>
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
                      {client.name}
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
                        {contract.contract_number} - {contract.name}
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

              {/* Chave da Licença */}
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

              {/* Perpétua / Validade */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_perpetual"
                    checked={formData.is_perpetual}
                    onChange={(e) => setFormData({ ...formData, is_perpetual: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="is_perpetual" className="text-sm text-gray-700 dark:text-gray-300">
                    Licença perpétua (sem data de expiração)
                  </label>
                </div>

                {!formData.is_perpetual && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Data de Expiração
                    </label>
                    <input
                      type="date"
                      value={formData.expiry_date || ''}
                      onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
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
    </div>
  );
}
