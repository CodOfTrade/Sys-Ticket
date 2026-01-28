import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, LessThanOrEqual, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ResourceLicense, LicenseStatus, DurationType } from '../entities/resource-license.entity';
import { LicenseDeviceAssignment } from '../entities/license-device-assignment.entity';
import { Resource } from '../entities/resource.entity';
import { CreateLicenseDto } from '../dto/create-license.dto';
import { UpdateLicenseDto } from '../dto/update-license.dto';

@Injectable()
export class ResourceLicensesService {
  constructor(
    @InjectRepository(ResourceLicense)
    private readonly licenseRepository: Repository<ResourceLicense>,
    @InjectRepository(LicenseDeviceAssignment)
    private readonly assignmentRepository: Repository<LicenseDeviceAssignment>,
    @InjectRepository(Resource)
    private readonly resourceRepository: Repository<Resource>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private calculateExpiryDate(activationDate: Date, durationType: DurationType, durationValue: number): Date {
    const date = new Date(activationDate);
    if (durationType === DurationType.MONTHS) {
      date.setMonth(date.getMonth() + durationValue);
    } else if (durationType === DurationType.YEARS) {
      date.setFullYear(date.getFullYear() + durationValue);
    }
    return date;
  }

  async create(createLicenseDto: CreateLicenseDto): Promise<ResourceLicense> {
    const data: any = { ...createLicenseDto };

    // Calcular expiry_date se tiver duração definida
    if (!data.is_perpetual && data.activation_date && data.duration_type && data.duration_value) {
      data.expiry_date = this.calculateExpiryDate(
        new Date(data.activation_date),
        data.duration_type,
        data.duration_value
      ).toISOString().split('T')[0];
    }

    const license = this.licenseRepository.create(data);
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
      relations: ['resource', 'client', 'device_assignments', 'device_assignments.resource'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string): Promise<ResourceLicense> {
    const license = await this.licenseRepository.findOne({
      where: { id },
      relations: ['resource', 'client', 'device_assignments', 'device_assignments.resource'],
    });

    if (!license) {
      throw new NotFoundException(`Licenca com ID ${id} nao encontrada`);
    }

    return license;
  }

  async update(id: string, updateLicenseDto: UpdateLicenseDto): Promise<ResourceLicense> {
    const license = await this.findOne(id);

    // Mesclar dados
    const merged: any = { ...license, ...updateLicenseDto };

    // Recalcular expiry_date se dados de duração mudaram
    if (!merged.is_perpetual && merged.activation_date && merged.duration_type && merged.duration_value) {
      merged.expiry_date = this.calculateExpiryDate(
        new Date(merged.activation_date),
        merged.duration_type,
        merged.duration_value
      );
    }

    Object.assign(license, merged);
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

    // Buscar recurso para validar cliente
    const resource = await this.resourceRepository.findOne({ where: { id: resourceId } });
    if (!resource) {
      throw new NotFoundException('Recurso nao encontrado');
    }

    // Validar que licenca e recurso pertencem ao mesmo cliente
    if (license.client_id !== resource.client_id) {
      throw new BadRequestException('Licenca e recurso devem pertencer ao mesmo cliente');
    }

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

    // Atualizar licenca usando update direto para evitar problemas com relacoes
    const updateData: any = {
      current_activations: license.current_activations + 1,
      license_status: LicenseStatus.ASSIGNED,
    };

    if (!license.activated_at) {
      updateData.activated_at = new Date();
    }

    // Manter compatibilidade: Se e a primeira atribuicao, definir resource_id
    if (!license.resource_id) {
      updateData.resource_id = resourceId;
    }

    await this.licenseRepository.update(licenseId, updateData);

    // Buscar licenca atualizada
    const updatedLicense = await this.findOne(licenseId);

    // Emitir evento WebSocket
    this.eventEmitter.emit('license.assigned', {
      licenseId,
      resourceId,
      license: updatedLicense,
    });

    return updatedLicense;
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

    // Calcular nova contagem
    const newActivations = Math.max(0, license.current_activations - 1);
    const updateData: any = {
      current_activations: newActivations,
    };

    // Se nao tem mais dispositivos, marcar como disponivel
    if (newActivations === 0) {
      updateData.license_status = LicenseStatus.AVAILABLE;
      updateData.resource_id = null;
      updateData.deactivated_at = new Date();
    } else if (license.resource_id === resourceId) {
      // Se era o resource_id principal, pegar outro
      const remainingAssignment = await this.assignmentRepository.findOne({
        where: { license_id: licenseId },
      });
      updateData.resource_id = remainingAssignment?.resource_id || null;
    }

    await this.licenseRepository.update(licenseId, updateData);

    // Buscar licenca atualizada
    const updatedLicense = await this.findOne(licenseId);

    // Emitir evento WebSocket
    this.eventEmitter.emit('license.unassigned', {
      licenseId,
      resourceId,
      license: updatedLicense,
    });

    return updatedLicense;
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

  /**
   * Busca licencas disponiveis por cliente.
   * Licencas pertencem ao CLIENTE, independente de contrato.
   * Filtra apenas licencas com ativacoes disponiveis.
   */
  async findAvailableLicenses(params: { clientId: string }): Promise<ResourceLicense[]> {
    const { clientId } = params;

    if (!clientId) {
      return [];
    }

    // Busca SEMPRE por cliente, independente de contrato
    const licenses = await this.licenseRepository.find({
      where: { client_id: clientId },
      relations: ['client'],
      order: { created_at: 'DESC' },
    });

    // Filtrar: licencas sem limite OU com ativacoes restantes
    return licenses.filter(l => {
      if (!l.max_activations) return true;
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
      relations: ['resource', 'client'],
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
