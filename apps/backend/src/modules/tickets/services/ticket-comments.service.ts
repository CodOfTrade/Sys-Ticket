import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketComment } from '../entities/ticket-comment.entity';
import { CreateCommentDto, UpdateCommentDto } from '../dto/create-comment.dto';

@Injectable()
export class TicketCommentsService {
  constructor(
    @InjectRepository(TicketComment)
    private commentRepository: Repository<TicketComment>,
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

    return this.commentRepository.save(comment);
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
