import { useState } from 'react';
import { Edit2, X, Check } from 'lucide-react';
import {
  PricingConfig,
  PricingModalityConfig,
  ServiceModality,
  getModalityConfig,
} from '@/types/ticket-details.types';

interface ModalityConfigSectionProps {
  title: string;
  modality: ServiceModality;
  pricingConfig: PricingConfig;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (data: Partial<PricingModalityConfig>) => void;
  onCancel: () => void;
}

export function ModalityConfigSection({
  title,
  modality,
  pricingConfig,
  isEditing,
  onEdit,
  onSave,
  onCancel,
}: ModalityConfigSectionProps) {
  const modalityConfig = getModalityConfig(pricingConfig, modality);

  const [formData, setFormData] = useState<Partial<PricingModalityConfig>>(
    modalityConfig || {},
  );

  if (!modalityConfig) {
    return null;
  }

  const handleSave = () => {
    onSave(formData);
  };

  const calculateExample = (minutes: number): string => {
    const threshold = Number(formData.minimum_charge_threshold_minutes || modalityConfig.minimum_charge_threshold_minutes);
    const minimum = Number(formData.minimum_charge || modalityConfig.minimum_charge);
    const hourlyRate = Number(formData.hourly_rate || modalityConfig.hourly_rate);
    const perMinute = formData.charge_excess_per_minute !== undefined
      ? formData.charge_excess_per_minute
      : modalityConfig.charge_excess_per_minute;

    if (minutes <= threshold) {
      return minimum.toFixed(2);
    }

    const excess = minutes - threshold;
    if (perMinute) {
      const excessCost = (excess / 60) * hourlyRate;
      return (minimum + excessCost).toFixed(2);
    } else {
      const excessHours = Math.ceil(excess / 60);
      return (minimum + excessHours * hourlyRate).toFixed(2);
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-medium text-gray-900 dark:text-white">{title}</h4>
        {!isEditing && (
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <Edit2 className="w-4 h-4" />
            Editar
          </button>
        )}
      </div>

      {/* Formulário */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Valor por Hora */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Valor por Hora (R$)
          </label>
          {isEditing ? (
            <input
              type="number"
              step="0.01"
              value={formData.hourly_rate || ''}
              onChange={(e) =>
                setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <div className="font-semibold text-gray-900 dark:text-white">
              R$ {Number(modalityConfig.hourly_rate).toFixed(2)}
            </div>
          )}
        </div>

        {/* Valor Mínimo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Valor Mínimo (R$)
          </label>
          {isEditing ? (
            <input
              type="number"
              step="0.01"
              value={formData.minimum_charge || ''}
              onChange={(e) =>
                setFormData({ ...formData, minimum_charge: parseFloat(e.target.value) })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <div className="font-semibold text-gray-900 dark:text-white">
              R$ {Number(modalityConfig.minimum_charge).toFixed(2)}
            </div>
          )}
        </div>

        {/* Tempo Mínimo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tempo Mínimo (minutos)
          </label>
          {isEditing ? (
            <input
              type="number"
              value={formData.minimum_charge_threshold_minutes || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  minimum_charge_threshold_minutes: parseInt(e.target.value),
                })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <div className="font-semibold text-gray-900 dark:text-white">
              {modalityConfig.minimum_charge_threshold_minutes} min
            </div>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Atendimentos menores cobrarão o valor mínimo
          </p>
        </div>

        {/* Cobrança do Excedente */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Cobrança do Excedente
          </label>
          {isEditing ? (
            <select
              value={
                formData.charge_excess_per_minute !== undefined
                  ? formData.charge_excess_per_minute
                    ? 'minute'
                    : 'hour'
                  : modalityConfig.charge_excess_per_minute
                  ? 'minute'
                  : 'hour'
              }
              onChange={(e) =>
                setFormData({
                  ...formData,
                  charge_excess_per_minute: e.target.value === 'minute',
                })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="minute">Por Minuto</option>
              <option value="hour">Por Hora</option>
            </select>
          ) : (
            <div className="font-semibold text-gray-900 dark:text-white">
              {modalityConfig.charge_excess_per_minute ? 'Por Minuto' : 'Por Hora'}
            </div>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Como cobrar o tempo após o mínimo
          </p>
        </div>
      </div>

      {/* Exemplo de Cálculo */}
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h5 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
          Exemplos de Cálculo:
        </h5>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>
            • 30 min → R${' '}
            {Number(formData.minimum_charge || modalityConfig.minimum_charge).toFixed(2)} (valor
            mínimo)
          </li>
          <li>
            •{' '}
            {formData.minimum_charge_threshold_minutes ||
              modalityConfig.minimum_charge_threshold_minutes}{' '}
            min → R${' '}
            {Number(formData.minimum_charge || modalityConfig.minimum_charge).toFixed(2)} (valor
            mínimo)
          </li>
          <li>
            •{' '}
            {(formData.minimum_charge_threshold_minutes ||
              modalityConfig.minimum_charge_threshold_minutes) +
              15}{' '}
            min → R$ {calculateExample((formData.minimum_charge_threshold_minutes ||
              modalityConfig.minimum_charge_threshold_minutes) + 15)}
          </li>
          <li>
            •{' '}
            {(formData.minimum_charge_threshold_minutes ||
              modalityConfig.minimum_charge_threshold_minutes) +
              60}{' '}
            min → R$ {calculateExample((formData.minimum_charge_threshold_minutes ||
              modalityConfig.minimum_charge_threshold_minutes) + 60)}
          </li>
        </ul>
      </div>

      {/* Botões de Ação */}
      {isEditing && (
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Check className="w-4 h-4" />
            Salvar
          </button>
          <button
            onClick={onCancel}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
