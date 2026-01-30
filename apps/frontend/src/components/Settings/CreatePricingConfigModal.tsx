import { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import pricingConfigService from '@/services/pricing-config.service';
import {
  CreatePricingConfigDto,
  ServiceModality,
} from '@/types/ticket-details.types';
import { useAuthStore } from '@/store/auth.store';

interface CreatePricingConfigModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreatePricingConfigModal({
  onClose,
  onSuccess,
}: CreatePricingConfigModalProps) {
  const { user } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    // Modalidade INTERNAL
    internal_hourly_rate: 0,
    internal_minimum_charge: 0,
    internal_threshold: 60,
    internal_per_minute: true,
    // Modalidade REMOTE
    remote_hourly_rate: 0,
    remote_minimum_charge: 0,
    remote_threshold: 60,
    remote_per_minute: true,
    // Modalidade EXTERNAL
    external_hourly_rate: 0,
    external_minimum_charge: 0,
    external_threshold: 60,
    external_per_minute: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.service_desk_id) {
      toast.error('Usuário sem mesa de serviço associada');
      return;
    }

    setIsSubmitting(true);

    try {
      const dto: CreatePricingConfigDto = {
        service_desk_id: user.service_desk_id,
        name: formData.name,
        description: formData.description || undefined,
        active: true,
        modality_configs: [
          {
            modality: ServiceModality.INTERNAL,
            hourly_rate: formData.internal_hourly_rate,
            minimum_charge: formData.internal_minimum_charge,
            minimum_charge_threshold_minutes: formData.internal_threshold,
            charge_excess_per_minute: formData.internal_per_minute,
          },
          {
            modality: ServiceModality.REMOTE,
            hourly_rate: formData.remote_hourly_rate,
            minimum_charge: formData.remote_minimum_charge,
            minimum_charge_threshold_minutes: formData.remote_threshold,
            charge_excess_per_minute: formData.remote_per_minute,
          },
          {
            modality: ServiceModality.EXTERNAL,
            hourly_rate: formData.external_hourly_rate,
            minimum_charge: formData.external_minimum_charge,
            minimum_charge_threshold_minutes: formData.external_threshold,
            charge_excess_per_minute: formData.external_per_minute,
          },
        ],
      };

      await pricingConfigService.create(dto);
      toast.success('Classificação criada com sucesso!');
      onSuccess();
    } catch (error) {
      toast.error('Erro ao criar classificação');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Nova Classificação de Atendimento
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 dark:text-white">
              Informações Básicas
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nome da Classificação *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder='Ex: "Atendimento avulso N1", "Suporte DBA"'
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Descrição (opcional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição da classificação"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Modalidade: Interno */}
          <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <h3 className="font-medium text-gray-900 dark:text-white">
              Modalidade: Interno
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                  Valor/hora (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.internal_hourly_rate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      internal_hourly_rate: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                  Valor mínimo (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.internal_minimum_charge}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      internal_minimum_charge: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                  Tempo mínimo (min) *
                </label>
                <input
                  type="number"
                  required
                  value={formData.internal_threshold}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      internal_threshold: parseInt(e.target.value) || 60,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                  Excedente *
                </label>
                <select
                  value={formData.internal_per_minute ? 'minute' : 'hour'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      internal_per_minute: e.target.value === 'minute',
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="minute">Por Minuto</option>
                  <option value="hour">Por Hora</option>
                </select>
              </div>
            </div>
          </div>

          {/* Modalidade: Remoto */}
          <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <h3 className="font-medium text-gray-900 dark:text-white">Modalidade: Remoto</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                  Valor/hora (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.remote_hourly_rate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      remote_hourly_rate: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                  Valor mínimo (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.remote_minimum_charge}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      remote_minimum_charge: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                  Tempo mínimo (min) *
                </label>
                <input
                  type="number"
                  required
                  value={formData.remote_threshold}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      remote_threshold: parseInt(e.target.value) || 60,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                  Excedente *
                </label>
                <select
                  value={formData.remote_per_minute ? 'minute' : 'hour'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      remote_per_minute: e.target.value === 'minute',
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="minute">Por Minuto</option>
                  <option value="hour">Por Hora</option>
                </select>
              </div>
            </div>
          </div>

          {/* Modalidade: Presencial externo */}
          <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <h3 className="font-medium text-gray-900 dark:text-white">
              Modalidade: Presencial externo
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                  Valor/hora (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.external_hourly_rate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      external_hourly_rate: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                  Valor mínimo (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.external_minimum_charge}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      external_minimum_charge: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                  Tempo mínimo (min) *
                </label>
                <input
                  type="number"
                  required
                  value={formData.external_threshold}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      external_threshold: parseInt(e.target.value) || 60,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                  Excedente *
                </label>
                <select
                  value={formData.external_per_minute ? 'minute' : 'hour'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      external_per_minute: e.target.value === 'minute',
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="minute">Por Minuto</option>
                  <option value="hour">Por Hora</option>
                </select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Criando...' : 'Criar Classificação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
