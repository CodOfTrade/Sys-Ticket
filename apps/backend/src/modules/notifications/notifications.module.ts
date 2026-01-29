import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationConfig } from './entities/notification-config.entity';
import { NotificationEmailTemplate } from './entities/notification-email-template.entity';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from './services/notifications.service';
import { NotificationConfigService } from './services/notification-config.service';
import { EmailTemplateService } from './services/email-template.service';
import { NotificationsController } from './controllers/notifications.controller';
import { NotificationConfigController } from './controllers/notification-config.controller';
import { EmailTemplateController } from './controllers/email-template.controller';
import { NotificationsGateway } from './gateways/notifications.gateway';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      NotificationConfig,
      NotificationEmailTemplate,
      User,
    ]),
    forwardRef(() => UsersModule),
  ],
  controllers: [
    NotificationConfigController,
    EmailTemplateController, // Mais específico primeiro
    NotificationsController, // Genérico por último
  ],
  providers: [
    NotificationsService,
    NotificationConfigService,
    EmailTemplateService,
    NotificationsGateway,
  ],
  exports: [NotificationsService, NotificationConfigService, EmailTemplateService],
})
export class NotificationsModule {}
