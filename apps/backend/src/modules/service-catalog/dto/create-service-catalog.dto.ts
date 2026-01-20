import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsNumber,
  IsObject,
  MaxLength,
} from 'class-validator';

export class CreateServiceCatalogDto {
  @ApiProperty({
    description: 'Nome do serviço',
    example: 'Suporte Técnico Remoto',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: 'Descrição do serviço',
    example: 'Atendimento remoto para problemas técnicos',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Código do serviço',
    example: 'SUP-REM-001',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  code?: string;

  @ApiPropertyOptional({
    description: 'ID da mesa de serviço (opcional)',
    example: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  service_desk_id?: string;

  @ApiPropertyOptional({
    description: 'Configuração de SLA por prioridade',
  })
  @IsObject()
  @IsOptional()
  sla_config?: {
    low: { first_response: number; resolution: number };
    medium: { first_response: number; resolution: number };
    high: { first_response: number; resolution: number };
    urgent: { first_response: number; resolution: number };
  };

  @ApiPropertyOptional({
    description: 'Requer aprovação',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  requires_approval?: boolean;

  @ApiPropertyOptional({
    description: 'É faturável',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  is_billable?: boolean;

  @ApiPropertyOptional({
    description: 'Preço padrão',
    example: 150.00,
  })
  @IsNumber()
  @IsOptional()
  default_price?: number;

  @ApiPropertyOptional({
    description: 'Tempo estimado em minutos',
    example: 120,
  })
  @IsNumber()
  @IsOptional()
  estimated_time?: number;

  @ApiPropertyOptional({
    description: 'Ordem de exibição',
    default: 0,
  })
  @IsNumber()
  @IsOptional()
  display_order?: number;

  @ApiPropertyOptional({
    description: 'Metadados adicionais',
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
