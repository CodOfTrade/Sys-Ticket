import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Key, AlertTriangle, Check, X, Loader2, Eye, Building2, Calendar, DollarSign, User, FileText, Copy, Trash2, Download, RotateCcw, Clock, Bell, Mail, Edit2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { resourceService } from '@/services/resource.service';
import { clientService } from '@/services/client.service';
import { LicenseStatus, LicenseType, CreateLicenseDto, ActivationType, DurationType, ResourceLicense, LicenseHistoryEntry } from '@/types/resource.types';
import { useResourcesSocket } from '@/hooks/useResourcesSocket';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { EditActivationDateModal } from '@/components/resources/EditActivationDateModal';
import { EditContactModal } from '@/components/resources/EditContactModal';

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

const eventTypeLabels: Record<string, string> = {
  created: 'Criada',
  updated: 'Atualizada',
  deleted: 'Excluída',
  status_changed: 'Status Alterado',
  assigned: 'Atribuída',
  unassigned: 'Desatribuída',
  expired: 'Expirada',
  renewed: 'Renovada',
  suspended: 'Suspensa',
  reactivated: 'Reativada',
};

const getEventTypeLabel = (type: string) => eventTypeLabels[type] || type;

const getEventTypeStyle = (type: string) => {
  switch (type) {
    case 'created': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    case 'renewed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    case 'expired': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    case 'suspended': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    case 'assigned': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
    case 'unassigned': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    case 'reactivated': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }
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
  notification_email: '',
  requester_name: '',
  requester_phone: '',
};

