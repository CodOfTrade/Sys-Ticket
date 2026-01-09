import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketComment } from '../entities/ticket-comment.entity';
import { Ticket } from '../entities/ticket.entity';
import { CreateCommentDto, UpdateCommentDto } from '../dto/create-comment.dto';
import { EmailService } from '../../email/email.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TicketCommentsService {
  private readonly logger = new Logger(TicketCommentsService.name);

  constructor(
    @InjectRepository(TicketComment)
    private commentRepository: Repository<TicketComment>,
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  async create(userId: string, dto: CreateCommentDto, ticketId: string) {
    const comment = this.commentRepository.create({
      ...dto,
      ticket_id: ticketId,
      user_id: userId,
    });

    // Se marcar como enviado ao cliente, definir timestamp
    if (dto.sent_to_client) {
      comment.sent_at = new Date();
    }

    const savedComment = await this.commentRepository.save(comment);

    // Enviar email se send_to_client = true
    if (dto.sent_to_client) {
      await this.sendCommentNotificationEmail(savedComment);
    }

    return savedComment;
  }

  /**
   * Envia notificação de email quando um comentário é criado
   */
  private async sendCommentNotificationEmail(comment: TicketComment): Promise<void> {
    try {
      // Buscar ticket com relações necessárias
      const ticket = await this.ticketRepository.findOne({
        where: { id: comment.ticket_id },
        relations: ['client', 'assigned_to', 'created_by'],
      });

      if (!ticket || !ticket.client) {
        this.logger.warn(`Ticket ${comment.ticket_id} não encontrado ou sem cliente`);
        return;
      }

      // Buscar usuário que criou o comentário
      const commentWithUser = await this.commentRepository.findOne({
        where: { id: comment.id },
        relations: ['user'],
      });

      if (!commentWithUser || !commentWithUser.user) {
        this.logger.warn(`Usuário do comentário ${comment.id} não encontrado`);
        return;
      }

      // Email do cliente (assumindo que existe campo email no client)
      const clientEmail = ticket.client.email;
      if (!clientEmail) {
        this.logger.warn(`Cliente ${ticket.client.id} não possui email`);
        return;
      }

      // URL do frontend
      const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
      const ticketUrl = `${appUrl}/tickets/${ticket.id}`;

      // Enviar email
      await this.emailService.sendTicketCommentNotification(
        clientEmail,
        ticket.ticket_number,
        ticket.title,
        commentWithUser.user.name,
        comment.content,
        ticketUrl,
      );

      this.logger.log(`Email de comentário enviado para ${clientEmail} (Ticket #${ticket.ticket_number})`);
    } catch (error) {
      this.logger.error('Erro ao enviar email de notificação de comentário:', error);
      // Não lançar erro para não bloquear a criação do comentário
    }
  }

  async findAll(ticketId: string, type?: string) {
    const query = this.commentRepository
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.user', 'user')
      .where('comment.ticket_id = :ticketId', { ticketId })
      .orderBy('comment.created_at', 'ASC');

    if (type) {
      query.andWhere('comment.type = :type', { type });
    }

    return query.getMany();
  }

  async findOne(id: string) {
    const comment = await this.commentRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!comment) {
      throw new NotFoundException('Comentário não encontrado');
    }

    return comment;
  }

  async update(id: string, userId: string, dto: UpdateCommentDto) {
    const comment = await this.findOne(id);

    // Verificar se o usuário é o autor do comentário
    if (comment.user_id !== userId) {
      throw new ForbiddenException('Você não pode editar este comentário');
    }

    comment.content = dto.content;
    comment.is_edited = true;
    comment.edited_at = new Date();

    return this.commentRepository.save(comment);
  }

  async remove(id: string, userId: string) {
    const comment = await this.findOne(id);

    // Verificar se o usuário é o autor do comentário
    if (comment.user_id !== userId) {
      throw new ForbiddenException('Você não pode excluir este comentário');
    }

    await this.commentRepository.remove(comment);
    return { success: true, message: 'Comentário removido com sucesso' };
  }
}
