import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, Plus, Trash2, Edit2, Calendar, DollarSign } from 'lucide-react';
import { appointmentsService } from '@/services/ticket-details.service';
import { AppointmentTimer } from './AppointmentTimer';
import { AppointmentType, ServiceCoverageType, ServiceType, ServiceLevel, CreateAppointmentDto } from '@/types/ticket-details.types';

interface TicketAppointmentsProps {
  ticketId: string;
}

const appointmentTypeLabels: Record<AppointmentType, string> = {
  [AppointmentType.SERVICE]: 'Atendimento',
  [AppointmentType.TRAVEL]: 'Deslocamento',
  [AppointmentType.MEETING]: 'Reunião',
  [AppointmentType.ANALYSIS]: 'Análise',
};

const coverageTypeLabels: Record<ServiceCoverageType, string> = {
  [ServiceCoverageType.CONTRACT]: 'Contrato',
  [ServiceCoverageType.WARRANTY]: 'Garantia',
  [ServiceCoverageType.BILLABLE]: 'Cobrável',
  [ServiceCoverageType.INTERNAL]: 'Interno',
};

const coverageTypeColors: Record<ServiceCoverageType, string> = {
  [ServiceCoverageType.CONTRACT]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  [ServiceCoverageType.WARRANTY]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  [ServiceCoverageType.BILLABLE]: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  [ServiceCoverageType.INTERNAL]: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

const serviceLevelLabels: Record<ServiceLevel, string> = {
  [ServiceLevel.N1]: 'Suporte Standard',
  [ServiceLevel.N2]: 'Suporte Premium',
};

export function TicketAppointments({ ticketId }: TicketAppointmentsProps) {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState<any>({
    ticket_id: ticketId,
    appointment_date: new Date().toISOString().split('T')[0],
    start_time: '08:00',
    end_time: '09:00',
    type: AppointmentType.SERVICE,
    coverage_type: ServiceCoverageType.BILLABLE, // Avulso por padrão
    service_type: ServiceType.REMOTE,
    service_level: ServiceLevel.N1,
    send_as_response: false,
  });

  // Buscar apontamentos
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments', ticketId],
    queryFn: () => appointmentsService.getAppointments(ticketId),
  });

  // Buscar resumo
  const { data: summary } = useQuery({
    queryKey: ['appointments-summary', ticketId],
    queryFn: () => appointmentsService.getAppointmentsSummary(ticketId),
  });

  // Mutation para criar apontamento
  const createMutation = useMutation({
    mutationFn: (data: CreateAppointmentDto) => appointmentsService.createAppointment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['appointments-summary', ticketId] });
      setShowCreateModal(false);
      resetForm();
    },
  });

  // Mutation para deletar apontamento
  const deleteMutation = useMutation({
    mutationFn: (appointmentId: string) => appointmentsService.deleteAppointment(appointmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['appointments-summary', ticketId] });
    },
  });

  const resetForm = () => {
    setFormData({
      ticket_id: ticketId,
      appointment_date: new Date().toISOString().split('T')[0],
      start_time: '08:00',
      end_time: '09:00',
      type: AppointmentType.SERVICE,
      coverage_type: ServiceCoverageType.CONTRACT,
      service_type: ServiceType.REMOTE,
      send_as_response: false,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins.toString().padStart(2, '0')}m`;
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Timer */}
      <AppointmentTimer ticketId={ticketId} />

      {/* Resumo */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total de Horas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {summary.total_hours.toFixed(2)}h
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Custo Total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(summary.total_cost)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header com botão */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Apontamentos ({appointments.length})
        </h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Adicionar Apontamento
        </button>
      </div>

      {/* Lista de apontamentos */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">Carregando...</div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">
          Nenhum apontamento registrado
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((appointment) => (
            <div
              key={appointment.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {new Date(appointment.appointment_date).toLocaleDateString('pt-BR')}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {appointment.start_time} - {appointment.end_time}
                    </span>
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">
                      ({formatDuration(appointment.duration_minutes)})
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {appointmentTypeLabels[appointment.type]}
                    </span>
                    <span className="text-gray-400">•</span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${coverageTypeColors[appointment.coverage_type]}`}
                    >
                      {coverageTypeLabels[appointment.coverage_type]}
                    </span>
                    {appointment.is_timer_based && (
                      <>
                        <span className="text-gray-400">•</span>
                        <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                          Timer Automático
                        </span>
                      </>
                    )}
                  </div>

                  {appointment.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      {appointment.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 mt-3 text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Por: {appointment.user?.name || 'Não informado'}
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-900 dark:text-white font-semibold">
                      {formatCurrency(appointment.total_amount)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Deseja realmente excluir este apontamento?')) {
                        deleteMutation.mutate(appointment.id);
                      }
                    }}
                    className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de criação */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Novo Apontamento Manual
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Data
                    </label>
                    <input
                      type="date"
                      value={formData.appointment_date}
                      onChange={(e) =>
                        setFormData({ ...formData, appointment_date: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Início
                      </label>
                      <input
                        type="time"
                        value={formData.start_time}
                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Fim
                      </label>
                      <input
                        type="time"
                        value={formData.end_time}
                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Tipo de atendimento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tipo de atendimento <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.coverage_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        coverage_type: e.target.value as ServiceCoverageType,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  >
                    <option value={ServiceCoverageType.BILLABLE}>Avulso</option>
                    <option value={ServiceCoverageType.CONTRACT}>Contrato</option>
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Selecione "Contrato" se o cliente possui contrato ativo
                  </p>
                </div>

                {/* Tipo de contrato (dinâmico) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tipo de contrato <span className="text-red-500">*</span>
                  </label>
                  {formData.coverage_type === ServiceCoverageType.CONTRACT ? (
                    <select
                      value={formData.service_level}
                      onChange={(e) =>
                        setFormData({ ...formData, service_level: e.target.value as ServiceLevel })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    >
                      <option value="">Selecione</option>
                      {Object.entries(serviceLevelLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={formData.service_type}
                      onChange={(e) =>
                        setFormData({ ...formData, service_type: e.target.value as ServiceType })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    >
                      <option value="">Selecione</option>
                      <option value={ServiceType.REMOTE}>Atendimento avulso N1</option>
                      <option value={ServiceType.EXTERNAL}>Atendimento avulso N2</option>
                      <option value={ServiceType.INTERNAL}>Demanda interna</option>
                    </select>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formData.coverage_type === ServiceCoverageType.CONTRACT
                      ? 'Contratos disponíveis para este cliente'
                      : 'Tipos de atendimento avulso cadastrados'}
                  </p>
                </div>

                {/* Descrição */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Descrição (opcional)
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                    placeholder="Descreva o trabalho realizado..."
                  />
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {createMutation.isPending ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
