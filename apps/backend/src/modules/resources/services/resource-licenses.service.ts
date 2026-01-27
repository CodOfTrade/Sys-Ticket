import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, LessThanOrEqual, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ResourceLicense, LicenseStatus } from '../entities/resource-license.entity';
import { LicenseDeviceAssignment } from '../entities/license-device-assignment.entity';
import { CreateLicenseDto } from '../dto/create-license.dto';
import { UpdateLicenseDto } from '../dto/update-license.dto';

@Injectable()
export class ResourceLicensesService {
  constructor(
    @InjectRepository(ResourceLicense)
    private readonly licenseRepository: Repository<ResourceLicense>,
    @InjectRepository(LicenseDeviceAssignment)
    private readonly assignmentRepository: Repository<LicenseDeviceAssignment>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(createLicenseDto: CreateLicenseDto): Promise<ResourceLicense> {
    const license = this.licenseRepository.create(createLicenseDto);
    const saved = await this.licenseRepository.save(license);

    // Emitir evento WebSocket
    this.eventEmitter.emit('license.created', { licenseId: saved.id });

    return saved;
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
      relations: ['resource', 'device_assignments', 'device_assignments.resource'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string): Promise<ResourceLicense> {
    const license = await this.licenseRepository.findOne({
      where: { id },
      relations: ['resource', 'device_assignments', 'device_assignments.resource'],
    });

    if (!license) {
      throw new NotFoundException(`Licenca com ID ${id} nao encontrada`);
    }

    return license;
  }

  async update(id: string, updateLicenseDto: UpdateLicenseDto): Promise<ResourceLicense> {
    const license = await this.findOne(id);
    Object.assign(license, updateLicenseDto);
    const saved = await this.licenseRepository.save(license);

    // Emitir evento WebSocket
    this.eventEmitter.emit('license.updated', { licenseId: saved.id });

    return saved;
  }

  async remove(id: string): Promise<void> {
    const license = await this.findOne(id);
    await this.licenseRepository.remove(license);

    // Emitir evento WebSocket
    this.eventEmitter.emit('license.deleted', { licenseId: id });
  }

  /**
   * Atribui licenca a um dispositivo (suporta multi-dispositivo)
   */
  async assignToResource(licenseId: string, resourceId: string, userId?: string): Promise<ResourceLicense> {
    const license = await this.findOne(licenseId);

    // Verificar se ja esta atribuida a este dispositivo
    const existingAssignment = await this.assignmentRepository.findOne({
      where: { license_id: licenseId, resource_id: resourceId },
    });

    if (existingAssignment) {
      throw new BadRequestException('Licenca ja esta atribuida a este dispositivo');
    }

    // Verificar limite de ativacoes
    if (license.max_activations && license.current_activations >= license.max_activations) {
      throw new BadRequestException(`Limite de ativacoes atingido (${license.max_activations})`);
    }

    // Criar assignment
    const assignment = this.assignmentRepository.create({
      license_id: licenseId,
      resource_id: resourceId,
      assigned_by: userId,
    });
    await this.assignmentRepository.save(assignment);

    // Atualizar licenca
    license.current_activations += 1;
    license.license_status = LicenseStatus.ASSIGNED;
    if (!license.activated_at) {
      license.activated_at = new Date();
    }

    // Manter compatibilidade: Se e a primeira atribuicao, definir resource_id
    if (!license.resource_id) {
      license.resource_id = resourceId;
    }

    return this.licenseRepository.save(license);
  }

  /**
   * Remove licenca de um dispositivo
   */
  async unassignFromResource(licenseId: string, resourceId: string): Promise<ResourceLicense> {
    const license = await this.findOne(licenseId);

    // Encontrar o assignment
    const assignment = await this.assignmentRepository.findOne({
      where: { license_id: licenseId, resource_id: resourceId },
    });

    if (!assignment) {
      throw new BadRequestException('Licenca nao esta atribuida a este dispositivo');
    }

    // Remover assignment
    await this.assignmentRepository.remove(assignment);

    // Atualizar licenca
    license.current_activations = Math.max(0, license.current_activations - 1);

    // Se nao tem mais dispositivos, marcar como disponivel
    if (license.current_activations === 0) {
      license.license_status = LicenseStatus.AVAILABLE;
      license.resource_id = null;
      license.deactivated_at = new Date();
    } else if (license.resource_id === resourceId) {
      // Se era o resource_id principal, pegar outro
      const remainingAssignment = await this.assignmentRepository.findOne({
        where: { license_id: licenseId },
      });
      license.resource_id = remainingAssignment?.resource_id || null;
    }

    return this.licenseRepository.save(license);
  }

  /**
   * Lista dispositivos atribuidos a uma licenca
   */
  async getAssignedDevices(licenseId: string): Promise<LicenseDeviceAssignment[]> {
    return this.assignmentRepository.find({
      where: { license_id: licenseId },
      relations: ['resource'],
      order: { assigned_at: 'DESC' },
    });
  }

  /**
   * Lista licencas atribuidas a um dispositivo
   */
  async getLicensesByResource(resourceId: string): Promise<ResourceLicense[]> {
    const assignments = await this.assignmentRepository.find({
      where: { resource_id: resourceId },
      select: ['license_id'],
    });

    if (assignments.length === 0) {
      return [];
    }

    const licenseIds = assignments.map(a => a.license_id);
    return this.licenseRepository.find({
      where: { id: In(licenseIds) },
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Licencas disponiveis do contrato que podem ser atribuidas
   */
  async findAvailableByContract(contractId: string): Promise<ResourceLicense[]> {
    // Retornar licencas com ativacoes disponiveis
    const licenses = await this.licenseRepository.find({
      where: { contract_id: contractId },
      order: { created_at: 'DESC' },
    });

    // Filtrar: licencas sem limite OU com ativacoes restantes
    return licenses.filter(l => {
      if (!l.max_activations) return true; // Sem limite
      return l.current_activations < l.max_activations;
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
    const licenses = await this.licenseRepository.find({
      where: { contract_id: contractId },
    });

    let totalCapacity = 0;
    let totalUsed = 0;

    for (const license of licenses) {
      totalCapacity += license.max_activations || 1;
      totalUsed += license.current_activations;
    }

    const total = licenses.length;
    const assigned = licenses.filter(l => l.license_status === LicenseStatus.ASSIGNED).length;
    const available = licenses.filter(l => {
      if (l.license_status !== LicenseStatus.AVAILABLE && l.license_status !== LicenseStatus.ASSIGNED) return false;
      if (!l.max_activations) return true;
      return l.current_activations < l.max_activations;
    }).length;
    const expired = licenses.filter(l => l.license_status === LicenseStatus.EXPIRED).length;

    return {
      total,
      assigned,
      available,
      expired,
      totalCapacity,
      totalUsed,
      utilizationPercent: totalCapacity > 0 ? Math.round((totalUsed / totalCapacity) * 100) : 0,
    };
  }
}
