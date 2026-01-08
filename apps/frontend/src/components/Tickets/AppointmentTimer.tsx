import { useState } from 'react';
import { Play, Square, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { appointmentsService } from '@/services/ticket-details.service';
import { AppointmentType, ServiceCoverageType, ServiceType } from '@/types/ticket-details.types';

interface AppointmentTimerProps {
  ticketId: string;
}

const serviceTypeLabels: Record<ServiceType, string> = {
  [ServiceType.INTERNAL]: 'Interno',
  [ServiceType.REMOTE]: 'Remoto',
  [ServiceType.EXTERNAL]: 'Externo/Presencial',
};

const coverageTypeLabels: Record<ServiceCoverageType, string> = {
  [ServiceCoverageType.CONTRACT]: 'Contrato',
  [ServiceCoverageType.WARRANTY]: 'Garantia',
  [ServiceCoverageType.BILLABLE]: 'Avulso',
  [ServiceCoverageType.INTERNAL]: 'Interno',
};

export function AppointmentTimer({ ticketId }: AppointmentTimerProps) {
  const queryClient = useQueryClient();
  const [showStopModal, setShowStopModal] = useState(false);
  const [formData, setFormData] = useState({
    service_type: ServiceType.REMOTE,
    coverage_type: ServiceCoverageType.CONTRACT,
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
        service_type: formData.service_type,
        coverage_type: formData.coverage_type,
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
      service_type: ServiceType.REMOTE,
      coverage_type: ServiceCoverageType.CONTRACT,
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
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
                  Informações do Timer:
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-blue-700 dark:text-blue-400">Data:</span>
                    <span className="ml-2 font-medium text-blue-900 dark:text-blue-200">
                      {new Date(activeTimer.appointment_date).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-700 dark:text-blue-400">Início:</span>
                    <span className="ml-2 font-medium text-blue-900 dark:text-blue-200">
                      {activeTimer.start_time}
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-700 dark:text-blue-400">Fim (agora):</span>
                    <span className="ml-2 font-medium text-blue-900 dark:text-blue-200">
                      {new Date().toTimeString().slice(0, 5)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Classificação (service_type) - OBRIGATÓRIO */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Classificação <span className="text-red-500">*</span>
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
                    Interno, Remoto ou Externo/Presencial
                  </p>
                </div>

                {/* Tipo de atendimento (coverage_type) - OBRIGATÓRIO */}
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
                    {Object.entries(coverageTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Contrato, Avulso, Garantia ou Interno
                  </p>
                </div>
              </div>

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
