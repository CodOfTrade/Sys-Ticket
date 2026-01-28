import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, LessThanOrEqual, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as ExcelJS from 'exceljs';
import { ResourceLicense, LicenseStatus, DurationType } from '../entities/resource-license.entity';
import { LicenseDeviceAssignment } from '../entities/license-device-assignment.entity';
import { Resource } from '../entities/resource.entity';
import { CreateLicenseDto } from '../dto/create-license.dto';
import { UpdateLicenseDto } from '../dto/update-license.dto';
import { LicenseHistoryService } from './license-history.service';
import { LicenseHistory } from '../entities/license-history.entity';

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
    private readonly historyService: LicenseHistoryService,
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
    const data = { ...createLicenseDto } as Partial<ResourceLicense>;

    // Calcular expiry_date se tiver duração definida
    if (!data.is_perpetual && data.activation_date && data.duration_type && data.duration_value) {
      data.expiry_date = this.calculateExpiryDate(
        new Date(data.activation_date as unknown as Date),
        data.duration_type,
        data.duration_value
      );
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
    Object.assign(license, updateLicenseDto);

    // Recalcular expiry_date se dados de duração mudaram
    if (!license.is_perpetual && license.activation_date && license.duration_type && license.duration_value) {
      license.expiry_date = this.calculateExpiryDate(
        new Date(license.activation_date),
        license.duration_type,
        license.duration_value
      );
    }

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

    // Validar status da licença - não permitir atribuir licenças expiradas ou suspensas
    if (license.license_status === LicenseStatus.EXPIRED) {
      throw new BadRequestException('Nao e possivel atribuir uma licenca expirada');
    }
    if (license.license_status === LicenseStatus.SUSPENDED) {
      throw new BadRequestException('Nao e possivel atribuir uma licenca suspensa');
    }

    // Validar se a licença já expirou (caso o status ainda não tenha sido atualizado)
    if (!license.is_perpetual && license.expiry_date) {
      const now = new Date();
      const expiryDate = new Date(license.expiry_date);
      if (expiryDate < now) {
        throw new BadRequestException('Nao e possivel atribuir uma licenca com data de validade expirada');
      }
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

  /**
   * Renova/estende uma licença
   * Permite adicionar mais tempo à licença existente
   */
  async renewLicense(
    id: string,
    renewData: {
      duration_type?: DurationType;
      duration_value?: number;
      new_activation_date?: string;
      extend_from_current?: boolean;
    },
    userId?: string,
  ): Promise<ResourceLicense> {
    const license = await this.findOne(id);

    if (license.is_perpetual) {
      throw new BadRequestException('Licencas perpetuas nao precisam de renovacao');
    }

    const oldExpiryDate = license.expiry_date;

    // Definir nova data de ativação
    let newActivationDate: Date;
    if (renewData.new_activation_date) {
      newActivationDate = new Date(renewData.new_activation_date);
    } else if (renewData.extend_from_current && license.expiry_date) {
      // Estender a partir da data de expiração atual
      newActivationDate = new Date(license.expiry_date);
    } else {
      // Usar data atual
      newActivationDate = new Date();
    }

    // Usar durações fornecidas ou manter as atuais
    const durationType = renewData.duration_type || license.duration_type;
    const durationValue = renewData.duration_value || license.duration_value;

    if (!durationType || !durationValue) {
      throw new BadRequestException('Tipo e valor de duracao sao obrigatorios para renovacao');
    }

    // Calcular nova data de expiração
    const newExpiryDate = this.calculateExpiryDate(newActivationDate, durationType, durationValue);

    // Atualizar licença
    license.activation_date = newActivationDate;
    license.expiry_date = newExpiryDate;
    license.duration_type = durationType;
    license.duration_value = durationValue;

    // Se estava expirada, reativar
    if (license.license_status === LicenseStatus.EXPIRED) {
      license.license_status = license.current_activations > 0
        ? LicenseStatus.ASSIGNED
        : LicenseStatus.AVAILABLE;
    }

    const saved = await this.licenseRepository.save(license);

    // Registrar no histórico
    await this.historyService.logRenewed(saved, oldExpiryDate, newExpiryDate, userId);

    // Emitir evento WebSocket
    this.eventEmitter.emit('license.updated', { licenseId: saved.id });

    return saved;
  }

  /**
   * Suspende uma licença
   */
  async suspendLicense(id: string, reason?: string, userId?: string): Promise<ResourceLicense> {
    const license = await this.findOne(id);
    const oldStatus = license.license_status;

    license.license_status = LicenseStatus.SUSPENDED;

    const saved = await this.licenseRepository.save(license);

    // Registrar no histórico
    await this.historyService.logStatusChange(saved, oldStatus, LicenseStatus.SUSPENDED, false, userId);

    // Emitir evento WebSocket
    this.eventEmitter.emit('license.updated', { licenseId: saved.id });

    return saved;
  }

  /**
   * Reativa uma licença suspensa
   */
  async reactivateLicense(id: string, userId?: string): Promise<ResourceLicense> {
    const license = await this.findOne(id);

    if (license.license_status !== LicenseStatus.SUSPENDED) {
      throw new BadRequestException('Apenas licencas suspensas podem ser reativadas');
    }

    // Verificar se não está expirada
    if (!license.is_perpetual && license.expiry_date) {
      const now = new Date();
      if (new Date(license.expiry_date) < now) {
        throw new BadRequestException('Licenca esta expirada. Renove antes de reativar');
      }
    }

    const oldStatus = license.license_status;
    license.license_status = license.current_activations > 0
      ? LicenseStatus.ASSIGNED
      : LicenseStatus.AVAILABLE;

    const saved = await this.licenseRepository.save(license);

    // Registrar no histórico
    await this.historyService.logStatusChange(saved, oldStatus, license.license_status, false, userId);

    // Emitir evento WebSocket
    this.eventEmitter.emit('license.updated', { licenseId: saved.id });

    return saved;
  }

  /**
   * Retorna histórico de alterações da licença
   */
  async getHistory(licenseId: string, limit: number = 50): Promise<LicenseHistory[]> {
    return this.historyService.getHistory(licenseId, limit);
  }

  /**
   * Estatísticas gerais de licenças (não por contrato)
   */
  async getGeneralStats(): Promise<any> {
    const licenses = await this.licenseRepository.find();

    const total = licenses.length;
    const available = licenses.filter(l => l.license_status === LicenseStatus.AVAILABLE).length;
    const assigned = licenses.filter(l => l.license_status === LicenseStatus.ASSIGNED).length;
    const expired = licenses.filter(l => l.license_status === LicenseStatus.EXPIRED).length;
    const suspended = licenses.filter(l => l.license_status === LicenseStatus.SUSPENDED).length;
    const perpetual = licenses.filter(l => l.is_perpetual).length;

    // Licenças por tipo
    const byType = licenses.reduce((acc, l) => {
      acc[l.license_type] = (acc[l.license_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Custo total
    const totalCost = licenses.reduce((sum, l) => sum + (l.cost || 0), 0);

    // Licenças expirando em 30 dias
    const now = new Date();
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);

    const expiringSoon = licenses.filter(l => {
      if (l.is_perpetual || !l.expiry_date) return false;
      const expiry = new Date(l.expiry_date);
      return expiry > now && expiry <= thirtyDays;
    }).length;

    return {
      total,
      available,
      assigned,
      expired,
      suspended,
      perpetual,
      expiringSoon,
      byType,
      totalCost,
    };
  }

  /**
   * Exporta licenças para Excel
   */
  async exportToExcel(filters?: {
    client_id?: string;
    license_status?: string;
    license_type?: string;
  }): Promise<Buffer> {
    const licenses = await this.findAll(filters as any);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sys-Ticket';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Licenças', {
      properties: { tabColor: { argb: '4F81BD' } },
    });

    // Definir colunas
    sheet.columns = [
      { header: 'Produto', key: 'product_name', width: 30 },
      { header: 'Versão', key: 'product_version', width: 12 },
      { header: 'Cliente', key: 'client_name', width: 30 },
      { header: 'Tipo', key: 'license_type', width: 15 },
      { header: 'Status', key: 'license_status', width: 12 },
      { header: 'Tipo Ativação', key: 'activation_type', width: 15 },
      { header: 'Chave', key: 'license_key', width: 35 },
      { header: 'Email Vinculado', key: 'linked_email', width: 30 },
      { header: 'Fornecedor', key: 'vendor', width: 20 },
      { header: 'Custo (R$)', key: 'cost', width: 12 },
      { header: 'Data Ativação', key: 'activation_date', width: 15 },
      { header: 'Data Expiração', key: 'expiry_date', width: 15 },
      { header: 'Perpétua', key: 'is_perpetual', width: 10 },
      { header: 'Ativações', key: 'activations', width: 12 },
      { header: 'Criada em', key: 'created_at', width: 18 },
    ];

    // Estilo do cabeçalho
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '4F81BD' },
    };
    sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Mapeamento de labels
    const typeLabels: Record<string, string> = {
      windows: 'Windows',
      office: 'Office',
      antivirus: 'Antivírus',
      custom: 'Personalizada',
    };

    const statusLabels: Record<string, string> = {
      available: 'Disponível',
      assigned: 'Atribuída',
      expired: 'Expirada',
      suspended: 'Suspensa',
    };

    const activationTypeLabels: Record<string, string> = {
      serial: 'Chave Serial',
      account: 'Conta/Email',
      hybrid: 'Híbrido',
    };

    // Adicionar dados
    licenses.forEach((license) => {
      const row = sheet.addRow({
        product_name: license.product_name,
        product_version: license.product_version || '-',
        client_name: license.client?.nome || license.client?.nomeFantasia || '-',
        license_type: typeLabels[license.license_type] || license.license_type,
        license_status: statusLabels[license.license_status] || license.license_status,
        activation_type: activationTypeLabels[license.activation_type] || license.activation_type || '-',
        license_key: license.license_key || '-',
        linked_email: license.linked_email || '-',
        vendor: license.vendor || '-',
        cost: license.cost ? Number(license.cost).toFixed(2) : '-',
        activation_date: license.activation_date
          ? new Date(license.activation_date).toLocaleDateString('pt-BR')
          : '-',
        expiry_date: license.is_perpetual
          ? 'Perpétua'
          : license.expiry_date
            ? new Date(license.expiry_date).toLocaleDateString('pt-BR')
            : '-',
        is_perpetual: license.is_perpetual ? 'Sim' : 'Não',
        activations: `${license.current_activations}/${license.max_activations || '∞'}`,
        created_at: new Date(license.created_at).toLocaleString('pt-BR'),
      });

      // Colorir linha baseado no status
      if (license.license_status === LicenseStatus.EXPIRED) {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFEBEE' },
          };
        });
      } else if (license.license_status === LicenseStatus.SUSPENDED) {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8E1' },
          };
        });
      }
    });

    // Adicionar bordas
    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    // Adicionar filtro automático
    sheet.autoFilter = {
      from: 'A1',
      to: `O${licenses.length + 1}`,
    };

    // Congelar linha de cabeçalho
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
