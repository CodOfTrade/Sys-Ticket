import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Notification, NotificationType } from '../entities/notification.entity';
import { NotificationConfig } from '../entities/notification-config.entity';
import { User } from '../../users/entities/user.entity';
import { CreateNotificationDto } from '../dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(NotificationConfig)
    private readonly configRepository: Repository<NotificationConfig>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Cria uma notificação
   */
  async create(dto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationRepository.create(dto);
    const saved = await this.notificationRepository.save(notification);

    // Emitir evento para WebSocket
    this.eventEmitter.emit('notification.created', saved);

    return saved;
  }

  /**
   * Cria notificações de alerta baseadas nas configurações
   */
  async createAlertNotifications(
    alertType: NotificationType | string,
    referenceId: string,
    referenceType: string,
    title: string,
    message: string,
    clientId?: string,
  ): Promise<void> {
    const config = await this.configRepository.findOne({
      where: { alert_type: alertType },
    });

    if (!config?.is_active) {
      return;
    }

    // Notificar admins
    if (config.notify_admins) {
      let adminIds: string[] = [];

      if (config.admin_user_ids && config.admin_user_ids.length > 0) {
        adminIds = config.admin_user_ids;
      } else {
        // Buscar todos os admins
        const admins = await this.userRepository.find({
          where: { role: In(['admin', 'manager']) },
          select: ['id'],
        });
        adminIds = admins.map((a) => a.id);
      }

      // Criar notificação para cada admin
      for (const adminId of adminIds) {
        await this.create({
          type: alertType as NotificationType,
          title,
          message,
          target_user_id: adminId,
          reference_id: referenceId,
          reference_type: referenceType,
        });
      }
    }

    // Notificar cliente
    if (config.notify_clients && clientId) {
      await this.create({
        type: alertType as NotificationType,
        title,
        message,
        client_id: clientId,
        reference_id: referenceId,
        reference_type: referenceType,
      });
    }
  }

  /**
   * Busca notificações do usuário
   */
  async getMyNotifications(
    userId: string,
    unreadOnly: boolean = false,
  ): Promise<Notification[]> {
    const where: any = { target_user_id: userId };
    if (unreadOnly) {
      where.is_read = false;
    }

    return this.notificationRepository.find({
      where,
      order: { created_at: 'DESC' },
      take: 50,
    });
  }

  /**
   * Conta notificações não lidas
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { target_user_id: userId, is_read: false },
    });
  }

  /**
   * Busca uma notificação por ID
   */
  async findOne(id: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id },
    });
    if (!notification) {
      throw new NotFoundException('Notificação não encontrada');
    }
    return notification;
  }

  /**
   * Marca como lida
   */
  async markAsRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id, target_user_id: userId },
    });

    if (!notification) {
      throw new NotFoundException('Notificação não encontrada');
    }

    notification.is_read = true;
    return this.notificationRepository.save(notification);
  }

  /**
   * Marca todas como lidas
   */
  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { target_user_id: userId, is_read: false },
      { is_read: true },
    );
  }

  /**
   * Exclui notificação
   */
  async remove(id: string, userId: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id, target_user_id: userId },
    });

    if (!notification) {
      throw new NotFoundException('Notificação não encontrada');
    }

    await this.notificationRepository.remove(notification);
  }

  /**
   * Limpa notificações antigas (mais de 30 dias)
   */
  async cleanOldNotifications(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await this.notificationRepository
      .createQueryBuilder()
      .delete()
      .where('created_at < :date', { date: thirtyDaysAgo })
      .andWhere('is_read = true')
      .execute();

    return result.affected || 0;
  }
}
