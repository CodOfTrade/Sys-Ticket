import { Injectable, Logger, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import { Resource, ResourceType, ResourceStatus, AntivirusStatus } from '../entities/resource.entity';
import { AgentTicket } from '../entities/agent-ticket.entity';
import { Ticket, TicketStatus, TicketPriority, TicketType } from '../../tickets/entities/ticket.entity';
import { ServiceDesk } from '../../service-desks/entities/service-desk.entity';
import { SigeClient } from '../../clients/entities/sige-client.entity';
import { ClientsService } from '../../clients/clients.service';
import { ContractQuotasService } from './contract-quotas.service';
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
    @InjectRepository(SigeClient)
    private sigeClientRepository: Repository<SigeClient>,
    @Inject(forwardRef(() => ClientsService))
    private clientsService: ClientsService,
    private eventEmitter: EventEmitter2,
    private contractQuotasService: ContractQuotasService,
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
   * Valida se um cliente/contrato pode registrar novos agentes
   * Usado para validação prévia antes de preencher dados da máquina
   */
  async validateCanRegister(
    clientId: string,
    contractId?: string,
  ): Promise<{ canRegister: boolean; message: string }> {
    // Buscar cliente
    const sigeClient = await this.sigeClientRepository.findOne({
      where: { sigeId: clientId },
    });

    if (!sigeClient) {
      return {
        canRegister: false,
        message: 'Cliente não encontrado no sistema',
      };
    }

    // Se cliente tem liberação ilimitada, pode registrar
    if (sigeClient.allowUnlimitedAgents) {
      return {
        canRegister: true,
        message: 'Cliente com liberação ilimitada de agentes',
      };
    }

    // Verificar se tem contrato definido
    if (!contractId) {
      return {
        canRegister: false,
        message: 'Este cliente não possui contrato ativo. Entre em contato com o administrador para registrar novos agentes.',
      };
    }

    // Validar cota do contrato
    const quotaValidation = await this.contractQuotasService.validateQuotaDetailed(
      contractId,
      ResourceType.COMPUTER,
    );

    if (!quotaValidation.allowed) {
      if (quotaValidation.reason === 'no_quota') {
        return {
          canRegister: false,
          message: 'Este cliente não possui cota de recursos configurada. Entre em contato com o administrador para liberar o registro de agentes.',
        };
      } else if (quotaValidation.reason === 'exceeded') {
        return {
          canRegister: false,
          message: 'A cota de computadores foi excedida para este contrato. Entre em contato com o administrador.',
        };
      }
    }

    return {
      canRegister: true,
      message: 'Cliente pode registrar novos agentes',
    };
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

    // Flag para controlar se deve incrementar a cota (apenas para novos registros)
    let shouldIncrementQuota = false;

    // Validação de cota apenas para novos recursos
    if (!resource) {
      // Buscar cliente para verificar se tem liberação ilimitada
      const sigeClient = await this.sigeClientRepository.findOne({
        where: { sigeId: dto.clientId },
      });

      if (!sigeClient) {
        throw new BadRequestException('Cliente não encontrado no sistema');
      }

      // Se cliente não tem liberação ilimitada, validar cota
      if (!sigeClient.allowUnlimitedAgents) {
        // Verificar se tem contrato definido
        if (!dto.contractId) {
          throw new BadRequestException(
            'Cliente não possui contrato ativo. Não é possível registrar novos agentes sem contrato.'
          );
        }

        // Validar cota do contrato com detalhes
        const quotaValidation = await this.contractQuotasService.validateQuotaDetailed(
          dto.contractId,
          ResourceType.COMPUTER
        );

        if (!quotaValidation.allowed) {
          if (quotaValidation.reason === 'no_quota') {
            throw new BadRequestException(
              'Este cliente não possui cota de recursos configurada. Entre em contato com o administrador.'
            );
          } else if (quotaValidation.reason === 'exceeded') {
            throw new BadRequestException(
              'Cota de computadores excedida para este contrato. Entre em contato com o administrador.'
            );
          }
        }

        // Marcar para incrementar a cota após registro bem-sucedido
        shouldIncrementQuota = true;
      } else {
        this.logger.log(`Cliente ${sigeClient.nome} tem liberação ilimitada de agentes`);
      }
    }

    if (resource) {
      // Atualizar agente existente
      this.logger.log(`Atualizando agente existente: ${resource.agent_id}`);

      // Se não tem agent_id, gerar um novo
      if (!resource.agent_id) {
        resource.agent_id = randomUUID();
      }

      // Gerar novo token
      resource.agent_token = this.generateAgentToken();
      resource.agent_version = dto.agentVersion || '1.0.0';
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
        agent_version: dto.agentVersion || '1.0.0',
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
        // Buscar UUID local do cliente (dto.clientId é o SIGE ID)
        const sigeClient = await this.sigeClientRepository.findOne({
          where: { sigeId: dto.clientId }
        });

        if (sigeClient) {
          // Usar UUID local (id) do cliente, NÃO o SIGE ID
          const contact = await this.clientsService.findOrCreateContactByEmail(
            sigeClient.id,  // UUID local
            dto.assignedUserEmail,
            dto.assignedUserName,
            dto.department,
            dto.assignedUserPhone
          );

          resource.assigned_contact_id = contact.id;
          await this.resourceRepository.save(resource);
          this.logger.log(`Contato vinculado ao recurso: ${contact.id} (client UUID: ${sigeClient.id})`);
        } else {
          this.logger.warn(`Cliente com SIGE ID ${dto.clientId} não encontrado no banco local`);
        }
      } catch (error) {
        this.logger.error('Erro ao criar/vincular contato', error);
        // Não lançar erro - registro do agente deve continuar
      }
    }

    // Emitir evento para WebSocket
    this.eventEmitter.emit('resource.registered', {
      resourceId: resource.id,
      resourceCode: resource.resource_code,
      clientId: resource.client_id,
      hostname: resource.hostname,
    });

    // Incrementar uso da cota (apenas para novos registros com contrato)
    if (shouldIncrementQuota && dto.contractId) {
      try {
        await this.contractQuotasService.incrementUsage(dto.contractId, ResourceType.COMPUTER);
        this.logger.log(`Cota de computadores incrementada para contrato ${dto.contractId}`);
      } catch (error) {
        // Não falhar o registro se não conseguir incrementar (pode não ter cota configurada)
        this.logger.warn(`Não foi possível incrementar cota para contrato ${dto.contractId}:`, error);
      }
    }

    return {
      agentId: resource.agent_id!,
      agentToken: resource.agent_token!,
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
      resource.antivirus_last_updated = new Date();

      // Determinar status baseado em enabled e upToDate
      if (!systemInfo.antivirus.enabled) {
        resource.antivirus_status = AntivirusStatus.INACTIVE;
      } else if (!systemInfo.antivirus.upToDate) {
        resource.antivirus_status = AntivirusStatus.OUTDATED;
      } else {
        resource.antivirus_status = AntivirusStatus.ACTIVE;
      }
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

    // Emitir evento para WebSocket
    this.eventEmitter.emit('resource.heartbeat', {
      resourceId: resource.id,
      quickStatus: dto.quickStatus,
      timestamp: dto.timestamp,
    });
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

  /**
   * Busca comando pendente para um agente
   */
  async getPendingCommand(agentId: string): Promise<{
    command: string | null | undefined;
    commandAt: Date | null | undefined;
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
    if (success && command === 'uninstall') {
      resource.agent_id = null;
      resource.agent_token = null;
      resource.agent_version = null;
      resource.agent_installed_at = null;
      resource.agent_last_heartbeat = null;
      resource.is_online = false;
      resource.status = ResourceStatus.INACTIVE;
    }

    await this.resourceRepository.save(resource);

    // Emitir evento específico de execução de comando
    this.eventEmitter.emit('resource.command.executed', {
      resourceId: resource.id,
      command: executedCommand,
      success,
      message,
      executedAt: new Date(),
    });

    // Também emitir evento genérico de atualização para compatibilidade
    this.eventEmitter.emit('resource.updated', {
      resourceId: resource.id,
    });

    const statusText = success ? 'executado com sucesso' : 'falhou';
    const messageDetail = message ? ` - ${message}` : '';
    this.logger.log(
      `Comando '${executedCommand}' ${statusText} no recurso ${resource.resource_code} (ID: ${resource.id})${messageDetail}`,
    );
  }
}
