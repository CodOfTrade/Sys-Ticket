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
  namespace: '/tickets',
})
export class TicketsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TicketsGateway.name);
  private connectedClients = new Map<string, Socket>();

  afterInit() {
    this.logger.log('WebSocket Gateway inicializado - namespace /tickets');
  }

  handleConnection(client: Socket) {
    this.connectedClients.set(client.id, client);
    this.logger.log(`Cliente conectado: ${client.id} (Total: ${this.connectedClients.size})`);

    // Automaticamente entrar na sala de tickets
    client.join('tickets-room');
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`Cliente desconectado: ${client.id} (Total: ${this.connectedClients.size})`);
  }

  @SubscribeMessage('join-tickets')
  handleJoinTickets(client: Socket) {
    client.join('tickets-room');
    this.logger.debug(`Cliente ${client.id} entrou em tickets-room`);
    return { event: 'joined', room: 'tickets-room' };
  }

  @SubscribeMessage('leave-tickets')
  handleLeaveTickets(client: Socket) {
    client.leave('tickets-room');
    this.logger.debug(`Cliente ${client.id} saiu de tickets-room`);
    return { event: 'left', room: 'tickets-room' };
  }

  // ==================== EVENT LISTENERS ====================

  @OnEvent('ticket.created')
  handleTicketCreated(payload: any) {
    this.logger.log(`Evento ticket.created - ID: ${payload.id}`);
    this.server.to('tickets-room').emit('ticket:created', {
      type: 'created',
      ticket: this.sanitizeTicket(payload),
      timestamp: new Date().toISOString(),
    });
  }

  @OnEvent('ticket.updated')
  handleTicketUpdated(payload: any) {
    this.logger.log(`Evento ticket.updated - ID: ${payload.id}`);
    this.server.to('tickets-room').emit('ticket:updated', {
      type: 'updated',
      ticket: this.sanitizeTicket(payload),
      timestamp: new Date().toISOString(),
    });
  }

  @OnEvent('ticket.status.changed')
  handleTicketStatusChanged(payload: any) {
    this.logger.log(`Evento ticket.status.changed - ID: ${payload.ticketId}`);
    this.server.to('tickets-room').emit('ticket:status-changed', {
      type: 'status-changed',
      ticketId: payload.ticketId,
      oldStatus: payload.oldStatus,
      newStatus: payload.newStatus,
      timestamp: new Date().toISOString(),
    });
  }

  @OnEvent('ticket.assigned')
  handleTicketAssigned(payload: any) {
    this.logger.log(`Evento ticket.assigned - ID: ${payload.ticketId}`);
    this.server.to('tickets-room').emit('ticket:assigned', {
      type: 'assigned',
      ticketId: payload.ticketId,
      assigneeId: payload.assigneeId,
      timestamp: new Date().toISOString(),
    });
  }

  @OnEvent('ticket.deleted')
  handleTicketDeleted(payload: any) {
    this.logger.log(`Evento ticket.deleted - ID: ${payload.id}`);
    this.server.to('tickets-room').emit('ticket:deleted', {
      type: 'deleted',
      ticketId: payload.id,
      timestamp: new Date().toISOString(),
    });
  }

  // Método auxiliar para remover dados sensíveis
  private sanitizeTicket(ticket: any) {
    if (!ticket) return null;

    return {
      id: ticket.id,
      code: ticket.code,
      title: ticket.title,
      status: ticket.status,
      priority: ticket.priority,
      client_id: ticket.client_id,
      client_name: ticket.client_name,
      assignee_id: ticket.assignee_id,
      created_at: ticket.created_at,
      updated_at: ticket.updated_at,
    };
  }

  // Método público para emitir eventos manualmente se necessário
  emitToAll(event: string, data: any) {
    this.server.to('tickets-room').emit(event, data);
  }

  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }
}
