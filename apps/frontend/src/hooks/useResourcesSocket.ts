import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';

interface QuickStatus {
  cpuUsage: number;
  memoryUsage: number;
  uptime: number;
}

interface ResourceHeartbeatEvent {
  type: 'heartbeat';
  resourceId: string;
  quickStatus: QuickStatus;
  timestamp: string;
}

interface ResourceStatusEvent {
  type: 'status-changed';
  resourceId: string;
  isOnline: boolean;
  lastHeartbeat?: string;
  timestamp: string;
}

interface ResourceRegisteredEvent {
  type: 'registered';
  resourceId: string;
  resourceCode: string;
  clientId: string;
  hostname: string;
  timestamp: string;
}

interface ResourceUpdatedEvent {
  type: 'updated';
  resourceId: string;
  changes?: Record<string, any>;
  timestamp: string;
}

interface ResourceCommandEvent {
  type: 'command-sent';
  resourceId: string;
  command: string;
  timestamp: string;
}

interface UseResourcesSocketOptions {
  enabled?: boolean;
  onHeartbeat?: (event: ResourceHeartbeatEvent) => void;
  onStatusChanged?: (event: ResourceStatusEvent) => void;
  onRegistered?: (event: ResourceRegisteredEvent) => void;
  onUpdated?: (event: ResourceUpdatedEvent) => void;
  onCommandSent?: (event: ResourceCommandEvent) => void;
}

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || window.location.origin;

export function useResourcesSocket(options: UseResourcesSocketOptions = {}) {
  const { enabled = true } = options;
  const socketRef = useRef<Socket | null>(null);
  const queryClient = useQueryClient();

  // Função para invalidar queries de recursos
  const invalidateResources = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['resources'] });
  }, [queryClient]);

  // Função para atualizar um recurso específico no cache
  const updateResourceInCache = useCallback(
    (resourceId: string, updates: Partial<any>) => {
      // Atualizar cache do recurso individual
      queryClient.setQueryData(['resource', resourceId], (old: any) => {
        if (!old) return old;
        return { ...old, ...updates };
      });
    },
    [queryClient]
  );

  // Conectar ao WebSocket
  useEffect(() => {
    if (!enabled) return;

    // Criar conexão com namespace /resources
    const socket = io(`${SOCKET_URL}/resources`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    // Handlers de conexão
    socket.on('connect', () => {
      console.log('[WebSocket] Conectado ao servidor de recursos');
      socket.emit('join-resources');
    });

    socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Desconectado:', reason);
    });

    socket.on('connect_error', (error) => {
      console.warn('[WebSocket] Erro de conexão:', error.message);
    });

    // Handlers de eventos de recursos
    socket.on('resource:heartbeat', (event: ResourceHeartbeatEvent) => {
      console.debug('[WebSocket] Heartbeat recebido:', event.resourceId);

      // Atualizar cache com status rápido
      updateResourceInCache(event.resourceId, {
        is_online: true,
        agent_last_heartbeat: event.timestamp,
        metadata: {
          lastQuickStatus: event.quickStatus,
          lastHeartbeat: event.timestamp,
        },
      });

      options.onHeartbeat?.(event);
    });

    socket.on('resource:status-changed', (event: ResourceStatusEvent) => {
      console.log('[WebSocket] Status alterado:', event.resourceId, event.isOnline);

      // Atualizar cache
      updateResourceInCache(event.resourceId, {
        is_online: event.isOnline,
        agent_last_heartbeat: event.lastHeartbeat,
      });

      // Invalidar lista para atualizar contadores
      invalidateResources();
      options.onStatusChanged?.(event);
    });

    socket.on('resource:registered', (event: ResourceRegisteredEvent) => {
      console.log('[WebSocket] Novo recurso registrado:', event.resourceCode);
      invalidateResources();
      options.onRegistered?.(event);
    });

    socket.on('resource:updated', (event: ResourceUpdatedEvent) => {
      console.log('[WebSocket] Recurso atualizado:', event.resourceId);
      invalidateResources();
      options.onUpdated?.(event);
    });

    socket.on('resource:command-sent', (event: ResourceCommandEvent) => {
      console.log('[WebSocket] Comando enviado:', event.resourceId, event.command);
      options.onCommandSent?.(event);
    });

    // Cleanup na desmontagem
    return () => {
      socket.emit('leave-resources');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, invalidateResources, updateResourceInCache, options]);

  // Retornar estado e métodos úteis
  return {
    socket: socketRef.current,
    isConnected: socketRef.current?.connected ?? false,
    invalidateResources,
    updateResourceInCache,
  };
}
