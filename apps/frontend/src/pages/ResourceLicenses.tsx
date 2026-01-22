import { useState } from 'react';
import { Plus, Search, Filter, Key, AlertTriangle, Check, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { resourceService } from '@/services/resource.service';
import { LicenseType, LicenseStatus } from '@/types/resource.types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const licenseTypeLabels = {
  windows: 'Windows',
  office: 'Office',
  antivirus: 'Antivírus',
  custom: 'Personalizada',
};

const licenseStatusLabels = {
  available: 'Disponível',
  assigned: 'Atribuída',
  expired: 'Expirada',
  suspended: 'Suspensa',
};

const licenseStatusColors = {
  available: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  assigned: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  expired: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  suspended: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
};

export default function ResourceLicenses() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

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

  // Mutation para deletar licença
  const deleteMutation = useMutation({
    mutationFn: resourceService.deleteLicense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
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
                  Atribuída a
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
                        {licenseTypeLabels[license.license_type]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          licenseStatusColors[license.license_status]
                        }`}
                      >
                        {licenseStatusLabels[license.license_status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {license.resource?.name || license.assigned_to_user || '-'}
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
    </div>
  );
}
