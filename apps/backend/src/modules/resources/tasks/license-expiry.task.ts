import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, Not, In, Between, MoreThan } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ResourceLicense, LicenseStatus } from '../entities/resource-license.entity';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { NotificationConfigService } from '../../notifications/services/notification-config.service';
import { NotificationType } from '../../notifications/entities/notification.entity';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

@Injectable()
export class LicenseExpiryTask {
  private readonly logger = new Logger(LicenseExpiryTask.name);

  constructor(
    @InjectRepository(ResourceLicense)
    private readonly licenseRepository: Repository<ResourceLicense>,
    private readonly eventEmitter: EventEmitter2,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
    @Inject(forwardRef(() => NotificationConfigService))
    private readonly configService: NotificationConfigService,
  ) {}

  /**
   * Verifica licenças expiradas a cada hora
   * Atualiza status para EXPIRED e emite eventos WebSocket
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkExpiredLicenses() {
    this.logger.log('Verificando licenças expiradas...');

    const now = new Date();

    // Buscar licenças que:
    // - Não são perpétuas
    // - Têm data de expiração no passado
    // - Status ainda não é EXPIRED
    const expiredLicenses = await this.licenseRepository.find({
      where: {
        is_perpetual: false,
        expiry_date: LessThanOrEqual(now),
        license_status: Not(LicenseStatus.EXPIRED),
      },
      select: ['id', 'product_name', 'expiry_date', 'license_status', 'client_id'],
    });

    if (expiredLicenses.length === 0) {
      this.logger.debug('Nenhuma licença expirada encontrada');
      return;
    }

    this.logger.log(`Encontradas ${expiredLicenses.length} licença(s) expirada(s)`);

    // Atualizar status para EXPIRED
    const ids = expiredLicenses.map(l => l.id);
    await this.licenseRepository
      .createQueryBuilder()
      .update(ResourceLicense)
      .set({ license_status: LicenseStatus.EXPIRED })
      .whereInIds(ids)
      .execute();

    // Emitir eventos e criar notificações para cada licença expirada
    for (const license of expiredLicenses) {
      this.logger.log(
        `Licença expirada: ${license.product_name} (ID: ${license.id}, Expirou em: ${license.expiry_date})`,
      );

      this.eventEmitter.emit('license.expired', {
        licenseId: license.id,
        productName: license.product_name,
        expiryDate: license.expiry_date,
        clientId: license.client_id,
      });

      // Também emitir evento de atualização para o frontend
      this.eventEmitter.emit('license.updated', { licenseId: license.id });

      // Criar notificação de licença expirada
      try {
        await this.notificationsService.createAlertNotifications(
          NotificationType.LICENSE_EXPIRED,
          license.id,
          'license',
          'Licença Expirada',
          `A licença "${license.product_name}" expirou em ${format(new Date(license.expiry_date), 'dd/MM/yyyy', { locale: ptBR })}`,
          license.client_id,
        );
      } catch (error) {
        this.logger.error(`Erro ao criar notificação para licença ${license.id}:`, error);
      }
    }
  }

  /**
   * Verifica licenças próximas da expiração (30, 15, 7 dias)
   * Executa diariamente às 8h
   * Cria notificações configuráveis para admins e clientes
   */
  @Cron('0 8 * * *') // Todo dia às 8h
  async checkExpiringLicenses() {
    this.logger.log('Verificando licenças próximas da expiração...');

    const now = new Date();
    now.setHours(0, 0, 0, 0); // Início do dia para comparação precisa

    // Verificar cada período de alerta
    const alertPeriods = [
      { days: 30, type: NotificationType.LICENSE_EXPIRING_30 },
      { days: 15, type: NotificationType.LICENSE_EXPIRING_15 },
      { days: 7, type: NotificationType.LICENSE_EXPIRING_7 },
    ];

    for (const period of alertPeriods) {
      await this.checkLicensesForPeriod(now, period.days, period.type);
    }

    // Emitir evento resumo (mantém compatibilidade com código existente)
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const allExpiringLicenses = await this.licenseRepository
      .createQueryBuilder('license')
      .leftJoinAndSelect('license.client', 'client')
      .where('license.is_perpetual = :isPerpetual', { isPerpetual: false })
      .andWhere('license.expiry_date > :now', { now })
      .andWhere('license.expiry_date <= :futureDate', { futureDate: thirtyDaysFromNow })
      .andWhere('license.license_status NOT IN (:...excludedStatuses)', {
        excludedStatuses: [LicenseStatus.EXPIRED, LicenseStatus.SUSPENDED],
      })
      .orderBy('license.expiry_date', 'ASC')
      .getMany();

    if (allExpiringLicenses.length > 0) {
      this.logger.log(`${allExpiringLicenses.length} licença(s) expiram nos próximos 30 dias`);

      // Agrupar por cliente para evento
      const byClient = new Map<string, typeof allExpiringLicenses>();
      for (const license of allExpiringLicenses) {
        const clientId = license.client_id;
        if (!byClient.has(clientId)) {
          byClient.set(clientId, []);
        }
        byClient.get(clientId)!.push(license);
      }

      for (const [clientId, licenses] of byClient) {
        const clientName = licenses[0].client?.nome || clientId;
        this.eventEmitter.emit('license.expiring-soon', {
          clientId,
          clientName,
          licenses: licenses.map(l => ({
            id: l.id,
            productName: l.product_name,
            expiryDate: l.expiry_date,
            daysUntilExpiry: Math.ceil(
              (new Date(l.expiry_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
            ),
          })),
        });
      }
    }
  }

  /**
   * Verifica licenças que expiram exatamente em X dias
   * Cria notificações apenas para licenças que expiram nesse dia específico
   */
  private async checkLicensesForPeriod(
    now: Date,
    days: number,
    notificationType: NotificationType,
  ) {
    // Calcular o dia exato de expiração
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + days);
    const targetDateStart = new Date(targetDate);
    targetDateStart.setHours(0, 0, 0, 0);
    const targetDateEnd = new Date(targetDate);
    targetDateEnd.setHours(23, 59, 59, 999);

    // Buscar licenças que expiram exatamente nesse dia
    const licenses = await this.licenseRepository
      .createQueryBuilder('license')
      .leftJoinAndSelect('license.client', 'client')
      .where('license.is_perpetual = :isPerpetual', { isPerpetual: false })
      .andWhere('license.expiry_date >= :start', { start: targetDateStart })
      .andWhere('license.expiry_date <= :end', { end: targetDateEnd })
      .andWhere('license.license_status NOT IN (:...excludedStatuses)', {
        excludedStatuses: [LicenseStatus.EXPIRED, LicenseStatus.SUSPENDED],
      })
      .getMany();

    if (licenses.length === 0) {
      this.logger.debug(`Nenhuma licença expira em ${days} dias`);
      return;
    }

    this.logger.log(`${licenses.length} licença(s) expiram em ${days} dias`);

    // Criar notificações para cada licença
    for (const license of licenses) {
      const clientName = license.client?.nome || 'Cliente';
      const expiryDateFormatted = format(new Date(license.expiry_date), 'dd/MM/yyyy', { locale: ptBR });

      try {
        await this.notificationsService.createAlertNotifications(
          notificationType,
          license.id,
          'license',
          `Licença expira em ${days} dias`,
          `A licença "${license.product_name}" do cliente ${clientName} expira em ${expiryDateFormatted}`,
          license.client_id,
        );

        this.logger.debug(
          `Notificação criada: ${license.product_name} expira em ${days} dias`,
        );
      } catch (error) {
        this.logger.error(
          `Erro ao criar notificação para licença ${license.id}:`,
          error,
        );
      }
    }
  }

  /**
   * Método para forçar verificação manual (útil para testes)
   */
  async forceCheck() {
    await this.checkExpiredLicenses();
    await this.checkExpiringLicenses();
  }
}
