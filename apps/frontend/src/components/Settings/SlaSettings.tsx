import { useState, useEffect } from 'react';
import { Clock, Save, AlertCircle, Info } from 'lucide-react';
import { slaService } from '@/services/sla.service';
import {
  SlaConfig,
  UpdateSlaConfigDto,
  SlaPriorityConfig,
  BusinessHoursConfig,
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
  low: '#10B981', // Green
  medium: '#3B82F6', // Blue
  high: '#F59E0B', // Amber
  urgent: '#EF4444', // Red
};

export function SlaSettings() {
  const { user: currentUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<UpdateSlaConfigDto>({
    business_hours: {
      start: '08:00',
      end: '18:00',
      timezone: 'America/Sao_Paulo',
    },
    working_days: [1, 2, 3, 4, 5], // Monday to Friday
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
          working_days: response.sla_config.working_days,
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

    // Validation
    if (!formData.business_hours?.start || !formData.business_hours?.end) {
      toast.error('Horário comercial é obrigatório');
      return;
    }

    if (formData.working_days && formData.working_days.length === 0) {
      toast.error('Selecione pelo menos um dia útil');
      return;
    }

    try {
      setSaving(true);
      await slaService.updateConfig(currentUser.service_desk_id, formData);
      toast.success('Configuração de SLA atualizada com sucesso');
      fetchSlaConfig();
    } catch (error: any) {
      console.error('Erro ao atualizar SLA:', error);
      toast.error(error.response?.data?.message || 'Erro ao atualizar configuração de SLA');
    } finally {
      setSaving(false);
    }
  };

  const toggleWorkingDay = (day: number) => {
    setFormData((prev) => ({
      ...prev,
      working_days: prev.working_days?.includes(day)
        ? prev.working_days.filter((d) => d !== day)
        : [...(prev.working_days || []), day].sort(),
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Clock className="w-6 h-6" />
          Configuração de SLA
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Defina prazos de primeira resposta e resolução por prioridade
        </p>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
              Como funciona o SLA
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              O SLA (Service Level Agreement) define os tempos máximos de primeira resposta e
              resolução para tickets. Você pode configurar horário comercial para que o prazo
              seja contado apenas durante o expediente.
            </p>
          </div>
        </div>
      </div>

      {/* Horário Comercial */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Horário Comercial
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Define o horário de funcionamento para cálculo do SLA. Apenas horas úteis serão consideradas.
        </p>

        <div className="space-y-4">
                  {/* Horários */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Início do Expediente
                      </label>
                      <input
                        type="time"
                        value={formData.business_hours?.start}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            business_hours: {
                              ...formData.business_hours!,
                              start: e.target.value,
                            },
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Fim do Expediente
                      </label>
                      <input
                        type="time"
                        value={formData.business_hours?.end}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            business_hours: {
                              ...formData.business_hours!,
                              end: e.target.value,
                            },
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>

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
          </div>

          {/* Dias Úteis */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Dias Úteis
            </label>
            <div className="flex gap-2 flex-wrap">
              {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleWorkingDay(day)}
                  className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                    formData.working_days?.includes(day)
                      ? 'bg-blue-500 border-blue-600 text-white'
                      : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-400'
                  }`}
                >
                  {WEEKDAY_LABELS[day]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Configuração por Prioridade */}
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
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ({priority})
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Primeira Resposta */}
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

                    {/* Resolução */}
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

      {/* Alert - Calculado Automaticamente */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                  Cálculo Automático
                </h3>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Os prazos de SLA são calculados automaticamente quando um ticket é criado.
                  O sistema monitora continuamente e envia alertas quando os prazos estão próximos
                  ou foram violados.
            </p>
          </div>
        </div>
      </div>

      {/* Footer - Botão Salvar */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="submit"
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={saving}
        >
          <Save className="w-5 h-5" />
          {saving ? 'Salvando...' : 'Salvar Configuração'}
        </button>
      </div>
    </form>
  );
}
