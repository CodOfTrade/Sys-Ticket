import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, HardDrive, Printer, Monitor, Server, Key, RefreshCw } from 'lucide-react';
import { resourceService } from '@/services/resource.service';
import { QuotaUsageItem } from '@/types/resource.types';

interface QuotaBarProps {
  label: string;
  icon: React.ReactNode;
  quota: QuotaUsageItem;
  alertThreshold: number;
}

function QuotaBar({ label, icon, quota, alertThreshold }: QuotaBarProps) {
  const isAlert = quota.percentage >= alertThreshold;
  const isExceeded = quota.used > quota.quota;

  const getBarColor = () => {
    if (isExceeded) return 'bg-red-600';
    if (isAlert) return 'bg-yellow-500';
    return 'bg-blue-600';
  };

  const getTextColor = () => {
    if (isExceeded) return 'text-red-600';
    if (isAlert) return 'text-yellow-600';
    return 'text-blue-600';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {icon}
          <h3 className="font-semibold text-gray-900 dark:text-white">{label}</h3>
        </div>
        <div className="flex items-center gap-2">
          {isAlert && <AlertTriangle className="text-yellow-500" size={20} />}
          <span className={`text-2xl font-bold ${getTextColor()}`}>
            {quota.used} / {quota.quota}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full ${getBarColor()} transition-all duration-300`}
            style={{ width: `${Math.min(quota.percentage, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            {quota.available} {quota.available === 1 ? 'disponível' : 'disponíveis'}
          </span>
          <span className={`font-medium ${getTextColor()}`}>
            {quota.percentage.toFixed(1)}% usado
          </span>
        </div>
      </div>

      {isExceeded && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-300">
            ⚠️ Quota excedida! {quota.used - quota.quota} além do limite.
          </p>
        </div>
      )}

      {isAlert && !isExceeded && (
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            ⚠️ Atenção: quota próxima do limite ({alertThreshold}%)
          </p>
        </div>
      )}
    </div>
  );
}

export default function ContractQuotas() {
  const [selectedContract, setSelectedContract] = useState<string>('');

  // TODO: Buscar lista de contratos
  // const { data: contracts } = useQuery({
  //   queryKey: ['contracts'],
  //   queryFn: () => contractService.getAll(),
  // });

  const { data: quotaUsage, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['quota-usage', selectedContract],
    queryFn: () => resourceService.getQuotaUsage(selectedContract),
    enabled: !!selectedContract,
  });

  const handleRecalculate = async () => {
    if (selectedContract) {
      await resourceService.recalculateQuota(selectedContract);
      refetch();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
          Quotas por Contrato
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Visualize e gerencie as quotas de recursos e licenças
        </p>
      </div>

      {/* Contract Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Selecione um Contrato
            </label>
            <input
              type="text"
              placeholder="Digite o ID do contrato"
              value={selectedContract}
              onChange={(e) => setSelectedContract(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Exemplo: contrato_123
            </p>
          </div>

          {selectedContract && quotaUsage && (
            <button
              onClick={handleRecalculate}
              disabled={isFetching}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={18} className={isFetching ? 'animate-spin' : ''} />
              Recalcular Uso
            </button>
          )}
        </div>
      </div>

      {/* Empty State */}
      {!selectedContract && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Key className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Nenhum contrato selecionado
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Selecione um contrato acima para visualizar suas quotas
          </p>
        </div>
      )}

      {/* Loading State */}
      {selectedContract && isLoading && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <p className="text-gray-500">Carregando quotas...</p>
        </div>
      )}

      {/* Quota Display */}
      {selectedContract && quotaUsage && !isLoading && (
        <>
          {/* Alerts Summary */}
          {quotaUsage.alerts && quotaUsage.alerts.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" size={24} />
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
                    Alertas de Quota
                  </h3>
                  <ul className="space-y-1">
                    {quotaUsage.alerts.map((alert, index) => (
                      <li key={index} className="text-sm text-yellow-700 dark:text-yellow-300">
                        • {alert}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Resources Section */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Recursos Físicos
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <QuotaBar
                label="Computadores"
                icon={<HardDrive className="text-blue-600" size={24} />}
                quota={quotaUsage.usage.computers}
                alertThreshold={quotaUsage.quota.alert_threshold}
              />
              <QuotaBar
                label="Impressoras"
                icon={<Printer className="text-purple-600" size={24} />}
                quota={quotaUsage.usage.printers}
                alertThreshold={quotaUsage.quota.alert_threshold}
              />
              <QuotaBar
                label="Monitores"
                icon={<Monitor className="text-green-600" size={24} />}
                quota={quotaUsage.usage.monitors}
                alertThreshold={quotaUsage.quota.alert_threshold}
              />
              <QuotaBar
                label="Servidores"
                icon={<Server className="text-red-600" size={24} />}
                quota={quotaUsage.usage.servers}
                alertThreshold={quotaUsage.quota.alert_threshold}
              />
            </div>
          </div>

          {/* Licenses Section */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Licenças de Software
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <QuotaBar
                label="Windows"
                icon={<Key className="text-blue-600" size={24} />}
                quota={quotaUsage.usage.windows_licenses}
                alertThreshold={quotaUsage.quota.alert_threshold}
              />
              <QuotaBar
                label="Office"
                icon={<Key className="text-orange-600" size={24} />}
                quota={quotaUsage.usage.office_licenses}
                alertThreshold={quotaUsage.quota.alert_threshold}
              />
              <QuotaBar
                label="Antivírus"
                icon={<Key className="text-cyan-600" size={24} />}
                quota={quotaUsage.usage.antivirus_licenses}
                alertThreshold={quotaUsage.quota.alert_threshold}
              />
            </div>
          </div>

          {/* Quota Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Configurações da Quota
            </h3>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Threshold de Alerta</dt>
                <dd className="text-lg font-medium text-gray-900 dark:text-white">
                  {quotaUsage.quota.alert_threshold}%
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Permitir Exceder</dt>
                <dd className="text-lg font-medium text-gray-900 dark:text-white">
                  {quotaUsage.quota.allow_exceed ? 'Sim' : 'Não'}
                </dd>
              </div>
            </dl>
          </div>
        </>
      )}

      {/* Error State */}
      {selectedContract && !isLoading && !quotaUsage && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <AlertTriangle className="mx-auto text-red-400 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Quota não encontrada
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Não foi possível encontrar quotas configuradas para este contrato
          </p>
        </div>
      )}
    </div>
  );
}
