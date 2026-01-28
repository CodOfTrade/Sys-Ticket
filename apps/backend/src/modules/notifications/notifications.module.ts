import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationConfig } from './entities/notification-config.entity';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from './services/notifications.service';
import { NotificationConfigService } from './services/notification-config.service';
import { NotificationsController } from './controllers/notifications.controller';
import { NotificationConfigController } from './controllers/notification-config.controller';
import { NotificationsGateway } from './gateways/notifications.gateway';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, NotificationConfig, User]),
    forwardRef(() => UsersModule),
  ],
  controllers: [NotificationsController, NotificationConfigController],
  providers: [
    NotificationsService,
    NotificationConfigService,
    NotificationsGateway,
  ],
  exports: [NotificationsService, NotificationConfigService],
})
export class NotificationsModule {}
