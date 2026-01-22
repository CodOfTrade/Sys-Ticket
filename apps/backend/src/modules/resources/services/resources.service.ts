import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Like, In } from 'typeorm';
import { Resource, ResourceType, ResourceStatus } from '../entities/resource.entity';
import { ResourceHistory, ResourceEventType } from '../entities/resource-history.entity';
import { CreateResourceDto } from '../dto/create-resource.dto';
import { UpdateResourceDto } from '../dto/update-resource.dto';
import { QueryResourceDto } from '../dto/query-resource.dto';

@Injectable()
export class ResourcesService {
  constructor(
    @InjectRepository(Resource)
    private readonly resourceRepository: Repository<Resource>,
    @InjectRepository(ResourceHistory)
    private readonly historyRepository: Repository<ResourceHistory>,
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
}
