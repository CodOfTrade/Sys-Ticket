import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationConfig } from '../entities/notification-config.entity';
import { UpdateNotificationConfigDto } from '../dto/update-notification-config.dto';

// Configurações padrão de alertas
const DEFAULT_CONFIGS = [
  {
    alert_type: 'license_expiring_30',
    alert_name: 'Licenças expirando em 30 dias',
    description: 'Alerta quando licenças estão prestes a expirar em 30 dias',
    days_before: 30,
    category: 'license',
    notify_admins: true,
    email_admins: false,
    notify_clients: false,
    email_clients: false,
    is_active: true,
  },
  {
    alert_type: 'license_expiring_15',
    alert_name: 'Licenças expirando em 15 dias',
    description: 'Alerta quando licenças estão prestes a expirar em 15 dias',
    days_before: 15,
    category: 'license',
    notify_admins: true,
    email_admins: false,
    notify_clients: false,
    email_clients: false,
    is_active: true,
  },
  {
    alert_type: 'license_expiring_7',
    alert_name: 'Licenças expirando em 7 dias',
    description: 'Alerta quando licenças estão prestes a expirar em 7 dias',
    days_before: 7,
    category: 'license',
    notify_admins: true,
    email_admins: false,
    notify_clients: true,
    email_clients: false,
    is_active: true,
  },
  {
    alert_type: 'license_expired',
    alert_name: 'Licenças expiradas',
    description: 'Alerta quando licenças acabam de expirar',
    days_before: 0,
    category: 'license',
    notify_admins: true,
    email_admins: false,
    notify_clients: true,
    email_clients: false,
    is_active: true,
  },
  {
    alert_type: 'resource_offline_1h',
    alert_name: 'Recursos offline há 1 hora',
    description: 'Alerta quando recursos ficam offline por mais de 1 hora',
    days_before: 0,
    category: 'resource',
    notify_admins: true,
    email_admins: false,
    notify_clients: false,
    email_clients: false,
    is_active: false,
  },
  {
    alert_type: 'resource_offline_24h',
    alert_name: 'Recursos offline há 24 horas',
    description: 'Alerta quando recursos ficam offline por mais de 24 horas',
    days_before: 0,
    category: 'resource',
    notify_admins: true,
    email_admins: false,
    notify_clients: true,
    email_clients: false,
    is_active: false,
  },
];

@Injectable()
export class NotificationConfigService implements OnModuleInit {
  constructor(
    @InjectRepository(NotificationConfig)
    private readonly configRepository: Repository<NotificationConfig>,
  ) {}

  /**
   * Inicializa as configurações padrão se não existirem
   */
  async onModuleInit(): Promise<void> {
    for (const config of DEFAULT_CONFIGS) {
      const exists = await this.configRepository.findOne({
        where: { alert_type: config.alert_type },
      });

      if (!exists) {
        await this.configRepository.save(this.configRepository.create(config));
        console.log(`[NotificationConfig] Criado config: ${config.alert_name}`);
      }
    }
  }

  /**
   * Busca todas as configurações
   */
  async findAll(): Promise<NotificationConfig[]> {
    return this.configRepository.find({
      order: { category: 'ASC', days_before: 'DESC' },
    });
  }

  /**
   * Busca configurações por categoria
   */
  async findByCategory(category: string): Promise<NotificationConfig[]> {
    return this.configRepository.find({
      where: { category },
      order: { days_before: 'DESC' },
    });
  }

  /**
   * Busca configuração por tipo de alerta
   */
  async findByAlertType(alertType: string): Promise<NotificationConfig | null> {
    return this.configRepository.findOne({
      where: { alert_type: alertType },
    });
  }

  /**
   * Busca por ID
   */
  async findOne(id: string): Promise<NotificationConfig> {
    const config = await this.configRepository.findOne({ where: { id } });
    if (!config) {
      throw new NotFoundException('Configuração não encontrada');
    }
    return config;
  }

  /**
   * Atualiza configuração
   */
  async update(
    id: string,
    dto: UpdateNotificationConfigDto,
  ): Promise<NotificationConfig> {
    const config = await this.findOne(id);
    Object.assign(config, dto);
    return this.configRepository.save(config);
  }

  /**
   * Busca configurações ativas para alertas de licença
   */
  async getActiveLicenseAlerts(): Promise<NotificationConfig[]> {
    return this.configRepository.find({
      where: { category: 'license', is_active: true },
      order: { days_before: 'DESC' },
    });
  }
}
