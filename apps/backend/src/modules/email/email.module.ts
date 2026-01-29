import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailService } from './email.service';
import { SettingsModule } from '../settings/settings.module';
import { Notification } from '../notifications/entities/notification.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { ClientsModule } from '../clients/clients.module';
import { ResourcesModule } from '../resources/resources.module';

@Module({
  imports: [
    ConfigModule,
    SettingsModule,
    TypeOrmModule.forFeature([Notification]),
    forwardRef(() => NotificationsModule),
    forwardRef(() => UsersModule),
    forwardRef(() => ClientsModule),
    forwardRef(() => ResourcesModule),
  ],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
