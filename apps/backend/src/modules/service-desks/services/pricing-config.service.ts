import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PricingConfig } from '../entities/pricing-config.entity';
import { PricingModalityConfig } from '../entities/pricing-modality-config.entity';
import { CreatePricingConfigDto } from '../dto/create-pricing-config.dto';
import { UpdatePricingConfigDto } from '../dto/update-pricing-config.dto';

@Injectable()
export class PricingConfigService {
  private readonly logger = new Logger(PricingConfigService.name);

  constructor(
    @InjectRepository(PricingConfig)
    private pricingConfigRepository: Repository<PricingConfig>,
    @InjectRepository(PricingModalityConfig)
    private modalityConfigRepository: Repository<PricingModalityConfig>,
  ) {}

  /**
   * Cria nova classificação de atendimento
   */
  async create(createDto: CreatePricingConfigDto): Promise<PricingConfig> {
    try {
      // Verificar se já existe classificação com este nome nesta mesa de serviço
      const existing = await this.pricingConfigRepository.findOne({
        where: {
          service_desk_id: createDto.service_desk_id,
          name: createDto.name,
        },
      });

      if (existing) {
        throw new BadRequestException(
          `Já existe uma classificação com o nome "${createDto.name}" nesta mesa de serviço`,
        );
      }

      const config = this.pricingConfigRepository.create({
        service_desk_id: createDto.service_desk_id,
        name: createDto.name,
        description: createDto.description,
        active: createDto.active ?? true,
        modality_configs: createDto.modality_configs,
      });

      const saved = await this.pricingConfigRepository.save(config);

      this.logger.log(
        `Classificação de atendimento criada: "${saved.name}" com ${saved.modality_configs.length} modalidades`,
      );

      return saved;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Erro ao criar classificação de atendimento', error);
      throw new BadRequestException('Erro ao criar classificação de atendimento');
    }
  }

  /**
   * Lista todas as classificações
   */
  async findAll(serviceDeskId?: string): Promise<PricingConfig[]> {
    const where: any = {};
    if (serviceDeskId) {
      where.service_desk_id = serviceDeskId;
    }

    return this.pricingConfigRepository.find({
      where,
      relations: ['modality_configs'],
      order: { name: 'ASC' },
    });
  }

  /**
   * Busca uma classificação por ID
   */
  async findOne(id: string): Promise<PricingConfig> {
    const config = await this.pricingConfigRepository.findOne({
      where: { id },
      relations: ['modality_configs'],
    });

    if (!config) {
      throw new NotFoundException(`Classificação ${id} não encontrada`);
    }

    return config;
  }

