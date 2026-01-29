import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContractResourceQuota } from '../entities/contract-resource-quota.entity';
import { Resource, ResourceType } from '../entities/resource.entity';
import { ResourceLicense, LicenseType, LicenseStatus } from '../entities/resource-license.entity';
import { CreateQuotaDto } from '../dto/create-quota.dto';
import { UpdateQuotaDto } from '../dto/update-quota.dto';

@Injectable()
export class ContractQuotasService {
  constructor(
    @InjectRepository(ContractResourceQuota)
    private readonly quotaRepository: Repository<ContractResourceQuota>,
    @InjectRepository(Resource)
    private readonly resourceRepository: Repository<Resource>,
    @InjectRepository(ResourceLicense)
    private readonly licenseRepository: Repository<ResourceLicense>,
  ) {}

  async create(createQuotaDto: CreateQuotaDto): Promise<ContractResourceQuota> {
    const existing = await this.quotaRepository.findOne({
      where: { contract_id: createQuotaDto.contract_id },
    });

    if (existing) {
      throw new BadRequestException('Quota already exists for this contract');
    }

    const quota = this.quotaRepository.create(createQuotaDto);
    return this.quotaRepository.save(quota);
  }

  async findByContractId(contractId: string): Promise<ContractResourceQuota> {
    const quota = await this.quotaRepository.findOne({
      where: { contract_id: contractId },
    });

    if (!quota) {
      throw new NotFoundException(`Quota for contract ${contractId} not found`);
    }

    return quota;
  }

  async update(id: string, updateQuotaDto: UpdateQuotaDto): Promise<ContractResourceQuota> {
    const quota = await this.quotaRepository.findOne({ where: { id } });

    if (!quota) {
      throw new NotFoundException(`Quota with ID ${id} not found`);
    }

    Object.assign(quota, updateQuotaDto);
    return this.quotaRepository.save(quota);
  }

  async getUsage(contractId: string): Promise<any> {
    const quota = await this.findByContractId(contractId);

    const usage = {
      computers: {
        quota: quota.computers_quota,
        used: quota.computers_used,
        available: quota.computers_quota - quota.computers_used,
        percentage: quota.computers_quota > 0 ? (quota.computers_used / quota.computers_quota) * 100 : 0,
      },
      printers: {
        quota: quota.printers_quota,
        used: quota.printers_used,
        available: quota.printers_quota - quota.printers_used,
        percentage: quota.printers_quota > 0 ? (quota.printers_used / quota.printers_quota) * 100 : 0,
      },
      monitors: {
        quota: quota.monitors_quota,
        used: quota.monitors_used,
        available: quota.monitors_quota - quota.monitors_used,
        percentage: quota.monitors_quota > 0 ? (quota.monitors_used / quota.monitors_quota) * 100 : 0,
      },
      servers: {
        quota: quota.servers_quota,
        used: quota.servers_used,
        available: quota.servers_quota - quota.servers_used,
        percentage: quota.servers_quota > 0 ? (quota.servers_used / quota.servers_quota) * 100 : 0,
      },
      windows_licenses: {
        quota: quota.windows_licenses_quota,
        used: quota.windows_licenses_used,
        available: quota.windows_licenses_quota - quota.windows_licenses_used,
        percentage: quota.windows_licenses_quota > 0 ? (quota.windows_licenses_used / quota.windows_licenses_quota) * 100 : 0,
      },
      office_licenses: {
        quota: quota.office_licenses_quota,
        used: quota.office_licenses_used,
        available: quota.office_licenses_quota - quota.office_licenses_used,
        percentage: quota.office_licenses_quota > 0 ? (quota.office_licenses_used / quota.office_licenses_quota) * 100 : 0,
      },
      antivirus_licenses: {
        quota: quota.antivirus_licenses_quota,
        used: quota.antivirus_licenses_used,
        available: quota.antivirus_licenses_quota - quota.antivirus_licenses_used,
        percentage: quota.antivirus_licenses_quota > 0 ? (quota.antivirus_licenses_used / quota.antivirus_licenses_quota) * 100 : 0,
      },
    };

    return {
      quota,
      usage,
      alerts: this.checkAlerts(usage, quota.alert_threshold),
    };
  }

