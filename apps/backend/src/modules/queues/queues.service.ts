import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Queue } from './entities/queue.entity';
import { User, UserRole, UserStatus } from '../users/entities/user.entity';
import { Ticket, TicketStatus } from '../tickets/entities/ticket.entity';
import { CreateQueueDto, UpdateQueueDto, AssignToQueueDto } from './dto';
import { DistributionStrategy } from './enums/distribution-strategy.enum';

@Injectable()
export class QueuesService {
  private readonly logger = new Logger(QueuesService.name);

  constructor(
    @InjectRepository(Queue)
    private readonly queueRepository: Repository<Queue>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
  ) {}

  /**
   * CRUD - Create Queue
   */
  async create(createQueueDto: CreateQueueDto): Promise<Queue> {
    const { member_ids, ...queueData } = createQueueDto;

    // Criar fila
    const queue = this.queueRepository.create({
      ...queueData,
      auto_assignment_config: createQueueDto.auto_assignment_config || {
        enabled: false,
        on_ticket_create: false,
        on_ticket_status_change: false,
        max_tickets_per_member: null,
        priority_weight: false,
        skills_matching: false,
      },
    });

    // Se tiver member_ids, buscar e adicionar membros
    if (member_ids && member_ids.length > 0) {
      const members = await this.userRepository.find({
        where: { id: In(member_ids) },
      });

      if (members.length !== member_ids.length) {
        throw new BadRequestException('Um ou mais usuários não encontrados');
      }

      // Validar que os usuários são agentes
      const invalidUsers = members.filter(
        (user) => user.role === UserRole.CLIENT,
      );
      if (invalidUsers.length > 0) {
        throw new BadRequestException(
          'Apenas usuários com role AGENT, MANAGER ou ADMIN podem ser membros de filas',
        );
      }

      queue.members = members;
    }

    return await this.queueRepository.save(queue);
  }

  /**
   * CRUD - Find All Queues
   */
  async findAll(serviceDeskId?: string): Promise<Queue[]> {
    const where: any = {};
    if (serviceDeskId) {
      where.service_desk_id = serviceDeskId;
    }

    return await this.queueRepository.find({
      where,
      relations: ['members', 'service_desk'],
      order: { display_order: 'ASC', name: 'ASC' },
    });
  }

  /**
   * CRUD - Find One Queue
   */
  async findOne(id: string): Promise<Queue> {
    const queue = await this.queueRepository.findOne({
      where: { id },
      relations: ['members', 'service_desk'],
    });

    if (!queue) {
      throw new NotFoundException(`Fila ${id} não encontrada`);
    }

    return queue;
  }

  /**
   * CRUD - Update Queue
   */
  async update(id: string, updateQueueDto: UpdateQueueDto): Promise<Queue> {
    const queue = await this.findOne(id);

    const { member_ids, ...updateData } = updateQueueDto;

    // Atualizar campos básicos
    Object.assign(queue, updateData);

    // Se tiver member_ids, atualizar membros
    if (member_ids !== undefined) {
      if (member_ids.length === 0) {
        queue.members = [];
      } else {
        const members = await this.userRepository.find({
          where: { id: In(member_ids) },
        });

        if (members.length !== member_ids.length) {
          throw new BadRequestException('Um ou mais usuários não encontrados');
        }

        // Validar que os usuários são agentes
        const invalidUsers = members.filter(
          (user) => user.role === UserRole.CLIENT,
        );
        if (invalidUsers.length > 0) {
          throw new BadRequestException(
            'Apenas usuários com role AGENT, MANAGER ou ADMIN podem ser membros de filas',
          );
        }

        queue.members = members;
      }
    }

    return await this.queueRepository.save(queue);
  }

  /**
   * CRUD - Remove Queue
   */
  async remove(id: string): Promise<void> {
    const queue = await this.findOne(id);

    // Verificar se há tickets atribuídos a esta fila
    const ticketsCount = await this.ticketRepository.count({
      where: { queue_id: id },
    });

    if (ticketsCount > 0) {
      throw new BadRequestException(
        `Não é possível deletar a fila. Existem ${ticketsCount} tickets atribuídos a ela.`,
      );
    }

    await this.queueRepository.remove(queue);
  }

  /**
   * Add Member to Queue
   */
  async addMember(queueId: string, userId: string): Promise<Queue> {
    const queue = await this.findOne(queueId);
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(`Usuário ${userId} não encontrado`);
    }

    if (user.role === UserRole.CLIENT) {
      throw new BadRequestException('Clientes não podem ser membros de filas');
    }

    // Verificar se já é membro
    const isMember = queue.members.some((m) => m.id === userId);
    if (isMember) {
      throw new BadRequestException('Usuário já é membro desta fila');
    }

