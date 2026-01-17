import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';

interface TicketEvent {
  type: 'created' | 'updated' | 'status-changed' | 'assigned' | 'deleted';
  ticket?: any;
  ticketId?: string;
  oldStatus?: string;
  newStatus?: string;
  assigneeId?: string;
  timestamp: string;
}

interface UseTicketsSocketOptions {
  enabled?: boolean;
  onTicketCreated?: (event: TicketEvent) => void;
  onTicketUpdated?: (event: TicketEvent) => void;
  onTicketStatusChanged?: (event: TicketEvent) => void;
  onTicketAssigned?: (event: TicketEvent) => void;
  onTicketDeleted?: (event: TicketEvent) => void;
}

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || window.location.origin;

export function useTicketsSocket(options: UseTicketsSocketOptions = {}) {
  const { enabled = true } = options;
  const socketRef = useRef<Socket | null>(null);
  const queryClient = useQueryClient();

  // Função para invalidar queries de tickets
  const invalidateTickets = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['tickets'] });
  }, [queryClient]);

  // Conectar ao WebSocket
  useEffect(() => {
    if (!enabled) return;

    // Criar conexão com namespace /tickets
    const socket = io(`${SOCKET_URL}/tickets`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    // Handlers de conexão
    socket.on('connect', () => {
      console.log('[WebSocket] Conectado ao servidor de tickets');
      socket.emit('join-tickets');
    });

    socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Desconectado:', reason);
    });

    socket.on('connect_error', (error) => {
      console.warn('[WebSocket] Erro de conexão:', error.message);
    });

    // Handlers de eventos de tickets
    socket.on('ticket:created', (event: TicketEvent) => {
      console.log('[WebSocket] Ticket criado:', event);
      invalidateTickets();
      options.onTicketCreated?.(event);
    });

    socket.on('ticket:updated', (event: TicketEvent) => {
      console.log('[WebSocket] Ticket atualizado:', event);
      invalidateTickets();
      options.onTicketUpdated?.(event);
    });

    socket.on('ticket:status-changed', (event: TicketEvent) => {
      console.log('[WebSocket] Status alterado:', event);
      invalidateTickets();
      options.onTicketStatusChanged?.(event);
    });

    socket.on('ticket:assigned', (event: TicketEvent) => {
      console.log('[WebSocket] Ticket atribuído:', event);
      invalidateTickets();
      options.onTicketAssigned?.(event);
    });

    socket.on('ticket:deleted', (event: TicketEvent) => {
      console.log('[WebSocket] Ticket excluído:', event);
      invalidateTickets();
      options.onTicketDeleted?.(event);
    });

    // Cleanup na desmontagem
    return () => {
      socket.emit('leave-tickets');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, invalidateTickets, options]);

  // Retornar estado e métodos úteis
  return {
    socket: socketRef.current,
    isConnected: socketRef.current?.connected ?? false,
    invalidateTickets,
  };
}
