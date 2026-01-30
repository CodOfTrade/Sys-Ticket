import { useState, useEffect } from 'react';
import { Clock, Save, Plus, X, AlertCircle } from 'lucide-react';
import { slaService } from '@/services/sla.service';
import {
  UpdateSlaConfigDto,
  SlaPriorityConfig,
  BusinessHoursSchedule,
  BusinessHoursPeriod,
  WEEKDAY_LABELS,
} from '@/types/sla.types';
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'react-hot-toast';

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Baixa',
  medium: 'Normal',
  high: 'Alta',
  urgent: 'Urgente',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: '#10B981',
  medium: '#3B82F6',
  high: '#F59E0B',
  urgent: '#EF4444',
};

export function BusinessHoursSettings() {
  const { user: currentUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<UpdateSlaConfigDto>({
    business_hours: {
      timezone: 'America/Sao_Paulo',
      schedules: [],
    },
    priorities: {
      low: { first_response: 480, resolution: 2880 },
      medium: { first_response: 240, resolution: 1440 },
      high: { first_response: 120, resolution: 480 },
      urgent: { first_response: 60, resolution: 240 },
    },
  });

  useEffect(() => {
    fetchSlaConfig();
  }, []);

  const fetchSlaConfig = async () => {
    if (!currentUser?.service_desk_id) {
      toast.error('Mesa de serviço não identificada');
      return;
    }

    try {
      setLoading(true);
      const response = await slaService.getConfig(currentUser.service_desk_id);

      if (response.sla_config) {
        setFormData({
          business_hours: response.sla_config.business_hours,
          priorities: response.sla_config.priorities,
        });
      }
    } catch (error: any) {
      console.error('Erro ao buscar configuração de SLA:', error);
      toast.error('Erro ao carregar configuração de SLA');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser?.service_desk_id) {
      toast.error('Mesa de serviço não identificada');
      return;
    }

    // Validação
    if (!formData.business_hours?.schedules || formData.business_hours.schedules.length === 0) {
      toast.error('Configure pelo menos um dia de expediente');
      return;
    }

    // Validar períodos
    for (const schedule of formData.business_hours.schedules) {
      if (!schedule.periods || schedule.periods.length === 0) {
        toast.error(`Configure pelo menos um período para ${WEEKDAY_LABELS[schedule.day_of_week]}`);
        return;
      }

      for (const period of schedule.periods) {
        if (period.start >= period.end) {
          toast.error(`Horário inválido: início deve ser antes do fim`);
          return;
        }
      }
    }

    try {
      setSaving(true);
      await slaService.updateConfig(currentUser.service_desk_id, formData);
      toast.success('Configuração de horário comercial atualizada com sucesso');
      fetchSlaConfig();
    } catch (error: any) {
      console.error('Erro ao atualizar configuração:', error);
      toast.error(error.response?.data?.message || 'Erro ao atualizar configuração');
    } finally {
      setSaving(false);
    }
  };

  const addDay = (dayOfWeek: number) => {
    const exists = formData.business_hours?.schedules?.find((s) => s.day_of_week === dayOfWeek);
    if (exists) return;

    setFormData((prev) => ({
      ...prev,
      business_hours: {
        ...prev.business_hours!,
        schedules: [
          ...(prev.business_hours?.schedules || []),
          {
            day_of_week: dayOfWeek,
            periods: [{ start: '08:00', end: '18:00' }],
          },
        ].sort((a, b) => a.day_of_week - b.day_of_week),
      },
    }));
  };

  const removeDay = (dayOfWeek: number) => {
    setFormData((prev) => ({
      ...prev,
      business_hours: {
        ...prev.business_hours!,
        schedules: prev.business_hours?.schedules?.filter((s) => s.day_of_week !== dayOfWeek) || [],
      },
    }));
  };

  const addPeriod = (dayOfWeek: number) => {
    setFormData((prev) => ({
      ...prev,
      business_hours: {
        ...prev.business_hours!,
        schedules: prev.business_hours?.schedules?.map((schedule) =>
          schedule.day_of_week === dayOfWeek
            ? {
                ...schedule,
                periods: [...schedule.periods, { start: '14:00', end: '18:00' }],
              }
            : schedule
        ) || [],
      },
    }));
  };

  const removePeriod = (dayOfWeek: number, periodIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      business_hours: {
        ...prev.business_hours!,
        schedules: prev.business_hours?.schedules?.map((schedule) =>
          schedule.day_of_week === dayOfWeek
            ? {
                ...schedule,
                periods: schedule.periods.filter((_, idx) => idx !== periodIndex),
              }
            : schedule
        ) || [],
      },
    }));
  };

  const updatePeriod = (
    dayOfWeek: number,
    periodIndex: number,
    field: 'start' | 'end',
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      business_hours: {
        ...prev.business_hours!,
        schedules: prev.business_hours?.schedules?.map((schedule) =>
          schedule.day_of_week === dayOfWeek
            ? {
                ...schedule,
                periods: schedule.periods.map((period, idx) =>
                  idx === periodIndex ? { ...period, [field]: value } : period
                ),
              }
            : schedule
        ) || [],
      },
    }));
  };

  const updatePriorityConfig = (
    priority: keyof typeof formData.priorities,
    field: keyof SlaPriorityConfig,
    value: number
  ) => {
    setFormData((prev) => ({
      ...prev,
      priorities: {
        ...prev.priorities,
        [priority]: {
          ...prev.priorities[priority],
          [field]: value,
        },
      },
    }));
  };

  const formatMinutesToHours = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${mins}min`;
  };

  const hasDaySchedule = (day: number) => {
    return formData.business_hours?.schedules?.some((s) => s.day_of_week === day);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl">
      {/* Horário Comercial */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Horário Comercial
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configure múltiplos períodos de expediente por dia
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Timezone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Fuso Horário
            </label>
            <select
              value={formData.business_hours?.timezone}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  business_hours: {
                    ...formData.business_hours!,
                    timezone: e.target.value,
                  },
                })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="America/Sao_Paulo">Brasília (GMT-3)</option>
              <option value="America/Manaus">Manaus (GMT-4)</option>
              <option value="America/Rio_Branco">Acre (GMT-5)</option>
            </select>
          </div>

          {/* Botões para adicionar dias */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Dias de Expediente
            </label>
            <div className="flex gap-2 flex-wrap">
              {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => (hasDaySchedule(day) ? removeDay(day) : addDay(day))}
                  className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                    hasDaySchedule(day)
                      ? 'bg-blue-500 border-blue-600 text-white'
                      : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-400'
                  }`}
                >
                  {WEEKDAY_LABELS[day]}
                </button>
              ))}
            </div>
          </div>

          {/* Períodos por dia */}
          <div className="space-y-4">
            {formData.business_hours?.schedules
              ?.sort((a, b) => a.day_of_week - b.day_of_week)
              .map((schedule) => (
                <div
                  key={schedule.day_of_week}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {WEEKDAY_LABELS[schedule.day_of_week]}
                    </h4>
                    <button
                      type="button"
                      onClick={() => removeDay(schedule.day_of_week)}
                      className="text-red-600 hover:text-red-700 dark:text-red-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {schedule.periods.map((period, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="time"
                          value={period.start}
                          onChange={(e) =>
                            updatePeriod(schedule.day_of_week, idx, 'start', e.target.value)
                          }
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                        <span className="text-gray-500">até</span>
                        <input
                          type="time"
                          value={period.end}
                          onChange={(e) =>
                            updatePeriod(schedule.day_of_week, idx, 'end', e.target.value)
                          }
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                        {schedule.periods.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePeriod(schedule.day_of_week, idx)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => addPeriod(schedule.day_of_week)}
                      className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar período
                    </button>
                  </div>
                </div>
              ))}
          </div>

          {/* Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="font-medium mb-1">Horários Flexíveis</p>
                <ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-400">
                  <li>Configure múltiplos períodos para dias com intervalo de almoço</li>
                  <li>Exemplo: Segunda a Sexta - 08:00-12:00 + 14:00-18:00</li>
                  <li>O cálculo de SLA considera apenas o tempo dentro destes períodos</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Configuração de Prioridades SLA */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Prazos por Prioridade
        </h3>
        <div className="space-y-6">
          {Object.entries(formData.priorities).map(([priority, config]) => (
            <div
              key={priority}
              className="border-l-4 pl-4 py-2"
              style={{ borderColor: PRIORITY_COLORS[priority] }}
            >
              <div className="flex items-center gap-2 mb-3">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {PRIORITY_LABELS[priority]}
                </h4>
                <span className="text-xs text-gray-500 dark:text-gray-400">({priority})</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Primeira Resposta
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      value={config.first_response}
                      onChange={(e) =>
                        updatePriorityConfig(
                          priority as keyof typeof formData.priorities,
                          'first_response',
                          parseInt(e.target.value) || 0
                        )
                      }
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Minutos"
                    />
                    <div className="flex items-center px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {formatMinutesToHours(config.first_response)}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Resolução
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      value={config.resolution}
                      onChange={(e) =>
                        updatePriorityConfig(
                          priority as keyof typeof formData.priorities,
                          'resolution',
                          parseInt(e.target.value) || 0
                        )
                      }
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Minutos"
                    />
                    <div className="flex items-center px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {formatMinutesToHours(config.resolution)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="submit"
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          disabled={saving}
        >
          <Save className="w-5 h-5" />
          {saving ? 'Salvando...' : 'Salvar Configuração'}
        </button>
      </div>
    </form>
  );
}
