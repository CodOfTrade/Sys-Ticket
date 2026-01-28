import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LicenseHistory, LicenseHistoryEventType } from '../entities/license-history.entity';
import { ResourceLicense } from '../entities/resource-license.entity';

interface LogEventParams {
  licenseId: string;
  eventType: LicenseHistoryEventType;
  description?: string;
  oldData?: Record<string, any>;
  newData?: Record<string, any>;
  resourceId?: string;
  userId?: string;
  isAutomatic?: boolean;
  ipAddress?: string;
}

@Injectable()
export class LicenseHistoryService {
  constructor(
    @InjectRepository(LicenseHistory)
    private readonly historyRepository: Repository<LicenseHistory>,
  ) {}

  /**
   * Registra um evento no histórico da licença
   */
  async logEvent(params: LogEventParams): Promise<LicenseHistory> {
    const entry = this.historyRepository.create({
      license_id: params.licenseId,
      event_type: params.eventType,
      event_description: params.description,
      old_data: params.oldData,
      new_data: params.newData,
      resource_id: params.resourceId,
      changed_by_user_id: params.userId,
      is_automatic: params.isAutomatic ?? false,
      ip_address: params.ipAddress,
    });

    return this.historyRepository.save(entry);
  }

  /**
   * Registra criação de licença
   */
  async logCreated(license: ResourceLicense, userId?: string): Promise<void> {
    await this.logEvent({
      licenseId: license.id,
      eventType: LicenseHistoryEventType.CREATED,
      description: `Licença "${license.product_name}" criada`,
      newData: this.extractLicenseData(license),
      userId,
    });
  }

  /**
   * Registra atualização de licença
   */
  async logUpdated(
    oldLicense: Partial<ResourceLicense>,
    newLicense: ResourceLicense,
    userId?: string,
  ): Promise<void> {
    const changes = this.getChangedFields(oldLicense, newLicense);
    if (changes.length === 0) return;

    await this.logEvent({
      licenseId: newLicense.id,
      eventType: LicenseHistoryEventType.UPDATED,
      description: `Campos alterados: ${changes.join(', ')}`,
      oldData: oldLicense,
      newData: this.extractLicenseData(newLicense),
      userId,
    });
  }

  /**
   * Registra mudança de status
   */
  async logStatusChange(
    license: ResourceLicense,
    oldStatus: string,
    newStatus: string,
    isAutomatic: boolean = false,
    userId?: string,
  ): Promise<void> {
    await this.logEvent({
      licenseId: license.id,
      eventType: LicenseHistoryEventType.STATUS_CHANGED,
      description: `Status alterado de "${oldStatus}" para "${newStatus}"`,
      oldData: { license_status: oldStatus },
      newData: { license_status: newStatus },
      isAutomatic,
      userId,
    });
  }

  /**
   * Registra atribuição a dispositivo
   */
  async logAssigned(
    license: ResourceLicense,
    resourceId: string,
    resourceName: string,
    userId?: string,
  ): Promise<void> {
    await this.logEvent({
      licenseId: license.id,
      eventType: LicenseHistoryEventType.ASSIGNED,
      description: `Licença atribuída ao dispositivo "${resourceName}"`,
      resourceId,
      newData: {
        resource_id: resourceId,
        current_activations: license.current_activations,
      },
      userId,
    });
  }

  /**
   * Registra remoção de dispositivo
   */
  async logUnassigned(
    license: ResourceLicense,
    resourceId: string,
    resourceName: string,
    userId?: string,
  ): Promise<void> {
    await this.logEvent({
      licenseId: license.id,
      eventType: LicenseHistoryEventType.UNASSIGNED,
      description: `Licença removida do dispositivo "${resourceName}"`,
      resourceId,
      newData: {
        current_activations: license.current_activations,
      },
      userId,
    });
  }

  /**
   * Registra expiração automática
   */
  async logExpired(license: ResourceLicense): Promise<void> {
    await this.logEvent({
      licenseId: license.id,
      eventType: LicenseHistoryEventType.EXPIRED,
      description: `Licença expirou em ${license.expiry_date}`,
      isAutomatic: true,
      newData: { license_status: 'expired', expiry_date: license.expiry_date },
    });
  }

  /**
   * Registra renovação
   */
  async logRenewed(
    license: ResourceLicense,
    oldExpiryDate: Date,
    newExpiryDate: Date,
    userId?: string,
  ): Promise<void> {
    await this.logEvent({
      licenseId: license.id,
      eventType: LicenseHistoryEventType.RENEWED,
      description: `Licença renovada até ${newExpiryDate.toLocaleDateString('pt-BR')}`,
      oldData: { expiry_date: oldExpiryDate },
      newData: { expiry_date: newExpiryDate, license_status: license.license_status },
      userId,
    });
  }

  /**
   * Busca histórico de uma licença
   */
  async getHistory(
    licenseId: string,
    limit: number = 50,
  ): Promise<LicenseHistory[]> {
    return this.historyRepository.find({
      where: { license_id: licenseId },
      relations: ['resource'],
      order: { created_at: 'DESC' },
      take: limit,
    });
  }

  /**
   * Busca histórico por tipo de evento
   */
  async getHistoryByEventType(
    licenseId: string,
    eventType: LicenseHistoryEventType,
  ): Promise<LicenseHistory[]> {
    return this.historyRepository.find({
      where: { license_id: licenseId, event_type: eventType },
      relations: ['resource'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Extrai dados relevantes da licença para log
   */
  private extractLicenseData(license: ResourceLicense): Record<string, any> {
    return {
      product_name: license.product_name,
      license_type: license.license_type,
      license_status: license.license_status,
      is_perpetual: license.is_perpetual,
      expiry_date: license.expiry_date,
      activation_date: license.activation_date,
      duration_type: license.duration_type,
      duration_value: license.duration_value,
      max_activations: license.max_activations,
      current_activations: license.current_activations,
      client_id: license.client_id,
    };
  }

  /**
   * Identifica campos que mudaram
   */
  private getChangedFields(
    oldData: Partial<ResourceLicense>,
    newData: ResourceLicense,
  ): string[] {
    const trackFields = [
      'product_name',
      'license_type',
      'license_status',
      'license_key',
      'linked_email',
      'is_perpetual',
      'expiry_date',
      'activation_date',
      'duration_type',
      'duration_value',
      'max_activations',
      'vendor',
      'cost',
    ];

    const changed: string[] = [];
    for (const field of trackFields) {
      const oldVal = (oldData as any)[field];
      const newVal = (newData as any)[field];
      if (oldVal !== newVal) {
        changed.push(field);
      }
    }

    return changed;
  }
}
