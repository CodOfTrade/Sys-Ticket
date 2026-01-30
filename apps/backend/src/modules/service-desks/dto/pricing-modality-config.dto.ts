import { IsEnum, IsNumber, IsInt, IsBoolean, IsOptional, Min } from 'class-validator';
import { ServiceModality } from '../enums/service-modality.enum';

/**
 * DTO para criar configuração de modalidade
 */
export class CreatePricingModalityConfigDto {
  @IsEnum(ServiceModality)
  modality: ServiceModality;

  @IsNumber()
  @Min(0)
  hourly_rate: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  minimum_charge?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  minimum_charge_threshold_minutes?: number;

  @IsBoolean()
  @IsOptional()
  charge_excess_per_minute?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  round_to_minutes?: number;
}

/**
 * DTO para atualizar configuração de modalidade
 */
export class UpdatePricingModalityConfigDto {
  @IsEnum(ServiceModality)
  @IsOptional()
  modality?: ServiceModality;

  @IsNumber()
  @Min(0)
  @IsOptional()
  hourly_rate?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  minimum_charge?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  minimum_charge_threshold_minutes?: number;

  @IsBoolean()
  @IsOptional()
  charge_excess_per_minute?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  round_to_minutes?: number;
}
