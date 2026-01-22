import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, LessThanOrEqual, MoreThan } from 'typeorm';
import { ResourceLicense, LicenseStatus } from '../entities/resource-license.entity';
import { CreateLicenseDto } from '../dto/create-license.dto';
import { UpdateLicenseDto } from '../dto/update-license.dto';

@Injectable()
export class ResourceLicensesService {
  constructor(
    @InjectRepository(ResourceLicense)
    private readonly licenseRepository: Repository<ResourceLicense>,
  ) {}

  async create(createLicenseDto: CreateLicenseDto): Promise<ResourceLicense> {
    const license = this.licenseRepository.create(createLicenseDto);
    return this.licenseRepository.save(license);
  }

  async findAll(filters?: {
    client_id?: string;
    contract_id?: string;
    license_type?: string;
    license_status?: LicenseStatus;
  }): Promise<ResourceLicense[]> {
    const where: FindOptionsWhere<ResourceLicense> = {};

    if (filters?.client_id) where.client_id = filters.client_id;
    if (filters?.contract_id) where.contract_id = filters.contract_id;
    if (filters?.license_type) where.license_type = filters.license_type as any;
    if (filters?.license_status) where.license_status = filters.license_status;

    return this.licenseRepository.find({
      where,
      relations: ['resource'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string): Promise<ResourceLicense> {
    const license = await this.licenseRepository.findOne({
      where: { id },
      relations: ['resource'],
    });

    if (!license) {
      throw new NotFoundException(`License with ID ${id} not found`);
    }

    return license;
  }

  async update(id: string, updateLicenseDto: UpdateLicenseDto): Promise<ResourceLicense> {
    const license = await this.findOne(id);
    Object.assign(license, updateLicenseDto);
    return this.licenseRepository.save(license);
  }

  async remove(id: string): Promise<void> {
    const license = await this.findOne(id);
    await this.licenseRepository.remove(license);
  }

  async assignToResource(licenseId: string, resourceId: string): Promise<ResourceLicense> {
    const license = await this.findOne(licenseId);

    if (license.resource_id) {
      throw new BadRequestException('License is already assigned to a resource');
    }

    if (license.max_activations && license.current_activations >= license.max_activations) {
      throw new BadRequestException('License activation limit reached');
    }

    license.resource_id = resourceId;
    license.license_status = LicenseStatus.ASSIGNED;
    license.activated_at = new Date();
    license.current_activations += 1;

    return this.licenseRepository.save(license);
  }

  async unassignFromResource(licenseId: string): Promise<ResourceLicense> {
    const license = await this.findOne(licenseId);

    if (!license.resource_id) {
      throw new BadRequestException('License is not assigned to any resource');
    }

    license.resource_id = null;
    license.license_status = LicenseStatus.AVAILABLE;
    license.deactivated_at = new Date();
    license.current_activations = Math.max(0, license.current_activations - 1);

    return this.licenseRepository.save(license);
  }

  async findAvailableByContract(contractId: string): Promise<ResourceLicense[]> {
    return this.licenseRepository.find({
      where: {
        contract_id: contractId,
        license_status: LicenseStatus.AVAILABLE,
      },
      order: { created_at: 'DESC' },
    });
  }

  async findExpiringSoon(days: number = 30): Promise<ResourceLicense[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return this.licenseRepository.find({
      where: {
        is_perpetual: false,
        expiry_date: LessThanOrEqual(futureDate),
        license_status: LicenseStatus.ASSIGNED,
      },
      relations: ['resource'],
      order: { expiry_date: 'ASC' },
    });
  }

  async getStatsByContract(contractId: string): Promise<any> {
    const total = await this.licenseRepository.count({
      where: { contract_id: contractId },
    });

    const assigned = await this.licenseRepository.count({
      where: { contract_id: contractId, license_status: LicenseStatus.ASSIGNED },
    });

    const available = await this.licenseRepository.count({
      where: { contract_id: contractId, license_status: LicenseStatus.AVAILABLE },
    });

    const expired = await this.licenseRepository.count({
      where: { contract_id: contractId, license_status: LicenseStatus.EXPIRED },
    });

    return {
      total,
      assigned,
      available,
      expired,
    };
  }
}
