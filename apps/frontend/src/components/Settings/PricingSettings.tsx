import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit, Save, X } from 'lucide-react';
import { api } from '@/services/api';

interface PricingConfig {
  id: string;
  service_type: 'internal' | 'remote' | 'external';
  hourly_rate_normal: number;
  minimum_charge: number;
  minimum_charge_threshold_minutes: number;
  charge_excess_per_minute: boolean;
  description: string;
}

const SERVICE_TYPE_LABELS = {
  internal: 'Atendimento Interno',
  remote: 'Atendimento Remoto',
  external: 'Atendimento Externo/Presencial',
};

export function PricingSettings() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<PricingConfig>>({});

  // Buscar configurações de preço
  const { data: pricingConfigs = [], isLoading } = useQuery({
    queryKey: ['pricing-configs'],
    queryFn: async () => {
      const response = await api.get('/v1/pricing-configs');
      return response.data.data as PricingConfig[];
    },
  });

  // Mutation para atualizar configuração
  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<PricingConfig> }) => {
      const response = await api.patch(`/v1/pricing-configs/${data.id}`, data.updates);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-configs'] });
      setEditingId(null);
      setFormData({});
    },
  });

  const handleEdit = (config: PricingConfig) => {
    setEditingId(config.id);
    setFormData(config);
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({});
  };

  const handleSave = (id: string) => {
    updateMutation.mutate({ id, updates: formData });
  };

  const handleChange = (field: keyof PricingConfig, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Configurações de Precificação
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Configure os valores e regras de cobrança para cada tipo de atendimento.
        </p>
      </div>

      <div className="space-y-4">
        {pricingConfigs.map((config) => {
          const isEditing = editingId === config.id;
          const currentData = isEditing ? formData : config;

          return (
            <div
              key={config.id}
              className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {SERVICE_TYPE_LABELS[config.service_type]}
                  </h3>
                  {!isEditing && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {config.description}
                    </p>
                  )}
                </div>

                {!isEditing ? (
                  <button
                    onClick={() => handleEdit(config)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    Editar
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSave(config.id)}
                      disabled={updateMutation.isPending}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      Salvar
                    </button>
                    <button
                      onClick={handleCancel}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Cancelar
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Valor por Hora */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Valor por Hora (R$)
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={currentData.hourly_rate_normal || 0}
                      onChange={(e) =>
                        handleChange('hourly_rate_normal', parseFloat(e.target.value) || 0)
                      }
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  ) : (
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      R$ {Number(config.hourly_rate_normal).toFixed(2)}
                    </p>
                  )}
                </div>

                {/* Valor Mínimo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Valor Mínimo (R$)
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={currentData.minimum_charge || 0}
                      onChange={(e) =>
                        handleChange('minimum_charge', parseFloat(e.target.value) || 0)
                      }
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  ) : (
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      R$ {Number(config.minimum_charge).toFixed(2)}
                    </p>
                  )}
                </div>

                {/* Tempo Mínimo (Threshold) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tempo Mínimo (minutos)
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={currentData.minimum_charge_threshold_minutes || 60}
                      onChange={(e) =>
                        handleChange('minimum_charge_threshold_minutes', parseInt(e.target.value) || 60)
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  ) : (
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {config.minimum_charge_threshold_minutes} min
                    </p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Atendimentos com duração menor que este tempo cobrarão o valor mínimo
                  </p>
                </div>

                {/* Cobrança Excedente */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Cobrança do Excedente
                  </label>
                  {isEditing ? (
                    <select
                      value={currentData.charge_excess_per_minute ? 'minute' : 'hour'}
                      onChange={(e) =>
                        handleChange('charge_excess_per_minute', e.target.value === 'minute')
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="minute">Por Minuto</option>
                      <option value="hour">Por Hora</option>
                    </select>
                  ) : (
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {config.charge_excess_per_minute ? 'Por Minuto' : 'Por Hora'}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Como será cobrado o tempo excedente após o tempo mínimo
                  </p>
                </div>
              </div>

              {/* Descrição (modo edição) */}
              {isEditing && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Descrição
                  </label>
                  <textarea
                    value={currentData.description || ''}
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              )}

              {/* Exemplo de Cálculo */}
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
                  Exemplos de Cálculo:
                </h4>
                <div className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                  <p>
                    • 30 min → R$ {Number(config.minimum_charge).toFixed(2)} (valor mínimo)
                  </p>
                  <p>
                    • {config.minimum_charge_threshold_minutes} min → R${' '}
                    {Number(config.minimum_charge).toFixed(2)} (valor mínimo)
                  </p>
                  {config.charge_excess_per_minute ? (
                    <p>
                      • {config.minimum_charge_threshold_minutes + 15} min → R${' '}
                      {(
                        Number(config.minimum_charge) +
                        15 * (Number(config.hourly_rate_normal) / 60)
                      ).toFixed(2)}{' '}
                      (mínimo + 15 min × R$ {(Number(config.hourly_rate_normal) / 60).toFixed(2)}
                      /min)
                    </p>
                  ) : (
                    <p>
                      • {config.minimum_charge_threshold_minutes + 15} min → R${' '}
                      {(
                        Number(config.minimum_charge) + Number(config.hourly_rate_normal)
                      ).toFixed(2)}{' '}
                      (mínimo + 1h completa)
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
