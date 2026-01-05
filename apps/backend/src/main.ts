import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';
import { TransformInterceptor } from './shared/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);

  // Configuração de CORS
  app.enableCors({
    origin: configService.get('CORS_ORIGIN') || '*',
    credentials: true,
  });

  // Prefixo global
  app.setGlobalPrefix('api');

  // Versionamento da API
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Validação global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Filtros e Interceptors globais
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Configuração do Swagger
  const config = new DocumentBuilder()
    .setTitle('Sys-Ticket API')
    .setDescription(
      'API completa para sistema de gestão de tickets e atendimento ao cliente com integração SIGE Cloud',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Insira o token JWT',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Auth', 'Autenticação e autorização')
    .addTag('Clients', 'Gestão de clientes (via SIGE Cloud)')
    .addTag('Contracts', 'Consulta de contratos (SIGE Cloud)')
    .addTag('Tickets', 'Gestão de tickets')
    .addTag('Timesheets', 'Apontamentos de tempo')
    .addTag('Pricing', 'Precificação e valorização')
    .addTag('Invoices', 'Faturamento (OS SIGE Cloud)')
    .addTag('Signatures', 'Assinaturas digitais')
    .addTag('Photos', 'Fotos e evidências')
    .addTag('Sync', 'Sincronização offline')
    .addTag('Webhooks', 'Webhooks para integrações')
    .addTag('Users', 'Gestão de usuários')
    .addTag('Service Desks', 'Mesas de serviço')
    .addTag('SLA', 'Gestão de SLA')
    .addTag('Reports', 'Relatórios e dashboards')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Sys-Ticket API Documentation',
    customfavIcon: 'https://nestjs.com/img/logo_text.svg',
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.js',
    ],
    customCssUrl: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.css',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.css',
    ],
  });

  const port = configService.get('PORT') || 3000;
  await app.listen(port);

  console.log(`
    🚀 Sys-Ticket API rodando em: http://localhost:${port}
    📚 Documentação Swagger: http://localhost:${port}/api/docs
    🔧 Ambiente: ${configService.get('NODE_ENV') || 'development'}
  `);
}

bootstrap();
