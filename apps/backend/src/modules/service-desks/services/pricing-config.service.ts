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
  minimum_charge_threshold_minutes?: number;
  charge_excess_per_minute?: boolean;
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
  minimum_charge_threshold_minutes?: number;
  charge_excess_per_minute?: boolean;
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
   * Exemplo com valor_hora = R$ 80, mínimo = R$ 80, threshold = 60 min:
   *
   * Por Minuto:
   * - 30 min → R$ 80 (valor mínimo)
   * - 75 min → R$ 80 + (15/60 × 80) = R$ 80 + R$ 20 = R$ 100
   *
   * Por Hora Completa:
   * - 30 min → R$ 80 (valor mínimo)
   * - 61 min → R$ 80 + R$ 80 = R$ 160 (passou 1 min = 1h extra)
   * - 75 min → R$ 80 + R$ 80 = R$ 160 (passou 15 min = 1h extra)
   * - 121 min → R$ 80 + R$ 160 = R$ 240 (passou 61 min = 2h extra)
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
    const chargePerMinute = config.charge_excess_per_minute ?? false;

    // Se duração <= threshold, cobra valor mínimo
    if (durationMinutes <= thresholdMinutes) {
      return {
        basePrice: minimumCharge,
        excessPrice: 0,
        totalPrice: minimumCharge,
        appliedRate: hourlyRate,
        description: `Cobrança mínima aplicada (${durationMinutes} min ≤ ${thresholdMinutes} min)`,
      };
    }

    // Duração excedente
    const excessMinutes = durationMinutes - thresholdMinutes;
    let excessPrice: number;
    let description: string;

    if (chargePerMinute) {
      // Por Minuto: cobra proporcionalmente
      const minuteRate = hourlyRate / 60;
      excessPrice = excessMinutes * minuteRate;
      description = `Base: R$ ${minimumCharge.toFixed(2)} + Excedente: ${excessMinutes} min × R$ ${minuteRate.toFixed(2)}/min`;
    } else {
      // Por Hora Completa: arredonda para cima
      // Se passou 1 minuto do threshold, já cobra 1 hora completa
      const excessHours = Math.ceil(excessMinutes / 60);
      excessPrice = excessHours * hourlyRate;
      description = `Base: R$ ${minimumCharge.toFixed(2)} + Excedente: ${excessHours}h × R$ ${hourlyRate.toFixed(2)}/h`;
    }

    const totalPrice = minimumCharge + excessPrice;

    return {
      basePrice: minimumCharge,
      excessPrice: Math.round(excessPrice * 100) / 100,
      totalPrice: Math.round(totalPrice * 100) / 100,
      appliedRate: hourlyRate,
      description,
    };
  }
}
