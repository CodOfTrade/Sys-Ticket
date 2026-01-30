import { IsUUID, IsString, IsNotEmpty, MaxLength, IsOptional, IsBoolean, ValidateNested, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';
import { CreatePricingModalityConfigDto } from './pricing-modality-config.dto';

/**
 * DTO para criar classificação de atendimento
 *
 * Cada classificação deve ter 3 configurações de modalidade:
 * - Interno
 * - Remoto
 * - Presencial externo
 */
export class CreatePricingConfigDto {
  @IsUUID()
  @IsNotEmpty()
  service_desk_id: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string; // Ex: "Atendimento avulso N1", "Suporte DBA", etc

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  /**
   * Array com 3 configurações de modalidade (interno, remoto, externo)
   * Obrigatório ter exatamente 3 elementos
   */
  @ValidateNested({ each: true })
  @Type(() => CreatePricingModalityConfigDto)
  @ArrayMinSize(3)
  @ArrayMaxSize(3)
  modality_configs: CreatePricingModalityConfigDto[];
}