export default function ResourceLicenses() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [clientFilter, setClientFilter] = useState<string>('');
  const [vendorFilter, setVendorFilter] = useState<string>('');
  const [expiryStartFilter, setExpiryStartFilter] = useState<string>('');
  const [expiryEndFilter, setExpiryEndFilter] = useState<string>('');
  const [costMinFilter, setCostMinFilter] = useState<string>('');
  const [costMaxFilter, setCostMaxFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState<CreateLicenseDto>(initialFormData);
  const [selectedLicense, setSelectedLicense] = useState<ResourceLicense | null>(null);
  const [licenseToDelete, setLicenseToDelete] = useState<ResourceLicense | null>(null);
  const [editActivationDate, setEditActivationDate] = useState<string>('');
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [editNotificationEmail, setEditNotificationEmail] = useState<string>('');
  const [editRequesterName, setEditRequesterName] = useState<string>('');
  const [editRequesterPhone, setEditRequesterPhone] = useState<string>('');
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

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

  // Query para clientes (para o select de filtro e modal)
  const { data: clientsData } = useQuery({
    queryKey: ['clients-list'],
    queryFn: () => clientService.findAll(1, 100),
  });

  // Query para histórico da licença selecionada
  const { data: licenseHistory = [], isLoading: loadingHistory } = useQuery({
    queryKey: ['license-history', selectedLicense?.id],
    queryFn: () => resourceService.getLicenseHistory(selectedLicense!.id),
    enabled: !!selectedLicense,
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
      setSelectedContactId('');
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

  // Mutation para atualizar data de ativação da licença
  const updateActivationMutation = useMutation({
    mutationFn: ({ id, activation_date }: { id: string; activation_date: string }) =>
      resourceService.updateLicense(id, { activation_date }),
    onSuccess: (updatedLicense) => {
      toast.success('Data de ativação atualizada! Validade recalculada.');
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'licenses',
      });
      // Atualizar o selectedLicense com os dados atualizados
      setSelectedLicense(updatedLicense);
      setEditActivationDate('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao atualizar data de ativação');
    },
  });


  // Mutation para atualizar campos de contato
  const updateContactMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { notification_email?: string; requester_name?: string; requester_phone?: string } }) =>
      resourceService.updateLicense(id, data),
    onSuccess: (updatedLicense) => {
      toast.success('Contato atualizado com sucesso!');
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'licenses',
      });
      setSelectedLicense(updatedLicense);
      setEditNotificationEmail('');
      setEditRequesterName('');
      setEditRequesterPhone('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao atualizar contato');
    },
  });


  // useEffect para popular campos de contato quando abrir modal
  useEffect(() => {
    if (selectedLicense) {
      setEditNotificationEmail(selectedLicense.notification_email || '');
      setEditRequesterName(selectedLicense.requester_name || '');
      setEditRequesterPhone(selectedLicense.requester_phone || '');
    } else {
      setEditNotificationEmail('');
      setEditRequesterName('');
      setEditRequesterPhone('');
    }
  }, [selectedLicense]);

  const handleContactSelect = (contactId: string) => {
    setSelectedContactId(contactId);

    if (contactId) {
      const contact = contacts.find(c => c.id === contactId);
      if (contact) {
        setFormData({
          ...formData,
          notification_email: contact.email || '',
          requester_name: contact.name || '',
          requester_phone: contact.phone || '',
        });
      }
    } else {
      // Limpar campos se desmarcar
      setFormData({
        ...formData,
        notification_email: '',
        requester_name: '',
        requester_phone: '',
      });
    }
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

  const filteredLicenses = licenses.filter((license) => {
    // Filtro de busca
    const matchesSearch = !searchTerm ||
      license.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      license.license_key?.toLowerCase().includes(searchTerm.toLowerCase());

    // Filtro de cliente
    const matchesClient = !clientFilter || license.client_id === clientFilter;

    // Filtro de fornecedor
    const matchesVendor = !vendorFilter ||
      license.vendor?.toLowerCase().includes(vendorFilter.toLowerCase());

    // Filtro de data de expiração
    const matchesExpiryStart = !expiryStartFilter || !license.expiry_date ||
      new Date(license.expiry_date) >= new Date(expiryStartFilter);
    const matchesExpiryEnd = !expiryEndFilter || !license.expiry_date ||
      new Date(license.expiry_date) <= new Date(expiryEndFilter);

    // Filtro de custo
    const matchesCostMin = !costMinFilter || !license.cost ||
      Number(license.cost) >= Number(costMinFilter);
    const matchesCostMax = !costMaxFilter || !license.cost ||
      Number(license.cost) <= Number(costMaxFilter);

    return matchesSearch && matchesClient && matchesVendor &&
           matchesExpiryStart && matchesExpiryEnd && matchesCostMin && matchesCostMax;
  });

  // Verifica se há algum filtro avançado aplicado
  const hasAdvancedFilters = clientFilter || vendorFilter || expiryStartFilter ||
    expiryEndFilter || costMinFilter || costMaxFilter;

  // Função para limpar todos os filtros
  const clearAllFilters = () => {
    setSearchTerm('');
    setTypeFilter('');
    setStatusFilter('');
    setClientFilter('');
    setVendorFilter('');
    setExpiryStartFilter('');
    setExpiryEndFilter('');
    setCostMinFilter('');
    setCostMaxFilter('');
  };

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

  // Query para contatos do cliente selecionado
  const { data: contactsData } = useQuery({
    queryKey: ['client-contacts', formData.client_id],
    queryFn: () => clientService.getContacts(formData.client_id),
    enabled: !!formData.client_id && showCreateModal,
  });
  const contacts = contactsData || [];

  // Estado para exportação
  const [isExporting, setIsExporting] = useState(false);

  // Handler para exportar Excel
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      await resourceService.exportLicensesToExcel({
        clientId: clientFilter || undefined,
        licenseStatus: statusFilter || undefined,
        licenseType: typeFilter || undefined,
      });
      toast.success('Relatório exportado com sucesso!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao exportar relatório');
    } finally {
      setIsExporting(false);
    }
  };

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
        <div className="flex gap-2">
          <button
            onClick={handleExportExcel}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300 disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download size={20} />
                Exportar Excel
              </>
            )}
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus size={20} />
            Nova Licença
          </button>
        </div>
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
            className={`inline-flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
              hasAdvancedFilters || typeFilter || statusFilter
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            <Filter size={20} />
            Filtros
            {(hasAdvancedFilters || typeFilter || statusFilter) && (
              <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {[typeFilter, statusFilter, clientFilter, vendorFilter, expiryStartFilter, expiryEndFilter, costMinFilter, costMaxFilter].filter(Boolean).length}
              </span>
            )}
          </button>

          {/* Results count */}
          {(searchTerm || hasAdvancedFilters || typeFilter || statusFilter) && (
            <span className="text-sm text-gray-500 dark:text-gray-400 self-center">
              {filteredLicenses.length} de {licenses.length} licenças
            </span>
          )}
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
            {/* Primeira linha - filtros básicos */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Cliente
                </label>
                <select
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Todos</option>
                  {clientsData?.data?.map((client: any) => (
                    <option key={client.id} value={client.id}>
                      {client.nome || client.nome_fantasia || client.razao_social}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Fornecedor
                </label>
                <input
                  type="text"
                  value={vendorFilter}
                  onChange={(e) => setVendorFilter(e.target.value)}
                  placeholder="Filtrar por fornecedor..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Segunda linha - filtros de data e custo */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Expira de
                </label>
                <input
                  type="date"
                  value={expiryStartFilter}
                  onChange={(e) => setExpiryStartFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Expira até
                </label>
                <input
                  type="date"
                  value={expiryEndFilter}
                  onChange={(e) => setExpiryEndFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Custo mínimo (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={costMinFilter}
                  onChange={(e) => setCostMinFilter(e.target.value)}
                  placeholder="0,00"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Custo máximo (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={costMaxFilter}
                  onChange={(e) => setCostMaxFilter(e.target.value)}
                  placeholder="0,00"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Botão limpar filtros */}
            {(hasAdvancedFilters || typeFilter || statusFilter || searchTerm) && (
              <div className="flex justify-end">
                <button
                  onClick={clearAllFilters}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <RotateCcw size={16} />
                  Limpar filtros
                </button>
              </div>
            )}
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
                    onClick={() => {
                      setSelectedLicense(license);
                      setEditActivationDate(license.activation_date || '');
                    }}
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
                            setEditActivationDate(license.activation_date || '');
                          }}
                          className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Ver detalhes"
                        >
                          <Eye size={16} />
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
                    setSelectedContactId('');
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
                  onChange={(e) => {
                    setFormData({ ...formData, client_id: e.target.value, contract_id: '' });
                    setSelectedContactId(''); // Limpar solicitante ao trocar de cliente
                  }}
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

              {/* Seção de Contato para Notificações */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-3">
                  <Bell className="text-blue-600 dark:text-blue-400" size={20} />
                  <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300">
                    Contato para Notificações de Vencimento
                  </h3>
                </div>
                <p className="text-xs text-blue-700 dark:text-blue-300 mb-4">
                  Configure o email e contato que receberá alertas sobre o vencimento desta licença.
                  Se não informado, será usado o email principal do cliente.
                </p>

                {/* Seletor de Solicitante */}
                {contacts.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      <User size={14} className="inline mr-1" />
                      Selecionar Solicitante Cadastrado
                    </label>
                    <select
                      value={selectedContactId}
                      onChange={(e) => handleContactSelect(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Nenhum (preencher manualmente)</option>
                      {contacts.map((contact) => (
                        <option key={contact.id} value={contact.id}>
                          {contact.name}
                          {contact.is_primary && ' ⭐ (Principal)'}
                          {contact.email && ` - ${contact.email}`}
                          {contact.department && ` - ${contact.department}`}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Selecione um contato cadastrado para preencher automaticamente os campos abaixo
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email de Notificação
                    </label>
                    <input
                      type="email"
                      value={formData.notification_email || ''}
                      onChange={(e) => setFormData({ ...formData, notification_email: e.target.value })}
                      placeholder="Ex: ti@empresa.com ou responsavel@empresa.com"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Email específico para receber avisos de vencimento e renovação
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nome do Responsável
                    </label>
                    <input
                      type="text"
                      value={formData.requester_name || ''}
                      onChange={(e) => setFormData({ ...formData, requester_name: e.target.value })}
                      placeholder="Ex: João Silva"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Telefone de Contato
                    </label>
                    <input
                      type="tel"
                      value={formData.requester_phone || ''}
                      onChange={(e) => setFormData({ ...formData, requester_phone: e.target.value })}
                      placeholder="Ex: (11) 98765-4321"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Botões */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData(initialFormData);
                    setSelectedContactId('');
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
                  onClick={() => {
                    setSelectedLicense(null);
                    setEditActivationDate('');
                  }}
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
                  {!selectedLicense.is_perpetual && selectedLicense.duration_type && selectedLicense.duration_value && (
                    <p className="text-xs text-gray-500 mt-1">
                      ({selectedLicense.duration_value} {selectedLicense.duration_type === 'months' ? 'meses' : 'anos'})
                    </p>
                  )}
                </div>
              </div>

              {/* Seção de Data de Ativação - Com ícone edit */}
              {!selectedLicense.is_perpetual && selectedLicense.duration_type && selectedLicense.duration_value && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <Calendar size={16} />
                    Data de Ativação
                  </h4>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Calendar className="text-gray-400" size={18} />
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Data de Ativação</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {selectedLicense.activation_date
                            ? format(new Date(selectedLicense.activation_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })
                            : 'Não definida'}
                        </p>
                        {selectedLicense.activation_date && (
                          <p className="text-xs text-gray-500 mt-1">
                            Expira em: {(() => {
                              const date = new Date(selectedLicense.activation_date + 'T00:00:00');
                              if (selectedLicense.duration_type === 'months') {
                                date.setMonth(date.getMonth() + (selectedLicense.duration_value || 0));
                              } else {
                                date.setFullYear(date.getFullYear() + (selectedLicense.duration_value || 0));
                              }
                              return format(date, 'dd/MM/yyyy', { locale: ptBR });
                            })()}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setShowActivationModal(true)}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="Editar data de ativação"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Contato para Notificações - Com ícone edit */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <Bell size={16} />
                  Contato para Notificações de Vencimento
                </h4>

                {/* Email */}
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="text-gray-400" size={18} />
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Email de Notificação</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {selectedLicense.notification_email || 'Não definido'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowContactModal(true)}
                    className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                    title="Editar contato"
                  >
                    <Edit2 size={16} />
                  </button>
                </div>

                {/* Solicitante */}
                {(selectedLicense.requester_name || selectedLicense.requester_phone) && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <div className="flex items-center gap-3">
                      <User className="text-gray-400" size={18} />
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Solicitante</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {selectedLicense.requester_name || 'Não definido'}
                        </p>
                        {selectedLicense.requester_phone && (
                          <p className="text-xs text-gray-500">{selectedLicense.requester_phone}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setShowContactModal(true)}
                      className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                      title="Editar contato"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                )}

                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    ℹ️ Este contato receberá automaticamente os avisos de vencimento desta licença por email.
                    {!selectedLicense.notification_email && " Se não configurado, será usado o email principal do cliente."}
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

              {/* Histórico de Alterações */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <Clock size={16} />
                  Histórico de Alterações
                </h4>
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="animate-spin text-gray-400" size={24} />
                  </div>
                ) : licenseHistory.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    Nenhum registro de alteração
                  </p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {licenseHistory.map((entry: LicenseHistoryEntry) => (
                      <div key={entry.id} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${getEventTypeStyle(entry.event_type)}`}>
                              {getEventTypeLabel(entry.event_type)}
                            </span>
                            {entry.event_description && (
                              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 break-words">
                                {entry.event_description}
                              </p>
                            )}
                            {entry.is_automatic && (
                              <span className="text-xs text-gray-400 italic block mt-1">Automático</span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {format(new Date(entry.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

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
                onClick={() => {
                  setSelectedLicense(null);
                  setEditActivationDate('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  setSelectedLicense(null);
                  setEditActivationDate('');
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

      {/* Mini-modais */}
      {showActivationModal && selectedLicense && !selectedLicense.is_perpetual &&
       selectedLicense.duration_value && selectedLicense.duration_type && (
        <EditActivationDateModal
          currentDate={selectedLicense.activation_date || ''}
          durationValue={selectedLicense.duration_value}
          durationType={selectedLicense.duration_type}
          onSave={(newDate) => {
            updateActivationMutation.mutate({
              id: selectedLicense.id,
              activation_date: newDate,
            });
            setShowActivationModal(false);
          }}
          onClose={() => setShowActivationModal(false)}
          isSaving={updateActivationMutation.isPending}
        />
      )}

      {showContactModal && selectedLicense && (
        <EditContactModal
          currentEmail={selectedLicense.notification_email || ''}
          currentName={selectedLicense.requester_name || ''}
          currentPhone={selectedLicense.requester_phone || ''}
          onSave={(data) => {
            updateContactMutation.mutate({
              id: selectedLicense.id,
              data: {
                notification_email: data.email,
                requester_name: data.name,
                requester_phone: data.phone,
              },
            });
            setShowContactModal(false);
          }}
          onClose={() => setShowContactModal(false)}
          isSaving={updateContactMutation.isPending}
        />
      )}
    </div>
  );
}
