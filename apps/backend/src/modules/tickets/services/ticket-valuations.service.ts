import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketValuation } from '../entities/ticket-valuation.entity';
import {
  CreateValuationDto,
  UpdateValuationDto,
  ApproveValuationDto,
} from '../dto/create-valuation.dto';

@Injectable()
export class TicketValuationsService {
  constructor(
    @InjectRepository(TicketValuation)
    private valuationRepository: Repository<TicketValuation>,
  ) {}

  /**
   * Criar valorização
   */
  async create(userId: string, dto: CreateValuationDto) {
    const quantity = dto.quantity || 1;
    const unitPrice = dto.unit_price;
    const totalAmount = quantity * unitPrice;

    // Calcular desconto
    const discountPercent = dto.discount_percent || 0;
    const discountAmount = (totalAmount * discountPercent) / 100;

    // Calcular imposto
    const taxPercent = dto.tax_percent || 0;
    const afterDiscount = totalAmount - discountAmount;
    const taxAmount = (afterDiscount * taxPercent) / 100;

    // Calcular valor final
    const finalAmount = afterDiscount + taxAmount;

    const valuation = this.valuationRepository.create({
      ...dto,
      created_by_id: userId,
      quantity,
      total_amount: totalAmount,
      discount_amount: discountAmount,
      tax_amount: taxAmount,
      final_amount: finalAmount,
    });

    return this.valuationRepository.save(valuation);
  }

  /**
   * Listar valorizações de um ticket
   */
  async findAll(ticketId: string, category?: string) {
    const query = this.valuationRepository
      .createQueryBuilder('valuation')
      .leftJoinAndSelect('valuation.created_by', 'created_by')
      .where('valuation.ticket_id = :ticketId', { ticketId })
      .orderBy('valuation.valuation_date', 'DESC');

    if (category) {
      query.andWhere('valuation.category = :category', { category });
    }

    return query.getMany();
  }

  /**
   * Buscar valorização por ID
   */
  async findOne(id: string) {
    const valuation = await this.valuationRepository.findOne({
      where: { id },
      relations: ['created_by'],
    });

    if (!valuation) {
      throw new NotFoundException('Valorização não encontrada');
    }

    return valuation;
  }

  /**
   * Atualizar valorização
   */
  async update(id: string, userId: string, dto: UpdateValuationDto) {
    const valuation = await this.findOne(id);

    // Atualizar campos
    if (dto.description) valuation.description = dto.description;
    if (dto.quantity) valuation.quantity = dto.quantity;
    if (dto.unit_price) valuation.unit_price = dto.unit_price;
    if (dto.discount_percent !== undefined)
      valuation.discount_percent = dto.discount_percent;
    if (dto.notes) valuation.notes = dto.notes;

    // Recalcular valores
    const quantity = valuation.quantity;
    const unitPrice = valuation.unit_price;
    const totalAmount = quantity * unitPrice;

    const discountPercent = valuation.discount_percent;
    const discountAmount = (totalAmount * discountPercent) / 100;

    const taxPercent = valuation.tax_percent;
    const afterDiscount = totalAmount - discountAmount;
    const taxAmount = (afterDiscount * taxPercent) / 100;

    const finalAmount = afterDiscount + taxAmount;

    valuation.total_amount = totalAmount;
    valuation.discount_amount = discountAmount;
    valuation.tax_amount = taxAmount;
    valuation.final_amount = finalAmount;

    return this.valuationRepository.save(valuation);
  }

  /**
   * Aprovar/Rejeitar valorização
   */
  async approve(userId: string, dto: ApproveValuationDto) {
    const valuation = await this.findOne(dto.valuation_id);

    valuation.is_approved = dto.is_approved;
    valuation.approved_by_id = userId;
    valuation.approved_at = new Date();

    return this.valuationRepository.save(valuation);
  }

  /**
   * Remover valorização
   */
  async remove(id: string, userId: string) {
    const valuation = await this.findOne(id);
    await this.valuationRepository.remove(valuation);
    return { success: true, message: 'Valorização removida com sucesso' };
  }

  /**
   * Calcular total de valorização de um ticket
   */
  async getTotalValuation(ticketId: string) {
    const valuations = await this.findAll(ticketId);

    const clientCharges = valuations
      .filter((v) => v.category === 'client_charge')
      .reduce((sum, v) => sum + Number(v.final_amount), 0);

    const internalCosts = valuations
      .filter((v) => v.category === 'internal_cost')
      .reduce((sum, v) => sum + Number(v.final_amount), 0);

    return {
      client_charges: clientCharges,
      internal_costs: internalCosts,
      total: clientCharges + internalCosts,
    };
  }

  /**
   * Marcar como sincronizado com SIGE Cloud
   */
  async markAsSynced(id: string, serviceOrderId: string) {
    const valuation = await this.findOne(id);
    valuation.synced_to_sige = true;
    valuation.synced_at = new Date();
    valuation.service_order_id = serviceOrderId;
    return this.valuationRepository.save(valuation);
  }
}
