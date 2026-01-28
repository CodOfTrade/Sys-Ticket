import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Mail, Users, Building2, Loader2, ToggleLeft, ToggleRight } from 'lucide-react';
import { notificationService, NotificationConfig } from '@/services/notification.service';
import toast from 'react-hot-toast';

const ALERT_TYPE_ICONS: Record<string, string> = {
  license_expiring_30: '🟢',
  license_expiring_15: '🟡',
  license_expiring_7: '🟠',
  license_expired: '🔴',
  resource_offline_1h: '⚫',
  resource_offline_24h: '⚫',
};

const ALERT_TYPE_DESCRIPTIONS: Record<string, string> = {
  license_expiring_30: 'Alerta com 30 dias de antecedência para planejamento de renovação',
  license_expiring_15: 'Alerta com 15 dias de antecedência para ação de renovação',
  license_expiring_7: 'Alerta urgente com 7 dias de antecedência',
  license_expired: 'Notificação quando a licença expirar',
  resource_offline_1h: 'Alerta quando recurso ficar offline por 1 hora',
  resource_offline_24h: 'Alerta quando recurso ficar offline por 24 horas',
};

export function NotificationSettings() {
  const queryClient = useQueryClient();

  const { data: configsData, isLoading } = useQuery({
    queryKey: ['notification-configs'],
    queryFn: async () => {
      try {
        return await notificationService.getConfigs();
      } catch (error) {
        console.error('Erro ao buscar configs:', error);
        return [];
      }
    },
  });

  // Garantir que seja sempre um array
  const configs = Array.isArray(configsData) ? configsData : [];

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<NotificationConfig> }) =>
      notificationService.updateConfig(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-configs'] });
      toast.success('Configuração atualizada');
    },
    onError: () => {
      toast.error('Erro ao atualizar configuração');
    },
  });

  const handleToggle = (config: NotificationConfig, field: keyof NotificationConfig, value: boolean) => {
    updateMutation.mutate({
      id: config.id,
      data: { [field]: value },
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  // Agrupar por categoria
  const licenseConfigs = configs.filter(c => c.alert_type.includes('license'));
  const resourceConfigs = configs.filter(c => c.alert_type.includes('resource'));

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Configurações de Alertas
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Configure quais alertas devem ser enviados e para quem. Você pode configurar notificações
          no sistema e por email tanto para administradores quanto para clientes.
        </p>
      </div>

      {/* Alertas de Licenças */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Bell size={20} />
          Alertas de Licenças
        </h3>
        <div className="space-y-4">
          {licenseConfigs.map((config) => (
            <AlertConfigCard
              key={config.id}
              config={config}
              onToggle={handleToggle}
              isUpdating={updateMutation.isPending}
            />
          ))}
        </div>
      </div>

      {/* Alertas de Recursos */}
      {resourceConfigs.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Bell size={20} />
            Alertas de Recursos
          </h3>
          <div className="space-y-4">
            {resourceConfigs.map((config) => (
              <AlertConfigCard
                key={config.id}
                config={config}
                onToggle={handleToggle}
                isUpdating={updateMutation.isPending}
              />
            ))}
          </div>
        </div>
      )}

      {/* Legenda */}
      <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Legenda</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span>🟢</span>
            <span className="text-gray-600 dark:text-gray-400">30 dias</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🟡</span>
            <span className="text-gray-600 dark:text-gray-400">15 dias</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🟠</span>
            <span className="text-gray-600 dark:text-gray-400">7 dias</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🔴</span>
            <span className="text-gray-600 dark:text-gray-400">Expirada</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface AlertConfigCardProps {
  config: NotificationConfig;
  onToggle: (config: NotificationConfig, field: keyof NotificationConfig, value: boolean) => void;
  isUpdating: boolean;
}

function AlertConfigCard({ config, onToggle, isUpdating }: AlertConfigCardProps) {
  const icon = ALERT_TYPE_ICONS[config.alert_type] || '🔔';
  const description = ALERT_TYPE_DESCRIPTIONS[config.alert_type] || '';

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border ${
      config.is_active
        ? 'border-gray-200 dark:border-gray-700'
        : 'border-gray-200 dark:border-gray-700 opacity-60'
    } p-4`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">
              {config.alert_name}
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {description}
            </p>
          </div>
        </div>
        <button
          onClick={() => onToggle(config, 'is_active', !config.is_active)}
          disabled={isUpdating}
          className="flex items-center gap-1 text-sm"
        >
          {config.is_active ? (
            <ToggleRight size={32} className="text-green-500" />
          ) : (
            <ToggleLeft size={32} className="text-gray-400" />
          )}
        </button>
      </div>

      {/* Configurações */}
      {config.is_active && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          {/* Administradores */}
          <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Users size={16} className="text-blue-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Administradores
              </span>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.notify_admins}
                  onChange={(e) => onToggle(config, 'notify_admins', e.target.checked)}
                  disabled={isUpdating}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <Bell size={14} className="text-gray-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Notificação no sistema
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.email_admins}
                  onChange={(e) => onToggle(config, 'email_admins', e.target.checked)}
                  disabled={isUpdating}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <Mail size={14} className="text-gray-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Enviar email
                </span>
              </label>
            </div>
          </div>

          {/* Clientes */}
          <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Building2 size={16} className="text-purple-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Clientes
              </span>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.notify_clients}
                  onChange={(e) => onToggle(config, 'notify_clients', e.target.checked)}
                  disabled={isUpdating}
                  className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                />
                <Bell size={14} className="text-gray-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Notificação (portal)
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.email_clients}
                  onChange={(e) => onToggle(config, 'email_clients', e.target.checked)}
                  disabled={isUpdating}
                  className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                />
                <Mail size={14} className="text-gray-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Enviar email
                </span>
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Emails para clientes incluem proposta de renovação
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
