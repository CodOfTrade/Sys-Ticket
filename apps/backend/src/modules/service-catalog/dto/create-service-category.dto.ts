import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsNumber,
  IsBoolean,
  MaxLength,
} from 'class-validator';

export class CreateServiceCategoryDto {
  @ApiProperty({
    description: 'Nome da categoria',
    example: 'Impressoras',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: 'Descrição da categoria',
    example: 'Problemas relacionados a impressoras',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Código da categoria',
    example: 'IMP-001',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  code?: string;

  @ApiProperty({
    description: 'ID do catálogo de serviço',
    example: 'uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  service_catalog_id: string;

  @ApiPropertyOptional({
    description: 'Ícone da categoria',
    example: 'PrinterIcon',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional({
    description: 'Cor da categoria',
    example: '#3B82F6',
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  color?: string;

  @ApiPropertyOptional({
    description: 'Ordem de exibição',
    default: 0,
  })
  @IsNumber()
  @IsOptional()
  display_order?: number;

  @ApiPropertyOptional({
    description: 'Está ativo',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
