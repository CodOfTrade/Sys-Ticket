import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsString,
  IsInt,
  Min,
  Max,
  IsUUID,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TimesheetType, BillingType, SyncStatus } from '../entities/timesheet.entity';

export class QueryTimesheetDto {
  @ApiPropertyOptional({
    description: 'Número da página',
    default: 1,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Itens por página',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  perPage?: number = 20;

  @ApiPropertyOptional({
    description: 'Filtrar por ID do ticket',
    example: 'uuid-do-ticket',
  })
  @IsUUID()
  @IsOptional()
  ticket_id?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por ID do usuário',
    example: 'uuid-do-usuario',
  })
  @IsUUID()
  @IsOptional()
  user_id?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por tipo de atendimento',
    enum: TimesheetType,
  })
  @IsEnum(TimesheetType)
  @IsOptional()
  type?: TimesheetType;

  @ApiPropertyOptional({
    description: 'Filtrar por tipo de cobrança',
    enum: BillingType,
  })
  @IsEnum(BillingType)
  @IsOptional()
  billing_type?: BillingType;

  @ApiPropertyOptional({
    description: 'Filtrar por faturáveis',
    example: true,
  })
  @IsBoolean()
  @Type(() => Boolean)
  @IsOptional()
  billable?: boolean;

  @ApiPropertyOptional({
    description: 'Filtrar por aprovados',
    example: false,
  })
  @IsBoolean()
  @Type(() => Boolean)
  @IsOptional()
  approved?: boolean;

  @ApiPropertyOptional({
    description: 'Filtrar por faturados',
    example: false,
  })
  @IsBoolean()
  @Type(() => Boolean)
  @IsOptional()
  invoiced?: boolean;

  @ApiPropertyOptional({
    description: 'Filtrar por status de sincronização',
    enum: SyncStatus,
  })
  @IsEnum(SyncStatus)
  @IsOptional()
  sync_status?: SyncStatus;

  @ApiPropertyOptional({
    description: 'Data inicial (filtro)',
    example: '2026-01-01',
  })
  @IsDateString()
  @IsOptional()
  start_date?: string;

  @ApiPropertyOptional({
    description: 'Data final (filtro)',
    example: '2026-01-31',
  })
  @IsDateString()
  @IsOptional()
  end_date?: string;

  @ApiPropertyOptional({
    description: 'Ordenar por campo',
    example: 'start_time',
    default: 'start_time',
  })
  @IsString()
  @IsOptional()
  sortBy?: string = 'start_time';

  @ApiPropertyOptional({
    description: 'Direção da ordenação',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsString()
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
