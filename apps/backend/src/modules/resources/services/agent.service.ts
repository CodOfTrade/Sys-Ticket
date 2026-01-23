import { Injectable, Logger, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Resource, ResourceType, ResourceStatus } from '../entities/resource.entity';
import { AgentTicket } from '../entities/agent-ticket.entity';
import { Ticket, TicketStatus, TicketPriority, TicketType } from '../../tickets/entities/ticket.entity';
import { ServiceDesk } from '../../service-desks/entities/service-desk.entity';
import { ClientsService } from '../../clients/clients.service';
import {
  RegisterAgentDto,
  HeartbeatDto,
  UpdateInventoryDto,
  CreateAgentTicketDto,
} from '../dto/agent.dto';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    @InjectRepository(Resource)
    private resourceRepository: Repository<Resource>,
    @InjectRepository(AgentTicket)
    private agentTicketRepository: Repository<AgentTicket>,
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    @InjectRepository(ServiceDesk)
    private serviceDeskRepository: Repository<ServiceDesk>,
    @Inject(forwardRef(() => ClientsService))
    private clientsService: ClientsService,
  ) {}

  /**
   * Gera um código de recurso único
   */
  private async generateResourceCode(): Promise<string> {
    const year = new Date().getFullYear();
    const result = await this.resourceRepository
      .createQueryBuilder('resource')
      .select('MAX(CAST(SUBSTRING(resource.resource_code FROM \'[0-9]+$\') AS INTEGER))', 'maxNumber')
      .where('resource.resource_code LIKE :pattern', { pattern: `RES-${year}-%` })
      .getRawOne();

    const nextNumber = (result?.maxNumber || 0) + 1;
    const paddedNumber = String(nextNumber).padStart(6, '0');
    return `RES-${year}-${paddedNumber}`;
  }

  /**
   * Gera um número de ticket único
   */
  private async generateTicketNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const result = await this.ticketRepository
      .createQueryBuilder('ticket')
      .select('MAX(CAST(SUBSTRING(ticket.ticket_number FROM \'[0-9]+$\') AS INTEGER))', 'maxNumber')
      .where('ticket.ticket_number LIKE :pattern', { pattern: `TKT-${year}-%` })
      .getRawOne();

    const nextNumber = (result?.maxNumber || 0) + 1;
    const paddedNumber = String(nextNumber).padStart(6, '0');
    return `TKT-${year}-${paddedNumber}`;
  }

  /**
   * Gera um token seguro para o agente
   */
  private generateAgentToken(): string {
    return `agt_${randomUUID().replace(/-/g, '')}`;
  }

  /**
   * Registra um novo agente ou atualiza um existente
   */
  async registerAgent(dto: RegisterAgentDto): Promise<{
    agentId: string;
    agentToken: string;
    resourceId: string;
    resourceCode: string;
  }> {
    const { systemInfo } = dto;

    // Verificar se já existe um recurso com este hostname e cliente
    let resource = await this.resourceRepository.findOne({
      where: {
        hostname: systemInfo.os.hostname,
        client_id: dto.clientId,
      },
    });

    if (resource) {
      // Atualizar agente existente
      this.logger.log(`Atualizando agente existente: ${resource.agent_id}`);

      // Se não tem agent_id, gerar um novo
      if (!resource.agent_id) {
        resource.agent_id = randomUUID();
      }

      // Gerar novo token
      resource.agent_token = this.generateAgentToken();
      resource.agent_installed_at = new Date();
      resource.agent_last_heartbeat = new Date();
      resource.is_online = true;
      resource.status = ResourceStatus.ACTIVE;

      // Atualizar informações do sistema
      this.updateResourceFromSystemInfo(resource, systemInfo);

      await this.resourceRepository.save(resource);
    } else {
      // Criar novo recurso
      this.logger.log(`Registrando novo agente para cliente: ${dto.clientId}`);

      let resourceCode: string;

      // Se código customizado foi fornecido, validar unicidade
      if (dto.resourceCode) {
        const existing = await this.resourceRepository.findOne({
          where: { resource_code: dto.resourceCode }
        });

        if (existing) {
          throw new BadRequestException(
            `Código do recurso '${dto.resourceCode}' já está em uso`
          );
        }

        resourceCode = dto.resourceCode;
      } else {
        // Gerar automaticamente
        resourceCode = await this.generateResourceCode();
      }

      const agentId = randomUUID();
      const agentToken = this.generateAgentToken();

      resource = this.resourceRepository.create({
        resource_code: resourceCode,
        name: dto.machineName || systemInfo.os.hostname,
        resource_type: ResourceType.COMPUTER,
        client_id: dto.clientId,
        contract_id: dto.contractId,
        location: dto.location,
        department: dto.department,
        assigned_user_name: dto.assignedUserName,
        assigned_user_email: dto.assignedUserEmail,
        status: ResourceStatus.ACTIVE,
        is_online: true,
        hostname: systemInfo.os.hostname,
        agent_id: agentId,
        agent_token: agentToken,
        agent_installed_at: new Date(),
        agent_last_heartbeat: new Date(),
      });

      // Preencher informações do sistema
      this.updateResourceFromSystemInfo(resource, systemInfo);

      await this.resourceRepository.save(resource);
    }

    // Criar/vincular contato se email fornecido
    if (dto.assignedUserEmail && dto.clientId) {
      try {
        const contact = await this.clientsService.findOrCreateContactByEmail(
          dto.clientId,
          dto.assignedUserEmail,
          dto.assignedUserName,
          dto.department,
          dto.assignedUserPhone
        );

        resource.assigned_contact_id = contact.id;
        await this.resourceRepository.save(resource);
        this.logger.log(`Contato vinculado ao recurso: ${contact.id}`);
      } catch (error) {
        this.logger.error('Erro ao criar/vincular contato', error);
        // Não lançar erro - registro do agente deve continuar
      }
    }

    return {
      agentId: resource.agent_id,
      agentToken: resource.agent_token,
      resourceId: resource.id,
      resourceCode: resource.resource_code,
    };
  }

  /**
   * Atualiza o Resource com informações do sistema
   */
  private updateResourceFromSystemInfo(resource: Resource, systemInfo: any): void {
    // SO
    resource.os_name = systemInfo.os.distro;
    resource.os_version = systemInfo.os.release;
    resource.os_architecture = systemInfo.os.arch;

    // Rede
    if (systemInfo.network?.interfaces?.length > 0) {
      const primaryInterface = systemInfo.network.interfaces.find((i: any) => i.ip4 && i.ip4 !== '127.0.0.1') || systemInfo.network.interfaces[0];
      resource.ip_address = primaryInterface?.ip4;
      resource.mac_address = primaryInterface?.mac;
    }

    // CPU
    if (systemInfo.cpu) {
      resource.manufacturer = systemInfo.cpu.manufacturer;
      resource.model = systemInfo.cpu.brand;
    }

    // Antivírus
    if (systemInfo.antivirus) {
      resource.antivirus_name = systemInfo.antivirus.name;
    }

    // Specs completas
    resource.specifications = {
      cpu: systemInfo.cpu,
      memory: systemInfo.memory,
      disks: systemInfo.disks,
      network: systemInfo.network,
      os: systemInfo.os,
    };
  }

  /**
   * Processa heartbeat do agente
   */
  async processHeartbeat(dto: HeartbeatDto): Promise<void> {
    const resource = await this.resourceRepository.findOne({
      where: { agent_id: dto.agentId },
    });

    if (!resource) {
      throw new NotFoundException(`Agente não encontrado: ${dto.agentId}`);
    }

    resource.agent_last_heartbeat = new Date();
    resource.is_online = true;
    resource.last_seen_at = new Date();

    // Atualizar metadata com status rápido
    resource.metadata = {
      ...resource.metadata,
      lastQuickStatus: dto.quickStatus,
      lastHeartbeat: dto.timestamp,
    };

    await this.resourceRepository.save(resource);
    this.logger.debug(`Heartbeat recebido de ${dto.agentId}`);
  }

  /**
   * Atualiza inventário completo do sistema
   */
  async updateInventory(dto: UpdateInventoryDto): Promise<void> {
    const resource = await this.resourceRepository.findOne({
      where: { agent_id: dto.agentId },
    });

    if (!resource) {
      throw new NotFoundException(`Agente não encontrado: ${dto.agentId}`);
    }

    this.updateResourceFromSystemInfo(resource, dto.systemInfo);
    resource.agent_last_heartbeat = new Date();
    resource.is_online = true;

    await this.resourceRepository.save(resource);
    this.logger.log(`Inventário atualizado para agente: ${dto.agentId}`);
  }

  /**
   * Cria um ticket a partir do agente
   */
  async createTicket(dto: CreateAgentTicketDto): Promise<{
    ticketId: string;
    ticketNumber: string;
    chatWebSocketUrl: string;
  }> {
    // Buscar o recurso/agente
    const resource = await this.resourceRepository.findOne({
      where: { agent_id: dto.agentId },
    });

    if (!resource) {
      throw new NotFoundException(`Agente não encontrado: ${dto.agentId}`);
    }

    // Buscar uma mesa de serviço ativa (primeira disponível)
    const serviceDesk = await this.serviceDeskRepository.findOne({
      where: { is_active: true },
    });

    if (!serviceDesk) {
      throw new BadRequestException('Nenhuma mesa de serviço disponível');
    }

    // Mapear prioridade
    const priorityMap: Record<string, TicketPriority> = {
      low: TicketPriority.LOW,
      medium: TicketPriority.MEDIUM,
      high: TicketPriority.HIGH,
      critical: TicketPriority.URGENT,
      urgent: TicketPriority.URGENT,
    };

    const priority = priorityMap[dto.priority.toLowerCase()] || TicketPriority.MEDIUM;

    // Gerar número do ticket
    const ticketNumber = await this.generateTicketNumber();

    // Buscar dados do cliente para nome correto
    let clientData: any = null;
    try {
      clientData = await this.clientsService.findOne(resource.client_id);
    } catch (error) {
      this.logger.warn(`Não foi possível buscar dados do cliente ${resource.client_id}`, error);
    }

    // Criar o ticket
    const ticket = this.ticketRepository.create({
      ticket_number: ticketNumber,
      client_id: resource.client_id,
      client_name: clientData?.nome || clientData?.razao_social || resource.client_id,
      requester_name: resource.assigned_user_name || `Usuário de ${resource.hostname}`,
      requester_email: resource.assigned_user_email,
      contact_id: resource.assigned_contact_id, // Vincular contato
      resource_id: resource.id, // Vincular recurso/dispositivo
      title: dto.title,
      description: dto.description,
      priority: priority,
      type: TicketType.REMOTE,
      category: dto.category || 'Suporte via Agente',
      status: TicketStatus.NEW,
      service_desk_id: serviceDesk.id,
      contract_id: resource.contract_id,
      metadata: {
        source: 'agent',
        agentId: dto.agentId,
        resourceId: resource.id,
        hasScreenshot: dto.hasScreenshot,
        systemInfoAtCreation: dto.systemInfo,
      },
    });

    await this.ticketRepository.save(ticket);

    // Criar o registro AgentTicket
    const agentTicket = this.agentTicketRepository.create({
      ticket_id: ticket.id,
      resource_id: resource.id,
      agent_id: dto.agentId,
      machine_name: resource.hostname,
      user_name: resource.assigned_user_name,
      user_email: resource.assigned_user_email,
      has_screenshot: dto.hasScreenshot,
      system_info: dto.systemInfo,
    });

    await this.agentTicketRepository.save(agentTicket);

    // TODO: Salvar screenshot se existir
    // if (dto.hasScreenshot && dto.screenshotBase64) {
    //   // Implementar salvamento do screenshot
    // }

    this.logger.log(`Ticket ${ticketNumber} criado via agente ${dto.agentId}`);

    return {
      ticketId: ticket.id,
      ticketNumber: ticket.ticket_number,
      chatWebSocketUrl: `/ws/tickets/${ticket.id}`, // URL do WebSocket para chat
    };
  }

  /**
   * Lista tickets do agente
   */
  async getAgentTickets(agentId: string): Promise<any[]> {
    const agentTickets = await this.agentTicketRepository.find({
      where: { agent_id: agentId },
      relations: ['ticket'],
      order: { created_at: 'DESC' },
    });

    return agentTickets.map(at => ({
      id: at.ticket.id,
      ticketNumber: at.ticket.ticket_number,
      title: at.ticket.title,
      status: at.ticket.status,
      priority: at.ticket.priority,
      createdAt: at.ticket.created_at,
      updatedAt: at.ticket.updated_at,
    }));
  }
}
