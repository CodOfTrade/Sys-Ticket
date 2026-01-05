import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsDateString,
  IsObject,
  Min,
} from 'class-validator';
import { TimesheetType, BillingType } from '../entities/timesheet.entity';

export class UpdateTimesheetDto {
  @ApiPropertyOptional({
    description: 'Data/hora de início',
    example: '2026-01-05T08:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  start_time?: string;

  @ApiPropertyOptional({
    description: 'Data/hora de término',
    example: '2026-01-05T12:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  end_time?: string;

  @ApiPropertyOptional({
    description: 'Duração em minutos',
    example: 240,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  duration?: number;

  @ApiPropertyOptional({
    description: 'Tipo de atendimento',
    enum: TimesheetType,
  })
  @IsEnum(TimesheetType)
  @IsOptional()
  type?: TimesheetType;

  @ApiPropertyOptional({
    description: 'Se é faturável',
  })
  @IsBoolean()
  @IsOptional()
  billable?: boolean;

  @ApiPropertyOptional({
    description: 'Tipo de cobrança',
    enum: BillingType,
  })
  @IsEnum(BillingType)
  @IsOptional()
  billing_type?: BillingType;

  @ApiPropertyOptional({
    description: 'Preço unitário por hora',
    example: 150.00,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  unit_price?: number;

  @ApiPropertyOptional({
    description: 'Valor total',
    example: 600.00,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  total_amount?: number;

  @ApiPropertyOptional({
    description: 'Descrição do trabalho realizado',
    example: 'Configuração de impressora e instalação de drivers',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Latitude inicial (GPS)',
    example: -2.5307,
  })
  @IsNumber()
  @IsOptional()
  start_latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude inicial (GPS)',
    example: -44.2567,
  })
  @IsNumber()
  @IsOptional()
  start_longitude?: number;

  @ApiPropertyOptional({
    description: 'Latitude final (GPS)',
    example: -2.5308,
  })
  @IsNumber()
  @IsOptional()
  end_latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude final (GPS)',
    example: -44.2568,
  })
  @IsNumber()
  @IsOptional()
  end_longitude?: number;

  @ApiPropertyOptional({
    description: 'Aprovado',
  })
  @IsBoolean()
  @IsOptional()
  approved?: boolean;

  @ApiPropertyOptional({
    description: 'Já foi faturado',
  })
  @IsBoolean()
  @IsOptional()
  invoiced?: boolean;

  @ApiPropertyOptional({
    description: 'ID da OS no SIGE Cloud',
    example: 'OS-12345',
  })
  @IsString()
  @IsOptional()
  invoice_id?: string;

  @ApiPropertyOptional({
    description: 'Duração de pausas em minutos',
    example: 30,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  pause_duration?: number;

  @ApiPropertyOptional({
    description: 'Metadados adicionais (JSON)',
    example: { device: 'mobile', app_version: '1.0.0' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
