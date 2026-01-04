import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from './entities/ticket.entity';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private ticketsRepository: Repository<Ticket>,
  ) {}

  async findAll(): Promise<Ticket[]> {
    return this.ticketsRepository.find({
      take: 50,
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Ticket | null> {
    return this.ticketsRepository.findOne({ where: { id } });
  }

  async create(ticketData: Partial<Ticket>): Promise<Ticket> {
    const ticket = this.ticketsRepository.create(ticketData);
    return this.ticketsRepository.save(ticket);
  }

  async update(id: string, ticketData: Partial<Ticket>): Promise<Ticket | null> {
    await this.ticketsRepository.update(id, ticketData);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.ticketsRepository.delete(id);
  }
}
