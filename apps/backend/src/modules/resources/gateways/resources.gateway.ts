import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/resources',
})
export class ResourcesGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ResourcesGateway.name);
  private connectedClients = new Map<string, Socket>();

  afterInit() {
    this.logger.log('WebSocket Gateway inicializado - namespace /resources');
  }

  handleConnection(client: Socket) {
    this.connectedClients.set(client.id, client);
    this.logger.log(`Cliente conectado: ${client.id} (Total: ${this.connectedClients.size})`);

    // Automaticamente entrar na sala de recursos
    client.join('resources-room');
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`Cliente desconectado: ${client.id} (Total: ${this.connectedClients.size})`);
  }

  @SubscribeMessage('join-resources')
  handleJoinResources(client: Socket) {
    client.join('resources-room');
    this.logger.debug(`Cliente ${client.id} entrou em resources-room`);
    return { event: 'joined', room: 'resources-room' };
  }

  @SubscribeMessage('leave-resources')
  handleLeaveResources(client: Socket) {
    client.leave('resources-room');
    this.logger.debug(`Cliente ${client.id} saiu de resources-room`);
    return { event: 'left', room: 'resources-room' };
  }

  // ==================== EVENT LISTENERS ====================

  @OnEvent('resource.heartbeat')
  handleResourceHeartbeat(payload: {
    resourceId: string;
    quickStatus: {
      cpuUsage: number;
      memoryUsage: number;
      uptime: number;
    };
    timestamp: string;
  }) {
    this.logger.debug(`Evento resource.heartbeat - ID: ${payload.resourceId}`);
    this.server.to('resources-room').emit('resource:heartbeat', {
      type: 'heartbeat',
      resourceId: payload.resourceId,
      quickStatus: payload.quickStatus,
      timestamp: payload.timestamp,
    });
  }

  @OnEvent('resource.status.changed')
  handleResourceStatusChanged(payload: {
    resourceId: string;
    isOnline: boolean;
    lastHeartbeat?: string;
  }) {
    this.logger.log(`Evento resource.status.changed - ID: ${payload.resourceId}, Online: ${payload.isOnline}`);
    this.server.to('resources-room').emit('resource:status-changed', {
      type: 'status-changed',
      resourceId: payload.resourceId,
      isOnline: payload.isOnline,
      lastHeartbeat: payload.lastHeartbeat,
      timestamp: new Date().toISOString(),
    });
  }

  @OnEvent('resource.registered')
  handleResourceRegistered(payload: {
    resourceId: string;
    resourceCode: string;
    clientId: string;
    hostname: string;
  }) {
    this.logger.log(`Evento resource.registered - ID: ${payload.resourceId}`);
    this.server.to('resources-room').emit('resource:registered', {
      type: 'registered',
      resourceId: payload.resourceId,
      resourceCode: payload.resourceCode,
      clientId: payload.clientId,
      hostname: payload.hostname,
      timestamp: new Date().toISOString(),
    });
  }

  @OnEvent('resource.updated')
  handleResourceUpdated(payload: {
    resourceId: string;
    changes?: Record<string, any>;
  }) {
    this.logger.log(`Evento resource.updated - ID: ${payload.resourceId}`);
    this.server.to('resources-room').emit('resource:updated', {
      type: 'updated',
      resourceId: payload.resourceId,
      changes: payload.changes,
      timestamp: new Date().toISOString(),
    });
  }

  @OnEvent('resource.command.sent')
  handleResourceCommandSent(payload: {
    resourceId: string;
    command: string;
  }) {
    this.logger.log(`Evento resource.command.sent - ID: ${payload.resourceId}, Comando: ${payload.command}`);
    this.server.to('resources-room').emit('resource:command-sent', {
      type: 'command-sent',
      resourceId: payload.resourceId,
      command: payload.command,
      timestamp: new Date().toISOString(),
    });
  }

  // ==================== EVENTOS DE LICENÇAS ====================

  @OnEvent('license.created')
  handleLicenseCreated(payload: { licenseId: string }) {
    this.logger.log(`Evento license.created - ID: ${payload.licenseId}`);
    this.server.to('resources-room').emit('license:created', {
      type: 'created',
      licenseId: payload.licenseId,
      timestamp: new Date().toISOString(),
    });
  }

  @OnEvent('license.updated')
  handleLicenseUpdated(payload: { licenseId: string }) {
    this.logger.log(`Evento license.updated - ID: ${payload.licenseId}`);
    this.server.to('resources-room').emit('license:updated', {
      type: 'updated',
      licenseId: payload.licenseId,
      timestamp: new Date().toISOString(),
    });
  }

  @OnEvent('license.deleted')
  handleLicenseDeleted(payload: { licenseId: string }) {
    this.logger.log(`Evento license.deleted - ID: ${payload.licenseId}`);
    this.server.to('resources-room').emit('license:deleted', {
      type: 'deleted',
      licenseId: payload.licenseId,
      timestamp: new Date().toISOString(),
    });
  }

  // Método público para emitir eventos manualmente se necessário
  emitToAll(event: string, data: any) {
    this.server.to('resources-room').emit(event, data);
  }

  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }
}
