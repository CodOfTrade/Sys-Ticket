import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString, IsInt, Min, Max, IsUUID, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { TicketStatus, TicketPriority, TicketType } from '../entities/ticket.entity';

export class QueryTicketDto {
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
    description: 'Filtrar por status',
    enum: TicketStatus,
  })
  @IsEnum(TicketStatus)
  @IsOptional()
  status?: TicketStatus;

  @ApiPropertyOptional({
    description: 'Filtrar por prioridade',
    enum: TicketPriority,
  })
  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  @ApiPropertyOptional({
    description: 'Filtrar por tipo',
    enum: TicketType,
  })
  @IsEnum(TicketType)
  @IsOptional()
  type?: TicketType;

  @ApiPropertyOptional({
    description: 'Filtrar por ID do cliente (SIGE Cloud)',
    example: '12345',
  })
  @IsString()
  @IsOptional()
  client_id?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por ID da mesa de serviço',
    example: 'uuid-da-mesa',
  })
  @IsUUID()
  @IsOptional()
  service_desk_id?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por ID do atendente',
    example: 'uuid-do-atendente',
  })
  @IsUUID()
  @IsOptional()
  assigned_to_id?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por categoria',
    example: 'Hardware',
  })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({
    description: 'Busca por texto (título, descrição, número)',
    example: 'impressora',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filtrar tickets não atribuídos',
    example: true,
  })
  @IsBoolean()
  @Type(() => Boolean)
  @IsOptional()
  unassigned?: boolean;

  @ApiPropertyOptional({
    description: 'Filtrar tickets com SLA violado',
    example: false,
  })
  @IsBoolean()
  @Type(() => Boolean)
  @IsOptional()
  sla_violated?: boolean;

  @ApiPropertyOptional({
    description: 'Filtrar tickets que podem ser faturados',
    example: true,
  })
  @IsBoolean()
  @Type(() => Boolean)
  @IsOptional()
  can_invoice?: boolean;

  @ApiPropertyOptional({
    description: 'Filtrar tickets já faturados',
    example: false,
  })
  @IsBoolean()
  @Type(() => Boolean)
  @IsOptional()
  invoiced?: boolean;

  @ApiPropertyOptional({
    description: 'Ordenar por campo',
    example: 'created_at',
    default: 'created_at',
  })
  @IsString()
  @IsOptional()
  sortBy?: string = 'created_at';

  @ApiPropertyOptional({
    description: 'Direção da ordenação',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsString()
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
