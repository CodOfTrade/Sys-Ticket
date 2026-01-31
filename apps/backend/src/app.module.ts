import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD } from '@nestjs/core';

// Modules
import { SharedModule } from './shared/shared.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ClientsModule } from './modules/clients/clients.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { TimesheetsModule } from './modules/timesheets/timesheets.module';
import { ServiceDesksModule } from './modules/service-desks/service-desks.module';
import { QueuesModule } from './modules/queues/queues.module';
import { SlaModule } from './modules/sla/sla.module';
import { SignaturesModule } from './modules/signatures/signatures.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { SyncModule } from './modules/sync/sync.module';
import { ServiceCatalogModule } from './modules/service-catalog/service-catalog.module';
import { EmailModule } from './modules/email/email.module';
import { ProductsModule } from './modules/products/products.module';
import { SettingsModule } from './modules/settings/settings.module';
import { ResourcesModule } from './modules/resources/resources.module';
import { DownloadsModule } from './modules/downloads/downloads.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PermissionsModule } from './modules/permissions/permissions.module';

// Guards
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './modules/auth/guards/roles.guard';
import { PermissionsGuard } from './modules/permissions/guards/permissions.guard';

// Controllers
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    // Configuração global
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // TypeORM
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres' as const,
        host: configService.get<string>('DB_HOST') || 'localhost',
        port: parseInt(configService.get<string>('DB_PORT') || '5432', 10),
        username: configService.get<string>('DB_USERNAME') || 'sys_ticket',
        password: configService.get<string>('DB_PASSWORD') || '123321',
        database: configService.get<string>('DB_DATABASE') || 'sys_ticket_db',
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get<string>('NODE_ENV') === 'development',
        logging: configService.get<string>('NODE_ENV') === 'development',
        migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
      }),
      inject: [ConfigService],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minuto
        limit: 100, // 100 requisições
      },
    ]),

    // Agendamentos
    ScheduleModule.forRoot(),

    // Event Emitter
    EventEmitterModule.forRoot(),

    // Shared Module (Global)
    SharedModule,

    // Feature Modules
    AuthModule,
    UsersModule,
    ClientsModule,
    ContractsModule,
    TicketsModule,
    TimesheetsModule,
    ServiceDesksModule,
    ServiceCatalogModule,
    QueuesModule,
    SlaModule,
    SignaturesModule,
    WebhooksModule,
    SyncModule,
    EmailModule,
    ProductsModule,
    SettingsModule,
    ResourcesModule,
    DownloadsModule,
    NotificationsModule,
    PermissionsModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule {}