  async recalculateUsage(contractId: string): Promise<ContractResourceQuota> {
    const quota = await this.findByContractId(contractId);

    // Recalcular recursos físicos
    quota.computers_used = await this.resourceRepository.count({
      where: { contract_id: contractId, resource_type: ResourceType.COMPUTER },
    });

    quota.printers_used = await this.resourceRepository.count({
      where: { contract_id: contractId, resource_type: ResourceType.PRINTER },
    });

    quota.monitors_used = await this.resourceRepository.count({
      where: { contract_id: contractId, resource_type: ResourceType.MONITOR },
    });

    quota.servers_used = await this.resourceRepository.count({
      where: { contract_id: contractId, resource_type: ResourceType.SERVER },
    });

    // Recalcular licenças
    quota.windows_licenses_used = await this.licenseRepository.count({
      where: {
        contract_id: contractId,
        license_type: LicenseType.WINDOWS,
        license_status: LicenseStatus.ASSIGNED,
      },
    });

    quota.office_licenses_used = await this.licenseRepository.count({
      where: {
        contract_id: contractId,
        license_type: LicenseType.OFFICE,
        license_status: LicenseStatus.ASSIGNED,
      },
    });

    quota.antivirus_licenses_used = await this.licenseRepository.count({
      where: {
        contract_id: contractId,
        license_type: LicenseType.ANTIVIRUS,
        license_status: LicenseStatus.ASSIGNED,
      },
    });

    return this.quotaRepository.save(quota);
  }

  /**
   * Verifica se existe cota configurada para um contrato
   */
  async hasQuota(contractId: string): Promise<boolean> {
    const quota = await this.quotaRepository.findOne({
      where: { contract_id: contractId },
    });
    return !!quota;
  }

  /**
   * Valida cota com informações detalhadas
   */
  async validateQuotaDetailed(contractId: string, resourceType: ResourceType): Promise<{
    allowed: boolean;
    reason: 'no_quota' | 'exceeded' | 'ok' | 'unlimited';
  }> {
    const quota = await this.quotaRepository.findOne({
      where: { contract_id: contractId },
    });

    // Se não há cota configurada para o contrato
    if (!quota) {
      return { allowed: false, reason: 'no_quota' };
    }

    const quotaField = this.getQuotaField(resourceType, 'quota');
    const usedField = this.getQuotaField(resourceType, 'used');

    if (!quotaField || !usedField) {
      return { allowed: true, reason: 'ok' };
    }

    const quotaValue = quota[quotaField];
    const usedValue = quota[usedField];

    // Quota ilimitada (valor 0)
    if (quotaValue === 0) {
      return { allowed: true, reason: 'unlimited' };
    }

    // Cota excedida
    if (usedValue >= quotaValue) {
      if (quota.allow_exceed) {
        return { allowed: true, reason: 'ok' };
      }
      return { allowed: false, reason: 'exceeded' };
    }

    return { allowed: true, reason: 'ok' };
  }

  async validateQuota(contractId: string, resourceType: ResourceType): Promise<boolean> {
    const result = await this.validateQuotaDetailed(contractId, resourceType);
    return result.allowed;
  }

  async incrementUsage(contractId: string, resourceType: ResourceType): Promise<void> {
    try {
      const quota = await this.findByContractId(contractId);
      const usedField = this.getQuotaField(resourceType, 'used');

      if (usedField) {
        quota[usedField] += 1;
        await this.quotaRepository.save(quota);
      }
    } catch (error) {
      // Se não há quota, ignora
    }
  }

  async decrementUsage(contractId: string, resourceType: ResourceType): Promise<void> {
    try {
      const quota = await this.findByContractId(contractId);
      const usedField = this.getQuotaField(resourceType, 'used');

      if (usedField) {
        quota[usedField] = Math.max(0, quota[usedField] - 1);
        await this.quotaRepository.save(quota);
      }
    } catch (error) {
      // Se não há quota, ignora
    }
  }

  private getQuotaField(resourceType: ResourceType, suffix: 'quota' | 'used'): string | null {
    const map = {
      [ResourceType.COMPUTER]: `computers_${suffix}`,
      [ResourceType.PRINTER]: `printers_${suffix}`,
      [ResourceType.MONITOR]: `monitors_${suffix}`,
      [ResourceType.SERVER]: `servers_${suffix}`,
    };

    return map[resourceType] || null;
  }

  private checkAlerts(usage: any, threshold: number): string[] {
    const alerts: string[] = [];

    Object.keys(usage).forEach(key => {
      const item = usage[key];
      if (item.percentage >= threshold) {
        alerts.push(`${key} quota is at ${item.percentage.toFixed(1)}% (${item.used}/${item.quota})`);
      }
    });

    return alerts;
  }
}