    queue.members.push(user);
    return await this.queueRepository.save(queue);
  }

  /**
   * Remove Member from Queue
   */
  async removeMember(queueId: string, userId: string): Promise<Queue> {
    const queue = await this.findOne(queueId);

    queue.members = queue.members.filter((m) => m.id !== userId);
    return await this.queueRepository.save(queue);
  }

  /**
   * Atribuir ticket a uma fila e opcionalmente distribuir para um membro
   */
  async assignTicketToQueue(
    ticketId: string,
    assignDto: AssignToQueueDto,
    userId: string,
  ): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
      relations: ['queue'],
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket ${ticketId} não encontrado`);
    }

    const queue = await this.findOne(assignDto.queue_id);

    // Verificar se a fila pertence à mesma service_desk do ticket
    if (queue.service_desk_id !== ticket.service_desk_id) {
      throw new BadRequestException(
        'Fila pertence a uma mesa de serviço diferente',
      );
    }

    // Atribuir ticket à fila
    ticket.queue_id = queue.id;

    // Se auto_assign_to_member = true, distribuir para um membro
    if (assignDto.auto_assign_to_member !== false) {
      const assignedUserId = await this.distributeTicket(queue, ticket);
      if (assignedUserId) {
        ticket.assigned_to_id = assignedUserId;
      }
    }

    return await this.ticketRepository.save(ticket);
  }

  /**
   * Distribuir ticket para um membro da fila baseado na estratégia
   */
  async distributeTicket(queue: Queue, ticket: Ticket): Promise<string | null> {
    // Se não há membros na fila, não pode distribuir
    if (!queue.members || queue.members.length === 0) {
      this.logger.warn(`Fila ${queue.id} não tem membros para distribuir`);
      return null;
    }

    // Filtrar apenas membros ativos
    const activeMembers = queue.members.filter(
      (m) => m.status === UserStatus.ACTIVE,
    );

    if (activeMembers.length === 0) {
      this.logger.warn(`Fila ${queue.id} não tem membros ativos`);
      return null;
    }

    // Distribuir baseado na estratégia
    switch (queue.distribution_strategy) {
      case DistributionStrategy.ROUND_ROBIN:
        return await this.distributeRoundRobin(queue, activeMembers);

      case DistributionStrategy.LOAD_BALANCE:
        return await this.distributeLoadBalance(activeMembers);

      case DistributionStrategy.SKILL_BASED:
        // TODO: Implementar distribuição baseada em skills (futuro)
        this.logger.warn('Distribuição baseada em skills ainda não implementada');
        return await this.distributeRoundRobin(queue, activeMembers);

      case DistributionStrategy.MANUAL:
      default:
        // Manual: não distribuir automaticamente
        return null;
    }
  }

  /**
   * Estratégia Round-robin: distribui em ordem rotativa
   */
  private async distributeRoundRobin(
    queue: Queue,
    members: User[],
  ): Promise<string> {
    // Pegar índice atual e incrementar
    const currentIndex = queue.round_robin_index % members.length;
    const selectedMember = members[currentIndex];

    // Atualizar índice para próxima atribuição
    queue.round_robin_index = (currentIndex + 1) % members.length;
    await this.queueRepository.save(queue);

    this.logger.log(
      `Round-robin: Ticket atribuído a ${selectedMember.name} (index: ${currentIndex})`,
    );

    return selectedMember.id;
  }

  /**
   * Estratégia Load Balance: distribui para o membro com menos tickets ativos
   */
  private async distributeLoadBalance(members: User[]): Promise<string> {
    const memberIds = members.map((m) => m.id);

    // Contar tickets ativos por membro
    const ticketCounts = await this.ticketRepository
      .createQueryBuilder('ticket')
      .select('ticket.assigned_to_id', 'user_id')
      .addSelect('COUNT(ticket.id)', 'count')
      .where('ticket.assigned_to_id IN (:...memberIds)', { memberIds })
      .andWhere('ticket.status NOT IN (:...closedStatuses)', {
        closedStatuses: [TicketStatus.RESOLVED, TicketStatus.CANCELLED, TicketStatus.APPROVED],
      })
      .groupBy('ticket.assigned_to_id')
      .getRawMany();

    // Criar map de user_id -> count
    const countMap = new Map<string, number>();
    ticketCounts.forEach((row) => {
      countMap.set(row.user_id, parseInt(row.count));
    });

    // Encontrar membro com menor count
    let minCount = Infinity;
    let selectedMember: User = members[0];

    for (const member of members) {
      const count = countMap.get(member.id) || 0;
      if (count < minCount) {
        minCount = count;
        selectedMember = member;
      }
    }

    this.logger.log(
      `Load balance: Ticket atribuído a ${selectedMember.name} (${minCount} tickets ativos)`,
    );

    return selectedMember.id;
  }

  /**
   * Obter estatísticas de uma fila
   */
  async getQueueStats(queueId: string): Promise<{
    total_tickets: number;
    tickets_by_status: Record<string, number>;
    tickets_by_member: Record<string, { name: string; count: number }>;
  }> {
    const queue = await this.findOne(queueId);

    // Total de tickets na fila
    const totalTickets = await this.ticketRepository.count({
      where: { queue_id: queueId },
    });

    // Tickets por status
    const ticketsByStatus = await this.ticketRepository
      .createQueryBuilder('ticket')
      .select('ticket.status', 'status')
      .addSelect('COUNT(ticket.id)', 'count')
      .where('ticket.queue_id = :queueId', { queueId })
      .groupBy('ticket.status')
      .getRawMany();

    const statusMap: Record<string, number> = {};
    ticketsByStatus.forEach((row) => {
      statusMap[row.status] = parseInt(row.count);
    });

    // Tickets por membro
    const ticketsByMember = await this.ticketRepository
      .createQueryBuilder('ticket')
      .leftJoin('ticket.assigned_to', 'user')
      .select('user.id', 'user_id')
      .addSelect('user.name', 'user_name')
      .addSelect('COUNT(ticket.id)', 'count')
      .where('ticket.queue_id = :queueId', { queueId })
      .andWhere('ticket.assigned_to_id IS NOT NULL')
      .andWhere('ticket.status NOT IN (:...closedStatuses)', {
        closedStatuses: [TicketStatus.RESOLVED, TicketStatus.CANCELLED, TicketStatus.APPROVED],
      })
      .groupBy('user.id')
      .addGroupBy('user.name')
      .getRawMany();

    const memberMap: Record<string, { name: string; count: number }> = {};
    ticketsByMember.forEach((row) => {
      memberMap[row.user_id] = {
        name: row.user_name,
        count: parseInt(row.count),
      };
    });

    return {
      total_tickets: totalTickets,
      tickets_by_status: statusMap,
      tickets_by_member: memberMap,
    };
  }
}
