import { IsString, MaxLength, IsOptional, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdatePricingModalityConfigDto } from './pricing-modality-config.dto';

/**
 * DTO para atualizar classificação de atendimento
 */
export class UpdatePricingConfigDto {
  @IsString()
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  /**
   * Array com configurações de modalidades para atualizar
   * Opcional - se fornecido, atualiza as modalidades específicas
   */
  @ValidateNested({ each: true })
  @Type(() => UpdatePricingModalityConfigDto)
  @IsOptional()
  modality_configs?: UpdatePricingModalityConfigDto[];
}
