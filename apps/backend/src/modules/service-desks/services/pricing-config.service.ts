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
}