  /**
   * Atualiza classificação
   */
  async update(id: string, updateDto: UpdatePricingConfigDto): Promise<PricingConfig> {
    try {
      const config = await this.findOne(id);

      // Atualizar campos básicos
      if (updateDto.name !== undefined) {
        config.name = updateDto.name;
      }
      if (updateDto.description !== undefined) {
        config.description = updateDto.description;
      }
      if (updateDto.active !== undefined) {
        config.active = updateDto.active;
      }

      // Atualizar configurações de modalidades se fornecidas
      if (updateDto.modality_configs && updateDto.modality_configs.length > 0) {
        for (const modalityDto of updateDto.modality_configs) {
          // Encontrar modalidade existente
          const existingModality = config.modality_configs.find(
            (m) => m.modality === modalityDto.modality,
          );

          if (existingModality) {
            // Atualizar valores
            if (modalityDto.hourly_rate !== undefined) {
              existingModality.hourly_rate = modalityDto.hourly_rate;
            }
            if (modalityDto.minimum_charge !== undefined) {
              existingModality.minimum_charge = modalityDto.minimum_charge;
            }
            if (modalityDto.minimum_charge_threshold_minutes !== undefined) {
              existingModality.minimum_charge_threshold_minutes =
                modalityDto.minimum_charge_threshold_minutes;
            }
            if (modalityDto.charge_excess_per_minute !== undefined) {
              existingModality.charge_excess_per_minute =
                modalityDto.charge_excess_per_minute;
            }
            if (modalityDto.round_to_minutes !== undefined) {
              existingModality.round_to_minutes = modalityDto.round_to_minutes;
            }

            // Salvar modalidade
            await this.modalityConfigRepository.save(existingModality);
          }
        }
      }

      // Salvar config
      const updated = await this.pricingConfigRepository.save(config);

      this.logger.log(`Classificação de atendimento "${config.name}" atualizada`);

      // Recarregar com relações
      return this.findOne(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Erro ao atualizar classificação ${id}`, error);
      throw new BadRequestException('Erro ao atualizar classificação');
    }
  }

  /**
   * Remove classificação
   */
  async remove(id: string): Promise<void> {
    const config = await this.findOne(id);

    await this.pricingConfigRepository.remove(config);

    this.logger.log(`Classificação de atendimento "${config.name}" removida`);
  }

  /**
   * Calcular preço baseado na configuração de modalidade e duração
   *
   * Regras:
   * - Se duração <= minimum_charge_threshold_minutes, cobra minimum_charge
   * - Caso contrário, depende de charge_excess_per_minute:
   *
   *   charge_excess_per_minute = true (Por Minuto):
   *   - Cobra proporcionalmente por minuto excedente
   *   - Exemplo: 75 min (15 min excedente) = mínimo + (15/60 × valor_hora)
   *
   *   charge_excess_per_minute = false (Por Hora Completa):
   *   - Arredonda para cima - passou 1 min do mínimo, cobra 1h extra
   *   - Exemplo: 61 min = mínimo + 1h extra
   *   - Exemplo: 121 min = mínimo + 2h extra
   *
   * @param modalityConfig - Configuração da modalidade específica (interno, remoto ou externo)
   * @param durationMinutes - Duração em minutos
   * @returns Objeto com unit_price, total_amount e description
   */
  calculatePrice(
    modalityConfig: PricingModalityConfig,
    durationMinutes: number,
  ): {
    unit_price: number;
    total_amount: number;
    description: string;
  } {
    const hourlyRate = Number(modalityConfig.hourly_rate) || 0;
    const minimumCharge = Number(modalityConfig.minimum_charge) || 0;
    const thresholdMinutes = modalityConfig.minimum_charge_threshold_minutes || 60;
    const chargePerMinute = modalityConfig.charge_excess_per_minute ?? false;

    let totalAmount: number;
    let description: string;

    // Se duração <= threshold, cobra valor mínimo
    if (durationMinutes <= thresholdMinutes) {
      totalAmount = minimumCharge;
      description = `${durationMinutes} min → R$ ${minimumCharge.toFixed(2)} (valor mínimo)`;
    } else {
      // Duração excedente
      const excessMinutes = durationMinutes - thresholdMinutes;

      if (chargePerMinute) {
        // Por Minuto: cobra proporcionalmente
        const excessCost = (excessMinutes / 60) * hourlyRate;
        totalAmount = minimumCharge + excessCost;
        description = `${thresholdMinutes} min → R$ ${minimumCharge.toFixed(2)} (mínimo) + ${excessMinutes} min → R$ ${excessCost.toFixed(2)} = R$ ${totalAmount.toFixed(2)}`;
      } else {
        // Por Hora Completa: arredonda para cima
        const excessHours = Math.ceil(excessMinutes / 60);
        const excessCost = excessHours * hourlyRate;
        totalAmount = minimumCharge + excessCost;
        description = `${thresholdMinutes} min → R$ ${minimumCharge.toFixed(2)} (mínimo) + ${excessHours}h → R$ ${excessCost.toFixed(2)} = R$ ${totalAmount.toFixed(2)}`;
      }
    }

    return {
      unit_price: hourlyRate,
      total_amount: Math.round(totalAmount * 100) / 100,
      description,
    };
  }
}
