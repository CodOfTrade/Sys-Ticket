import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, Not, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ResourceLicense, LicenseStatus } from '../entities/resource-license.entity';

@Injectable()
export class LicenseExpiryTask {
  private readonly logger = new Logger(LicenseExpiryTask.name);

  constructor(
    @InjectRepository(ResourceLicense)
    private readonly licenseRepository: Repository<ResourceLicense>,
    private readonly eventEmitter: EventEmitter2,
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

    // Emitir eventos para cada licença expirada
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
    }
  }

  /**
   * Verifica licenças próximas da expiração (30 dias)
   * Executa diariamente às 8h
   * Pode ser usado para enviar notificações
   */
  @Cron('0 8 * * *') // Todo dia às 8h
  async checkExpiringLicenses() {
    this.logger.log('Verificando licenças próximas da expiração...');

    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    // Buscar licenças que expiram nos próximos 30 dias
    const expiringLicenses = await this.licenseRepository
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

    if (expiringLicenses.length === 0) {
      this.logger.debug('Nenhuma licença próxima da expiração');
      return;
    }

    this.logger.log(`${expiringLicenses.length} licença(s) expiram nos próximos 30 dias`);

    // Agrupar por cliente para possível notificação
    const byClient = new Map<string, typeof expiringLicenses>();
    for (const license of expiringLicenses) {
      const clientId = license.client_id;
      if (!byClient.has(clientId)) {
        byClient.set(clientId, []);
      }
      byClient.get(clientId)!.push(license);
    }

    // Emitir evento com resumo de licenças por cliente
    for (const [clientId, licenses] of byClient) {
      const clientName = licenses[0].client?.nome || clientId;
      this.logger.log(
        `Cliente ${clientName}: ${licenses.length} licença(s) expirando em breve`,
      );

      // Evento pode ser usado para enviar email/notificação
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

  /**
   * Método para forçar verificação manual (útil para testes)
   */
  async forceCheck() {
    await this.checkExpiredLicenses();
    await this.checkExpiringLicenses();
  }
}
