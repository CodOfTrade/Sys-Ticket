import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Like, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Resource, ResourceType, ResourceStatus } from '../entities/resource.entity';
import { ResourceHistory, ResourceEventType } from '../entities/resource-history.entity';
import { CreateResourceDto } from '../dto/create-resource.dto';
import { UpdateResourceDto } from '../dto/update-resource.dto';
import { QueryResourceDto } from '../dto/query-resource.dto';

// Comandos permitidos para envio remoto
export enum RemoteCommand {
  UNINSTALL = 'uninstall',
  RESTART = 'restart',
  UPDATE = 'update',
  COLLECT_INFO = 'collect_info',
}

@Injectable()
export class ResourcesService {
  private readonly logger = new Logger(ResourcesService.name);

  constructor(
    @InjectRepository(Resource)
    private readonly resourceRepository: Repository<Resource>,
    @InjectRepository(ResourceHistory)
    private readonly historyRepository: Repository<ResourceHistory>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(createResourceDto: CreateResourceDto, createdByUserId?: string): Promise<Resource> {
    // Gerar código único do recurso
    const resourceCode = await this.generateResourceCode();

    const resource = this.resourceRepository.create({
      ...createResourceDto,
      resource_code: resourceCode,
    });

    const savedResource = await this.resourceRepository.save(resource);

    // Criar registro no histórico
    await this.createHistory(
      savedResource.id,
      ResourceEventType.CREATED,
      'Resource created',
      null,
      savedResource,
      createdByUserId,
    );

    return savedResource;
  }

  async findAll(query: QueryResourceDto): Promise<{ data: Resource[]; total: number; page: number; perPage: number }> {
    const { page = 1, perPage = 10, search, ...filters } = query;

    const where: FindOptionsWhere<Resource> = {};

    // Aplicar filtros
    if (filters.client_id) where.client_id = filters.client_id;
    if (filters.contract_id) where.contract_id = filters.contract_id;
    if (filters.resource_type) where.resource_type = filters.resource_type;
    if (filters.status) where.status = filters.status;
    if (filters.resource_group) where.resource_group = filters.resource_group;
    if (filters.location) where.location = filters.location;
    if (filters.department) where.department = filters.department;
    if (filters.is_online !== undefined) where.is_online = filters.is_online;

    // Busca por texto
    if (search) {
      const searchConditions = [
        { name: Like(`%${search}%`) },
        { resource_code: Like(`%${search}%`) },
        { hostname: Like(`%${search}%`) },
        { serial_number: Like(`%${search}%`) },
      ];
    }

    const [data, total] = await this.resourceRepository.findAndCount({
      where: search ? undefined : where,
      ...(search && {
        where: [
          { ...where, name: Like(`%${search}%`) },
          { ...where, resource_code: Like(`%${search}%`) },
          { ...where, hostname: Like(`%${search}%`) },
          { ...where, serial_number: Like(`%${search}%`) },
        ],
      }),
      order: { created_at: 'DESC' },
      skip: (page - 1) * perPage,
      take: perPage,
    });

    return {
      data,
      total,
      page,
      perPage,
    };
  }

  async findOne(id: string): Promise<Resource> {
    const resource = await this.resourceRepository.findOne({
      where: { id },
      relations: ['licenses', 'agent_tickets'],
    });

    if (!resource) {
      throw new NotFoundException(`Resource with ID ${id} not found`);
    }

    return resource;
  }

  async findByClientId(clientId: string): Promise<Resource[]> {
    return this.resourceRepository.find({
      where: { client_id: clientId },
      order: { created_at: 'DESC' },
    });
  }

  async findByContractId(contractId: string): Promise<Resource[]> {
    return this.resourceRepository.find({
      where: { contract_id: contractId },
      order: { created_at: 'DESC' },
    });
  }

  async findByAgentId(agentId: string): Promise<Resource | null> {
    return this.resourceRepository.findOne({
      where: { agent_id: agentId },
    });
  }

  async update(id: string, updateResourceDto: UpdateResourceDto, updatedByUserId?: string): Promise<Resource> {
    const resource = await this.findOne(id);
    const oldData = { ...resource };

    Object.assign(resource, updateResourceDto);
    const updatedResource = await this.resourceRepository.save(resource);

    // Criar registro no histórico
    await this.createHistory(
      resource.id,
      ResourceEventType.UPDATED,
      'Resource updated',
      oldData,
      updatedResource,
      updatedByUserId,
    );

    return updatedResource;
  }

  async updateHeartbeat(agentId: string): Promise<void> {
    await this.resourceRepository.update(
      { agent_id: agentId },
      {
        agent_last_heartbeat: new Date(),
        last_seen_at: new Date(),
        is_online: true,
      },
    );
  }

  async markOffline(resourceId: string): Promise<void> {
    await this.resourceRepository.update(
      { id: resourceId },
      { is_online: false },
    );
  }

  async retire(id: string, retiredByUserId?: string): Promise<Resource> {
    const resource = await this.findOne(id);

    resource.status = ResourceStatus.RETIRED;
    resource.retired_at = new Date();

    const retiredResource = await this.resourceRepository.save(resource);

    // Criar registro no histórico
    await this.createHistory(
      resource.id,
      ResourceEventType.RETIRED,
      'Resource retired',
      null,
      retiredResource,
      retiredByUserId,
    );

    return retiredResource;
  }

  async remove(id: string): Promise<void> {
    const resource = await this.findOne(id);
    await this.resourceRepository.remove(resource);
  }

  async getHistory(resourceId: string): Promise<ResourceHistory[]> {
    return this.historyRepository.find({
      where: { resource_id: resourceId },
      order: { created_at: 'DESC' },
    });
  }

  async getStats(clientId?: string): Promise<any> {
    const where: FindOptionsWhere<Resource> = {};
    if (clientId) where.client_id = clientId;

    const total = await this.resourceRepository.count({ where });
    const online = await this.resourceRepository.count({ where: { ...where, is_online: true } });
    const offline = await this.resourceRepository.count({ where: { ...where, is_online: false } });

    const byType = await this.resourceRepository
      .createQueryBuilder('resource')
      .select('resource.resource_type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where(clientId ? 'resource.client_id = :clientId' : '1=1', { clientId })
      .groupBy('resource.resource_type')
      .getRawMany();

    const byStatus = await this.resourceRepository
      .createQueryBuilder('resource')
      .select('resource.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where(clientId ? 'resource.client_id = :clientId' : '1=1', { clientId })
      .groupBy('resource.status')
      .getRawMany();

    return {
      total,
      online,
      offline,
      byType,
      byStatus,
    };
  }

  private async generateResourceCode(): Promise<string> {
    const count = await this.resourceRepository.count();
    const nextNumber = count + 1;
    return `REC-${nextNumber.toString().padStart(5, '0')}`;
  }

  private async createHistory(
    resourceId: string,
    eventType: ResourceEventType,
    description: string,
    oldData: any,
    newData: any,
    userId?: string,
    byAgent: boolean = false,
  ): Promise<void> {
    await this.historyRepository.save({
      resource_id: resourceId,
      event_type: eventType,
      event_description: description,
      old_data: oldData,
      new_data: newData,
      changed_by_user_id: userId,
      changed_by_agent: byAgent,
    });
  }

  /**
   * Envia um comando remoto para o agente
   */
  async sendCommand(
    resourceId: string,
    command: string,
    userId?: string,
  ): Promise<{ success: boolean; message: string }> {
    // Validar comando
    const validCommands = Object.values(RemoteCommand);
    if (!validCommands.includes(command as RemoteCommand)) {
      throw new BadRequestException(
        `Comando inválido. Comandos válidos: ${validCommands.join(', ')}`,
      );
    }

    const resource = await this.findOne(resourceId);

    // Verificar se tem agente instalado
    if (!resource.agent_id) {
      throw new BadRequestException('Este recurso não possui agente instalado');
    }

    // Verificar se já existe comando pendente
    if (resource.pending_command) {
      throw new BadRequestException(
        `Já existe um comando pendente: ${resource.pending_command}`,
      );
    }

    // Salvar comando pendente
    resource.pending_command = command;
    resource.pending_command_at = new Date();
    await this.resourceRepository.save(resource);

    // Registrar no histórico
    await this.createHistory(
      resourceId,
      ResourceEventType.COMMAND_SENT,
      `Comando remoto enviado: ${command}`,
      null,
      { command, sentAt: resource.pending_command_at },
      userId,
    );

    // Emitir evento WebSocket
    this.eventEmitter.emit('resource.command.sent', {
      resourceId: resource.id,
      command,
    });

    this.logger.log(
      `Comando '${command}' enviado para recurso ${resource.resource_code} (ID: ${resourceId})`,
    );

    return {
      success: true,
      message: `Comando '${command}' enviado com sucesso. Aguardando execução pelo agente.`,
    };
  }

  /**
   * Busca comando pendente para um agente
   */
  async getPendingCommand(agentId: string): Promise<{
    command: string | null;
    commandAt: Date | null;
  }> {
    const resource = await this.resourceRepository.findOne({
      where: { agent_id: agentId },
    });

    if (!resource) {
      throw new NotFoundException(`Agente não encontrado: ${agentId}`);
    }

    return {
      command: resource.pending_command,
      commandAt: resource.pending_command_at,
    };
  }

  /**
   * Confirma execução de comando pelo agente
   */
  async confirmCommandExecution(
    agentId: string,
    command: string,
    success: boolean,
    message?: string,
  ): Promise<void> {
    const resource = await this.resourceRepository.findOne({
      where: { agent_id: agentId },
    });

    if (!resource) {
      throw new NotFoundException(`Agente não encontrado: ${agentId}`);
    }

    const executedCommand = resource.pending_command;

    // Limpar comando pendente
    resource.pending_command = null;
    resource.pending_command_at = null;

    // Se foi uninstall bem-sucedido, limpar dados do agente
    if (success && command === RemoteCommand.UNINSTALL) {
      resource.agent_id = null;
      resource.agent_token = null;
      resource.agent_version = null;
      resource.agent_installed_at = null;
      resource.agent_last_heartbeat = null;
      resource.is_online = false;
      resource.status = ResourceStatus.INACTIVE;
    }

    await this.resourceRepository.save(resource);

    // Registrar no histórico
    await this.createHistory(
      resource.id,
      ResourceEventType.COMMAND_EXECUTED,
      `Comando '${executedCommand}' ${success ? 'executado com sucesso' : 'falhou'}: ${message || ''}`,
      null,
      { command: executedCommand, success, message },
      null,
      true,
    );

    // Emitir evento de atualização
    this.eventEmitter.emit('resource.updated', {
      resourceId: resource.id,
      changes: {
        commandExecuted: executedCommand,
        success,
        message,
      },
    });

    this.logger.log(
      `Comando '${executedCommand}' ${success ? 'executado' : 'falhou'} no recurso ${resource.resource_code}`,
    );
  }
}
