import { useState, useEffect } from 'react';
import { Play, Square, Clock } from 'lucide-react';
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
        description: description || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-timer'] });
      queryClient.invalidateQueries({ queryKey: ['appointments', ticketId] });
      setDescription('');
      setElapsedTime(0);
    },
  });

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
              onClick={() => stopTimerMutation.mutate()}
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
    </div>
  );
}
