import { api } from './api';

export enum NotificationType {
  LICENSE_EXPIRING_30 = 'license_expiring_30',
  LICENSE_EXPIRING_15 = 'license_expiring_15',
  LICENSE_EXPIRING_7 = 'license_expiring_7',
  LICENSE_EXPIRED = 'license_expired',
  RESOURCE_OFFLINE_1H = 'resource_offline_1h',
  RESOURCE_OFFLINE_24H = 'resource_offline_24h',
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  target_user_id?: string;
  client_id?: string;
  reference_id?: string;
  reference_type?: string;
  is_read: boolean;
  is_email_sent: boolean;
  email_sent_at?: string;
  created_at: string;
}

export interface NotificationConfig {
  id: string;
  alert_type: string;
  alert_name: string;
  notify_admins: boolean;
  email_admins: boolean;
  admin_user_ids?: string[];
  notify_clients: boolean;
  email_clients: boolean;
  days_before: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdateNotificationConfigDto {
  notify_admins?: boolean;
  email_admins?: boolean;
  admin_user_ids?: string[];
  notify_clients?: boolean;
  email_clients?: boolean;
  is_active?: boolean;
}

class NotificationService {
  private basePath = '/v1/notifications';

  async getMyNotifications(unreadOnly: boolean = false): Promise<Notification[]> {
    const params = unreadOnly ? { unreadOnly: 'true' } : {};
    const response = await api.get<Notification[]>(this.basePath, { params });
    return response.data;
  }

  async getUnreadCount(): Promise<number> {
    const response = await api.get<{ count: number }>(`${this.basePath}/count`);
    return response.data.count;
  }

  async markAsRead(id: string): Promise<Notification> {
    const response = await api.post<Notification>(`${this.basePath}/${id}/read`);
    return response.data;
  }

  async markAllAsRead(): Promise<void> {
    await api.post(`${this.basePath}/read-all`);
  }

  async deleteNotification(id: string): Promise<void> {
    await api.delete(`${this.basePath}/${id}`);
  }

  // Configurações de alertas
  async getConfigs(): Promise<NotificationConfig[]> {
    const response = await api.get<NotificationConfig[]>(`${this.basePath}/configs`);
    return response.data;
  }

  async getConfig(id: string): Promise<NotificationConfig> {
    const response = await api.get<NotificationConfig>(`${this.basePath}/configs/${id}`);
    return response.data;
  }

  async updateConfig(id: string, data: UpdateNotificationConfigDto): Promise<NotificationConfig> {
    const response = await api.patch<NotificationConfig>(`${this.basePath}/configs/${id}`, data);
    return response.data;
  }
}

export const notificationService = new NotificationService();
