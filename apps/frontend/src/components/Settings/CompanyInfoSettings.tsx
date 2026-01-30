import { useState, useEffect } from 'react';
import { Building, Save, AlertCircle, Clock, Plus, X } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'react-hot-toast';
import { api } from '@/services/api';
import { slaService } from '@/services/sla.service';
import { BusinessHoursSchedule, WEEKDAY_LABELS } from '@/types/sla.types';

interface CompanyInfo {
  company_trade_name?: string;
  company_cnpj?: string;
  company_legal_name?: string;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
  company_website?: string;
}

interface BusinessHoursConfig {
  timezone: string;
  schedules: BusinessHoursSchedule[];
}

export function CompanyInfoSettings() {
  const { user: currentUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<CompanyInfo>({
    company_trade_name: '',
    company_cnpj: '',
    company_legal_name: '',
    company_address: '',
    company_phone: '',
    company_email: '',
    company_website: '',
  });

  const [businessHours, setBusinessHours] = useState<BusinessHoursConfig>({
    timezone: 'America/Sao_Paulo',
    schedules: [],
  });

  const [slaPriorities, setSlaPriorities] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!currentUser?.service_desk_id) {
      toast.error('Mesa de serviço não identificada');
      return;
    }

    try {
      setLoading(true);

      // Buscar info da empresa
      try {
        const response = await api.get(`/v1/service-desks/${currentUser.service_desk_id}/company-info`);
        if (response.data?.data) {
          setFormData(response.data.data);
        }
      } catch (error: any) {
        if (error.response?.status !== 404) {
          console.error('Erro ao buscar informações da empresa:', error);
        }
      }

      // Buscar config SLA (para horário comercial)
      try {
        const slaResponse = await slaService.getConfig(currentUser.service_desk_id);
        if (slaResponse.sla_config?.business_hours) {
          setBusinessHours(slaResponse.sla_config.business_hours);
        }
        if (slaResponse.sla_config?.priorities) {
          setSlaPriorities(slaResponse.sla_config.priorities);
        }
      } catch (error: any) {
        if (error.response?.status !== 404) {
          console.error('Erro ao buscar config SLA:', error);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const validateCNPJ = (cnpj: string): boolean => {
    const pattern = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;
    return pattern.test(cnpj);
  };

  const formatCNPJ = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
    if (numbers.length <= 8) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
    if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
  };

  const handleCNPJChange = (value: string) => {
    const formatted = formatCNPJ(value);
    setFormData((prev) => ({ ...prev, company_cnpj: formatted }));
  };

  // Funções de Horário Comercial
  const hasDaySchedule = (day: number) => {
    return businessHours.schedules.some((s) => s.day_of_week === day);
  };

  const addDay = (dayOfWeek: number) => {
    if (hasDaySchedule(dayOfWeek)) return;
    setBusinessHours((prev) => ({
      ...prev,
      schedules: [
        ...prev.schedules,
        { day_of_week: dayOfWeek, periods: [{ start: '08:00', end: '18:00' }] },
      ].sort((a, b) => a.day_of_week - b.day_of_week),
    }));
  };

  const removeDay = (dayOfWeek: number) => {
    setBusinessHours((prev) => ({
      ...prev,
      schedules: prev.schedules.filter((s) => s.day_of_week !== dayOfWeek),
    }));
  };

  const addPeriod = (dayOfWeek: number) => {
    setBusinessHours((prev) => ({
      ...prev,
      schedules: prev.schedules.map((schedule) =>
        schedule.day_of_week === dayOfWeek
          ? { ...schedule, periods: [...schedule.periods, { start: '14:00', end: '18:00' }] }
          : schedule
      ),
    }));
  };

  const removePeriod = (dayOfWeek: number, periodIndex: number) => {
    setBusinessHours((prev) => ({
      ...prev,
      schedules: prev.schedules.map((schedule) =>
        schedule.day_of_week === dayOfWeek
          ? { ...schedule, periods: schedule.periods.filter((_, idx) => idx !== periodIndex) }
          : schedule
      ),
    }));
  };

  const updatePeriod = (dayOfWeek: number, periodIndex: number, field: 'start' | 'end', value: string) => {
    setBusinessHours((prev) => ({
      ...prev,
      schedules: prev.schedules.map((schedule) =>
        schedule.day_of_week === dayOfWeek
          ? {
              ...schedule,
              periods: schedule.periods.map((period, idx) =>
                idx === periodIndex ? { ...period, [field]: value } : period
              ),
            }
          : schedule
      ),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser?.service_desk_id) {
      toast.error('Mesa de serviço não identificada');
      return;
    }

    if (formData.company_cnpj && !validateCNPJ(formData.company_cnpj)) {
      toast.error('CNPJ inválido. Use o formato XX.XXX.XXX/XXXX-XX');
      return;
    }

    // Validar horário comercial
    if (businessHours.schedules.length === 0) {
      toast.error('Configure pelo menos um dia de expediente');
      return;
    }

    for (const schedule of businessHours.schedules) {
      if (!schedule.periods || schedule.periods.length === 0) {
        toast.error(`Configure pelo menos um período para ${WEEKDAY_LABELS[schedule.day_of_week]}`);
        return;
      }
      for (const period of schedule.periods) {
        if (period.start >= period.end) {
          toast.error('Horário inválido: início deve ser antes do fim');
          return;
        }
      }
    }

    try {
      setSaving(true);

      // Salvar info da empresa
      await api.patch(`/v1/service-desks/${currentUser.service_desk_id}/company-info`, formData);

      // Salvar horário comercial (junto com SLA priorities existentes)
      const slaConfigToSave = {
        priorities: slaPriorities || {
          low: { first_response: 480, resolution: 2880 },
          medium: { first_response: 240, resolution: 1440 },
          high: { first_response: 120, resolution: 480 },
          urgent: { first_response: 60, resolution: 240 },
        },
        business_hours: businessHours,
      };
      await slaService.updateConfig(currentUser.service_desk_id, slaConfigToSave);

      toast.success('Configurações salvas com sucesso');
      fetchData();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast.error(error.response?.data?.message || 'Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Informações da Empresa */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Building className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Informações da Empresa
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Configure os dados da sua empresa para uso em relatórios e documentos
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Nome Fantasia e CNPJ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nome Fantasia
              </label>
              <input
                type="text"
                value={formData.company_trade_name || ''}
                onChange={(e) => setFormData({ ...formData, company_trade_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Nome comercial da empresa"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                CNPJ
              </label>
              <input
                type="text"
                value={formData.company_cnpj || ''}
                onChange={(e) => handleCNPJChange(e.target.value)}
                maxLength={18}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="00.000.000/0000-00"
              />
            </div>
          </div>

          {/* Razão Social */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Razão Social
            </label>
            <input
              type="text"
              value={formData.company_legal_name || ''}
              onChange={(e) => setFormData({ ...formData, company_legal_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Razão social completa"
            />
          </div>

          {/* Endereço */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Endereço
            </label>
            <textarea
              value={formData.company_address || ''}
              onChange={(e) => setFormData({ ...formData, company_address: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
              placeholder="Endereço completo da empresa"
            />
          </div>

          {/* Telefone e Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Telefone
              </label>
              <input
                type="tel"
                value={formData.company_phone || ''}
                onChange={(e) => setFormData({ ...formData, company_phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="(00) 0000-0000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.company_email || ''}
                onChange={(e) => setFormData({ ...formData, company_email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="contato@empresa.com"
              />
            </div>
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Website <span className="text-gray-500 text-xs">(opcional)</span>
            </label>
            <input
              type="url"
              value={formData.company_website || ''}
              onChange={(e) => setFormData({ ...formData, company_website: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="https://www.empresa.com"
            />
          </div>
        </div>
      </div>

      {/* Horário Comercial */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Horário Comercial
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Configure o expediente para cálculo de SLA
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Timezone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Fuso Horário
            </label>
            <select
              value={businessHours.timezone}
              onChange={(e) => setBusinessHours({ ...businessHours, timezone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="America/Sao_Paulo">Brasília (GMT-3)</option>
              <option value="America/Manaus">Manaus (GMT-4)</option>
              <option value="America/Rio_Branco">Acre (GMT-5)</option>
            </select>
          </div>

          {/* Dias de expediente */}
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
                  className={`px-3 py-2 rounded-lg border-2 text-sm transition-colors ${
                    hasDaySchedule(day)
                      ? 'bg-blue-500 border-blue-600 text-white'
                      : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-400'
                  }`}
                >
                  {WEEKDAY_LABELS[day].slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          {/* Períodos por dia */}
          <div className="space-y-3">
            {businessHours.schedules
              .sort((a, b) => a.day_of_week - b.day_of_week)
              .map((schedule) => (
                <div
                  key={schedule.day_of_week}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm">
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
                          onChange={(e) => updatePeriod(schedule.day_of_week, idx, 'start', e.target.value)}
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                        <span className="text-gray-500 text-sm">até</span>
                        <input
                          type="time"
                          value={period.end}
                          onChange={(e) => updatePeriod(schedule.day_of_week, idx, 'end', e.target.value)}
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                        {schedule.periods.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePeriod(schedule.day_of_week, idx)}
                            className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => addPeriod(schedule.day_of_week)}
                      className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <Plus className="w-3 h-3" />
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
                  <li>Exemplo: 08:00-12:00 + 14:00-18:00</li>
                  <li>O cálculo de SLA considera apenas o tempo dentro destes períodos</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Salvar Alterações
            </>
          )}
        </button>
      </div>
    </div>
  );
}
