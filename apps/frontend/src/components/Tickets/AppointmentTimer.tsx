import { useState } from 'react';
import { Play, Square, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { appointmentsService } from '@/services/ticket-details.service';
import { clientService } from '@/services/client.service';
import {
  AppointmentType,
  ServiceCoverageType,
  ServiceType,
  ServiceLevel,
} from '@/types/ticket-details.types';

interface AppointmentTimerProps {
  ticketId: string;
  clientId: string;
}

export function AppointmentTimer({ ticketId, clientId }: AppointmentTimerProps) {
  const queryClient = useQueryClient();
  const [showStopModal, setShowStopModal] = useState(false);
  const [formData, setFormData] = useState({
    coverage_type: ServiceCoverageType.BILLABLE, // Avulso por padrão
    service_level: ServiceLevel.N1, // N1 por padrão (para contratos)
    service_type: ServiceType.REMOTE, // Remoto por padrão (para avulso)
    modality: ServiceType.REMOTE, // NOVO: Modalidade separada
    contract_id: '', // NOVO: ID do contrato selecionado
    is_warranty: false,
    manual_price_override: false,
    manual_unit_price: 0,
    description: '',
  });

  // Buscar timer ativo
  const { data: activeTimer } = useQuery({
    queryKey: ['active-timer'],
    queryFn: () => appointmentsService.getActiveTimer(),
    refetchInterval: 5000, // Atualizar a cada 5 segundos
  });

  // Buscar contratos do cliente
  const { data: clientContracts = [] } = useQuery({
    queryKey: ['client-contracts', clientId],
    queryFn: () => clientService.getClientContracts(clientId),
    enabled: !!clientId && formData.coverage_type === ServiceCoverageType.CONTRACT,
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
      modality: ServiceType.REMOTE,
      contract_id: '',
      is_warranty: false,
      manual_price_override: false,
      manual_unit_price: 0,
      description: '',
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
              {/* 1. Dia (readonly) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Dia
                </label>
                <input
                  type="text"
                  value={new Date(activeTimer.appointment_date).toLocaleDateString('pt-BR')}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white cursor-not-allowed"
                />
              </div>

              {/* 2. Hora início e fim (readonly) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Hora início
                  </label>
                  <input
                    type="text"
                    value={activeTimer.start_time}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Hora fim
                  </label>
                  <input
                    type="text"
                    value={new Date().toTimeString().slice(0, 5)}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Duração calculada */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-700 dark:text-blue-400">⏳ Duração total:</span>
                  <span className="text-lg font-semibold text-blue-900 dark:text-blue-200">
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

              {/* 4. Tipo de atendimento */}
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

              {/* 5. Tipo de contrato (muda baseado no tipo de atendimento) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tipo de contrato <span className="text-red-500">*</span>
                </label>
                {formData.coverage_type === ServiceCoverageType.CONTRACT ? (
                  <select
                    value={formData.contract_id}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contract_id: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  >
                    <option value="">Selecione um contrato</option>
                    {clientContracts.length > 0 ? (
                      clientContracts.map((contract) => (
                        <option key={contract.id} value={contract.id}>
                          {contract.descricao || contract.numero_contrato || `Contrato #${contract.id}`}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>Nenhum contrato encontrado</option>
                    )}
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
                    ? 'Contratos vinculados ao cliente'
                    : 'Tipos de atendimento avulso'}
                </p>
              </div>

              {/* 6. Modalidade (NOVO - campo separado) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Modalidade <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.modality}
                  onChange={(e) =>
                    setFormData({ ...formData, modality: e.target.value as ServiceType })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                >
                  <option value={ServiceType.REMOTE}>Remoto</option>
                  <option value={ServiceType.EXTERNAL}>Presencial/Externo</option>
                  <option value={ServiceType.INTERNAL}>Interno</option>
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Como o atendimento foi realizado
                </p>
              </div>

              {/* 6. Checkboxes: Garantia e Valor manual */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_warranty"
                    checked={formData.is_warranty}
                    onChange={(e) => {
                      const isWarranty = e.target.checked;
                      setFormData({
                        ...formData,
                        is_warranty: isWarranty,
                        manual_price_override: false,
                      });
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="is_warranty" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    Garantia (valor = R$ 0,00)
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="manual_price_override"
                    checked={formData.manual_price_override}
                    disabled={formData.is_warranty}
                    onChange={(e) =>
                      setFormData({ ...formData, manual_price_override: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                  />
                  <label
                    htmlFor="manual_price_override"
                    className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                  >
                    Valor manual
                  </label>
                </div>
              </div>

              {/* 7. Campo de valor (editável apenas se checkbox marcado) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Valor {formData.manual_price_override && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.manual_unit_price}
                  onChange={(e) =>
                    setFormData({ ...formData, manual_unit_price: parseFloat(e.target.value) || 0 })
                  }
                  disabled={!formData.manual_price_override || formData.is_warranty}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                  placeholder="Ex: 150.00"
                  required={formData.manual_price_override}
                />
                {formData.manual_price_override && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Valor por hora será multiplicado pela duração
                  </p>
                )}
              </div>

              {/* 8. Descrição */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Descrição do trabalho
                </label>
                <div className="relative">
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                    placeholder="Descreva o que foi realizado..."
                  />
                  {/* TODO: Adicionar botão de transcrição de voz aqui */}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Suporte para edição de texto e transcrição de voz (em breve)
                </p>
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
