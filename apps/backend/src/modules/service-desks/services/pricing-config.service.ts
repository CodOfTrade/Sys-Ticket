import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PricingConfig, ServiceType, PricingType } from '../entities/pricing-config.entity';

export interface CreatePricingConfigDto {
  service_desk_id: string;
  service_type: ServiceType;
  pricing_type?: PricingType;
  hourly_rate_normal: number;
  hourly_rate_extra?: number;
  hourly_rate_weekend?: number;
  hourly_rate_holiday?: number;
  hourly_rate_night?: number;
  fixed_price?: number;
  contract_percentage?: number;
  minimum_charge?: number;
  round_to_minutes?: number;
  description?: string;
}

export interface UpdatePricingConfigDto {
  pricing_type?: PricingType;
  hourly_rate_normal?: number;
  hourly_rate_extra?: number;
  hourly_rate_weekend?: number;
  hourly_rate_holiday?: number;
  hourly_rate_night?: number;
  fixed_price?: number;
  contract_percentage?: number;
  minimum_charge?: number;
  round_to_minutes?: number;
  active?: boolean;
  description?: string;
}

@Injectable()
export class PricingConfigService {
  private readonly logger = new Logger(PricingConfigService.name);

  constructor(
    @InjectRepository(PricingConfig)
    private pricingConfigRepository: Repository<PricingConfig>,
  ) {}

  /**
   * Cria nova configuração de preço
   */
  async create(createDto: CreatePricingConfigDto): Promise<PricingConfig> {
    try {
      // Verificar se já existe configuração para este service_desk + service_type
      const existing = await this.pricingConfigRepository.findOne({
        where: {
          service_desk_id: createDto.service_desk_id,
          service_type: createDto.service_type as any,
        },
      });

      if (existing) {
        throw new BadRequestException(
          `Já existe configuração para ${createDto.service_type} nesta mesa de serviço`,
        );
      }

      const config = this.pricingConfigRepository.create(createDto);
      const saved = await this.pricingConfigRepository.save(config);

      this.logger.log(
        `Configuração de preço criada: ${saved.service_type} - R$ ${saved.hourly_rate_normal}/h`,
      );

      return saved;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Erro ao criar configuração de preço', error);
      throw new BadRequestException('Erro ao criar configuração de preço');
    }
  }

  /**
   * Lista todas as configurações
   */
  async findAll(serviceDeskId?: string): Promise<PricingConfig[]> {
    const where = serviceDeskId ? { service_desk_id: serviceDeskId } : {};

    return this.pricingConfigRepository.find({
      where,
      relations: ['service_desk'],
      order: { service_type: 'ASC' },
    });
  }

  /**
   * Busca uma configuração por ID
   */
  async findOne(id: string): Promise<PricingConfig> {
    const config = await this.pricingConfigRepository.findOne({
      where: { id },
      relations: ['service_desk'],
    });

    if (!config) {
      throw new NotFoundException(`Configuração ${id} não encontrada`);
    }

    return config;
  }

  /**
   * Busca configuração por mesa e tipo de serviço
   */
  async findByServiceDeskAndType(
    serviceDeskId: string,
    serviceType: string,
  ): Promise<PricingConfig | null> {
    return this.pricingConfigRepository.findOne({
      where: {
        service_desk_id: serviceDeskId,
        service_type: serviceType as any,
        active: true,
      },
    });
  }

  /**
   * Atualiza configuração
   */
  async update(id: string, updateDto: UpdatePricingConfigDto): Promise<PricingConfig> {
    try {
      const config = await this.findOne(id);

      Object.assign(config, updateDto);

      const updated = await this.pricingConfigRepository.save(config);

      this.logger.log(`Configuração de preço ${id} atualizada`);

      return updated;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Erro ao atualizar configuração ${id}`, error);
      throw new BadRequestException('Erro ao atualizar configuração');
    }
  }

  /**
   * Remove configuração
   */
  async remove(id: string): Promise<void> {
    const config = await this.findOne(id);

    await this.pricingConfigRepository.remove(config);

    this.logger.log(`Configuração de preço ${id} removida`);
  }

  /**
   * Calcular preço baseado na configuração e duração
   *
   * Regras:
   * - Se duração < minimum_charge_threshold_minutes, cobra minimum_charge
   * - Caso contrário:
   *   - Se charge_excess_per_minute = true: cobra por minuto excedente
   *   - Se charge_excess_per_minute = false: cobra por hora completa excedente
   *
   * Exemplo:
   * - hourly_rate_normal = R$ 70
   * - minimum_charge = R$ 70
   * - minimum_charge_threshold_minutes = 60
   * - charge_excess_per_minute = true
   *
   * Duração 10 min → R$ 70 (valor mínimo)
   * Duração 48 min → R$ 70 (valor mínimo)
   * Duração 75 min → R$ 70 + (15 min × R$ 70/60) = R$ 87,50
   * Duração 125 min → R$ 70 + (65 min × R$ 70/60) = R$ 145,83
   *
   * Se charge_excess_per_minute = false:
   * Duração 75 min → R$ 70 + R$ 70 = R$ 140 (1 hora extra completa)
   */
  calculatePrice(config: PricingConfig, durationMinutes: number): {
    basePrice: number;
    excessPrice: number;
    totalPrice: number;
    appliedRate: number;
    description: string;
  } {
    const hourlyRate = Number(config.hourly_rate_normal) || 0;
    const minimumCharge = Number(config.minimum_charge) || 0;
    const thresholdMinutes = config.minimum_charge_threshold_minutes || 60;

    // Se duração < threshold, cobra valor mínimo
    if (durationMinutes <= thresholdMinutes) {
      return {
        basePrice: minimumCharge,
        excessPrice: 0,
        totalPrice: minimumCharge,
        appliedRate: hourlyRate,
        description: `Cobrança mínima aplicada (${durationMinutes} min < ${thresholdMinutes} min)`,
      };
    }

    // Duração excedente
    const excessMinutes = durationMinutes - thresholdMinutes;
    let excessPrice = 0;

    if (config.charge_excess_per_minute) {
      // Cobrança por minuto excedente
      const pricePerMinute = hourlyRate / 60;
      excessPrice = excessMinutes * pricePerMinute;
    } else {
      // Cobrança por hora completa excedente
      const excessHours = Math.ceil(excessMinutes / 60);
      excessPrice = excessHours * hourlyRate;
    }

    const totalPrice = minimumCharge + excessPrice;

    return {
      basePrice: minimumCharge,
      excessPrice: Math.round(excessPrice * 100) / 100, // Arredondar para 2 casas
      totalPrice: Math.round(totalPrice * 100) / 100,
      appliedRate: hourlyRate,
      description: config.charge_excess_per_minute
        ? `Base: R$ ${minimumCharge.toFixed(2)} + Excedente: ${excessMinutes} min × R$ ${(hourlyRate / 60).toFixed(2)}/min`
        : `Base: R$ ${minimumCharge.toFixed(2)} + Excedente: ${Math.ceil(excessMinutes / 60)}h × R$ ${hourlyRate.toFixed(2)}/h`,
    };
  }
}
