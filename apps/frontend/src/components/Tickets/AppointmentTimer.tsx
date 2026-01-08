import { useState } from 'react';
import { Play, Square, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { appointmentsService } from '@/services/ticket-details.service';
import {
  AppointmentType,
  ServiceCoverageType,
  ServiceType,
  ServiceLevel,
} from '@/types/ticket-details.types';

interface AppointmentTimerProps {
  ticketId: string;
}

// Labels dos campos
const serviceTypeLabels: Record<ServiceType, string> = {
  [ServiceType.INTERNAL]: 'Interno',
  [ServiceType.REMOTE]: 'Remoto',
  [ServiceType.EXTERNAL]: 'Externo/Presencial',
};

const coverageTypeLabels: Record<ServiceCoverageType, string> = {
  [ServiceCoverageType.CONTRACT]: 'Contrato',
  [ServiceCoverageType.BILLABLE]: 'Avulso',
  [ServiceCoverageType.WARRANTY]: 'Garantia',
  [ServiceCoverageType.INTERNAL]: 'Interno',
};

const serviceLevelLabels: Record<ServiceLevel, string> = {
  [ServiceLevel.N1]: 'Nível 1 (N1)',
  [ServiceLevel.N2]: 'Nível 2 (N2)',
};

export function AppointmentTimer({ ticketId }: AppointmentTimerProps) {
  const queryClient = useQueryClient();
  const [showStopModal, setShowStopModal] = useState(false);
  const [formData, setFormData] = useState({
    coverage_type: ServiceCoverageType.BILLABLE, // Avulso por padrão
    service_level: ServiceLevel.N1, // N1 por padrão
    service_type: ServiceType.REMOTE, // Remoto por padrão
    is_warranty: false,
    manual_price_override: false,
    manual_unit_price: 0,
    description: '',
    send_as_response: false,
  });

  // Buscar timer ativo
  const { data: activeTimer } = useQuery({
    queryKey: ['active-timer'],
    queryFn: () => appointmentsService.getActiveTimer(),
    refetchInterval: 5000, // Atualizar a cada 5 segundos
  });

  // Mutation para iniciar timer
  const startTimerMutation = useMutation({
    mutationFn: () =>
      appointmentsService.startTimer({
        ticket_id: ticketId,
        type: AppointmentType.SERVICE,
        coverage_type: ServiceCoverageType.CONTRACT,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-timer'] });
      queryClient.invalidateQueries({ queryKey: ['appointments', ticketId] });
    },
  });

  // Mutation para parar timer
  const stopTimerMutation = useMutation({
    mutationFn: () =>
      appointmentsService.stopTimer({
        appointment_id: activeTimer!.id,
        coverage_type: formData.coverage_type,
        service_level: formData.service_level,
        service_type: formData.service_type,
        is_warranty: formData.is_warranty,
        manual_price_override: formData.manual_price_override,
        manual_unit_price: formData.manual_price_override ? formData.manual_unit_price : undefined,
        description: formData.description || undefined,
        send_as_response: formData.send_as_response,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-timer'] });
      queryClient.invalidateQueries({ queryKey: ['appointments', ticketId] });
      setShowStopModal(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setFormData({
      coverage_type: ServiceCoverageType.BILLABLE,
      service_level: ServiceLevel.N1,
      service_type: ServiceType.REMOTE,
      is_warranty: false,
      manual_price_override: false,
      manual_unit_price: 0,
      description: '',
      send_as_response: false,
    });
  };

  const handleStopClick = () => {
    setShowStopModal(true);
  };

  const handleConfirmStop = () => {
    stopTimerMutation.mutate();
  };

  const isTimerActive =
    activeTimer &&
    activeTimer.timer_started_at &&
    !activeTimer.timer_stopped_at &&
    activeTimer.ticket_id === ticketId;

  const isAnotherTicketTimer =
    activeTimer &&
    activeTimer.timer_started_at &&
    !activeTimer.timer_stopped_at &&
    activeTimer.ticket_id !== ticketId;

  return (
    <>
      <div className="flex items-center gap-3">
        {!isTimerActive && !isAnotherTicketTimer && (
          <button
            onClick={() => startTimerMutation.mutate()}
            disabled={startTimerMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
          >
            <Play className="w-4 h-4" />
            Apontamento
          </button>
        )}

        {isTimerActive && (
          <button
            onClick={handleStopClick}
            disabled={stopTimerMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium relative"
          >
            <Square className="w-4 h-4" />
            Parar Timer
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          </button>
        )}

        {isAnotherTicketTimer && activeTimer && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-orange-600 dark:text-orange-400">
              Timer ativo em outro ticket
            </span>
            <a
              href={`/tickets/${activeTimer.ticket_id}`}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Ir para o ticket
            </a>
          </div>
        )}
      </div>

      {/* Modal ao parar timer */}
      {showStopModal && activeTimer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Finalizar Apontamento
              </h3>
              <button
                onClick={() => {
                  setShowStopModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleConfirmStop();
              }}
              className="p-6 space-y-4"
            >
              {/* Informações do timer (readonly) */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-3">
                  Informações do Apontamento:
                </h4>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700 dark:text-blue-400">📅 Data:</span>
                    <span className="font-medium text-blue-900 dark:text-blue-200">
                      {new Date(activeTimer.appointment_date).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700 dark:text-blue-400">⏰ Início:</span>
                    <span className="font-medium text-blue-900 dark:text-blue-200">
                      {activeTimer.start_time}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700 dark:text-blue-400">⏱️ Fim (agora):</span>
                    <span className="font-medium text-blue-900 dark:text-blue-200">
                      {new Date().toTimeString().slice(0, 5)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-blue-200 dark:border-blue-700 pt-2 mt-1">
                    <span className="text-blue-700 dark:text-blue-400 font-medium">⏳ Duração:</span>
                    <span className="font-semibold text-blue-900 dark:text-blue-200">
                      {(() => {
                        if (!activeTimer.timer_started_at) return '0h 00m';
                        const start = new Date(activeTimer.timer_started_at);
                        const now = new Date();
                        const diffMinutes = Math.round((now.getTime() - start.getTime()) / (1000 * 60));
                        const hours = Math.floor(diffMinutes / 60);
                        const minutes = diffMinutes % 60;
                        return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
                      })()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Grid com 3 campos principais */}
              <div className="space-y-4">
                {/* 1. Tipo de atendimento: Avulso ou Contrato */}
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

                {/* 2. Contrato (aparece apenas se tipo = Contrato) */}
                {formData.coverage_type === ServiceCoverageType.CONTRACT && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Contrato <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.service_level}
                      onChange={(e) =>
                        setFormData({ ...formData, service_level: e.target.value as ServiceLevel })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    >
                      {Object.entries(serviceLevelLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Selecione o contrato cadastrado para este cliente
                    </p>
                  </div>
                )}

                {/* 3. Modalidade: Remoto, Externo ou Interno */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Modalidade <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.service_type}
                    onChange={(e) =>
                      setFormData({ ...formData, service_type: e.target.value as ServiceType })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  >
                    {Object.entries(serviceTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Como foi realizado o atendimento
                  </p>
                </div>
              </div>

              {/* Checkboxes: Garantia e Editar Valor Manualmente */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="is_warranty"
                    checked={formData.is_warranty}
                    onChange={(e) => {
                      const isWarranty = e.target.checked;
                      setFormData({
                        ...formData,
                        is_warranty: isWarranty,
                        manual_price_override: false, // Desativa override manual se marcar garantia
                      });
                    }}
                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label
                    htmlFor="is_warranty"
                    className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                  >
                    Garantia
                    <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Marca como garantia (valor = R$ 0,00)
                    </span>
                  </label>
                </div>

                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="manual_price_override"
                    checked={formData.manual_price_override}
                    disabled={formData.is_warranty}
                    onChange={(e) =>
                      setFormData({ ...formData, manual_price_override: e.target.checked })
                    }
                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                  />
                  <label
                    htmlFor="manual_price_override"
                    className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                  >
                    Editar valor manualmente
                    <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Permite informar preço por hora personalizado
                    </span>
                  </label>
                </div>
              </div>

              {/* Campo de valor manual (aparece apenas se checkbox marcado) */}
              {formData.manual_price_override && !formData.is_warranty && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Valor por hora (R$) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.manual_unit_price}
                    onChange={(e) =>
                      setFormData({ ...formData, manual_unit_price: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Ex: 150.00"
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Este valor será multiplicado pela duração do atendimento
                  </p>
                </div>
              )}

              {/* Descrição */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Descrição do trabalho
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Descreva o que foi realizado..."
                />
              </div>

              {/* Checkbox enviar como resposta */}
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="send_as_response"
                  checked={formData.send_as_response}
                  onChange={(e) =>
                    setFormData({ ...formData, send_as_response: e.target.checked })
                  }
                  className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label
                  htmlFor="send_as_response"
                  className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  Enviar como resposta ao cliente
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Cria um comentário público visível para o cliente com os detalhes do
                    apontamento
                  </span>
                </label>
              </div>

              {/* Botões */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowStopModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={stopTimerMutation.isPending}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
                >
                  {stopTimerMutation.isPending ? 'Salvando...' : 'Salvar Apontamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
