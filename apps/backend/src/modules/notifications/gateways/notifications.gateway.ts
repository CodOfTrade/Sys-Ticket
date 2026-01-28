import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';
import { Notification } from '../entities/notification.entity';

@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private userSockets: Map<string, Set<string>> = new Map();

  handleConnection(client: Socket) {
    console.log(`[NotificationsGateway] Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`[NotificationsGateway] Cliente desconectado: ${client.id}`);
    // Remover socket de todos os usuários
    this.userSockets.forEach((sockets, userId) => {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    });
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(client: Socket, userId: string) {
    if (!userId) return;

    // Adicionar socket ao mapa do usuário
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)?.add(client.id);

    // Entrar na sala do usuário
    client.join(`user:${userId}`);
    console.log(`[NotificationsGateway] User ${userId} subscribed`);
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(client: Socket, userId: string) {
    if (!userId) return;

    // Remover socket do mapa do usuário
    this.userSockets.get(userId)?.delete(client.id);
    if (this.userSockets.get(userId)?.size === 0) {
      this.userSockets.delete(userId);
    }

    // Sair da sala do usuário
    client.leave(`user:${userId}`);
    console.log(`[NotificationsGateway] User ${userId} unsubscribed`);
  }

  @OnEvent('notification.created')
  handleNotificationCreated(notification: Notification) {
    if (notification.target_user_id) {
      // Enviar para o usuário específico
      this.server
        .to(`user:${notification.target_user_id}`)
        .emit('notification', notification);
    }
  }

  /**
   * Envia notificação para um usuário específico
   */
  sendToUser(userId: string, notification: Notification) {
    this.server.to(`user:${userId}`).emit('notification', notification);
  }

  /**
   * Envia notificação para todos os admins conectados
   */
  broadcastToAdmins(notification: Notification) {
    // Broadcast para todos os clientes conectados
    // Na prática, cada cliente verifica se é admin
    this.server.emit('notification', notification);
  }
}
