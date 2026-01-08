import { useState, useEffect } from 'react';
import { Play, Square, Clock, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { appointmentsService } from '@/services/ticket-details.service';
import { AppointmentType, ServiceCoverageType } from '@/types/ticket-details.types';

interface AppointmentTimerProps {
  ticketId: string;
}

export function AppointmentTimer({ ticketId }: AppointmentTimerProps) {
  const queryClient = useQueryClient();
  const [elapsedTime, setElapsedTime] = useState(0);
  const [description, setDescription] = useState('');
  const [showStopModal, setShowStopModal] = useState(false);

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
    mutationFn: (desc?: string) =>
      appointmentsService.stopTimer({
        appointment_id: activeTimer!.id,
        description: desc || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-timer'] });
      queryClient.invalidateQueries({ queryKey: ['appointments', ticketId] });
      setDescription('');
      setElapsedTime(0);
      setShowStopModal(false);
    },
  });

  const handleStopTimer = () => {
    setShowStopModal(true);
  };

  const handleConfirmStop = (saveWithDetails: boolean) => {
    if (saveWithDetails) {
      // Parar e permitir edição posterior
      stopTimerMutation.mutate(description);
    } else {
      // Parar sem descrição (pendente)
      stopTimerMutation.mutate(undefined);
    }
  };

  // Calcular tempo decorrido
  useEffect(() => {
    if (activeTimer && activeTimer.timer_started_at && !activeTimer.timer_stopped_at) {
      const startTime = new Date(activeTimer.timer_started_at).getTime();

      const updateElapsed = () => {
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        setElapsedTime(elapsed);
      };

      updateElapsed();
      const interval = setInterval(updateElapsed, 1000);

      return () => clearInterval(interval);
    } else {
      setElapsedTime(0);
    }
  }, [activeTimer]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Timer de Apontamento</h3>
            {isTimerActive && (
              <p className="text-2xl font-mono text-blue-600 dark:text-blue-400 mt-1">
                {formatTime(elapsedTime)}
              </p>
            )}
            {isAnotherTicketTimer && (
              <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
                Timer ativo em outro ticket
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isTimerActive && !isAnotherTicketTimer && (
            <button
              onClick={() => startTimerMutation.mutate()}
              disabled={startTimerMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              Iniciar
            </button>
          )}

          {isTimerActive && (
            <button
              onClick={handleStopTimer}
              disabled={stopTimerMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Square className="w-4 h-4" />
              Parar
            </button>
          )}

          {isAnotherTicketTimer && activeTimer && (
            <a
              href={`/tickets/${activeTimer.ticket_id}`}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Ir para o ticket ativo
            </a>
          )}
        </div>
      </div>

      {isTimerActive && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Descrição do trabalho (opcional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Descreva o que está fazendo..."
          />
        </div>
      )}

      {/* Modal de confirmação ao parar timer */}
      {showStopModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Parar Timer de Apontamento
              </h3>
              <button
                onClick={() => setShowStopModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Tempo registrado: <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">{formatTime(elapsedTime)}</span>
              </p>
              <p className="text-gray-700 dark:text-gray-300 mb-6">
                Deseja preencher os detalhes do apontamento agora ou deixar para depois?
              </p>

              {description && (
                <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Descrição:</p>
                  <p className="text-sm text-gray-900 dark:text-white">{description}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => handleConfirmStop(false)}
                  disabled={stopTimerMutation.isPending}
                  className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  Deixar Pendente
                </button>
                <button
                  onClick={() => handleConfirmStop(true)}
                  disabled={stopTimerMutation.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {description ? 'Salvar com Descrição' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
