import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsUUID,
  IsNumber,
  IsBoolean,
  IsObject,
  IsDateString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  TicketStatus,
  TicketPriority,
  TicketType,
  ContractCoverage,
} from '../entities/ticket.entity';

export class UpdateTicketDto {
  @ApiPropertyOptional({
    description: 'ID do cliente no SIGE Cloud',
    example: 'uuid-do-cliente',
  })
  @IsString()
  @IsOptional()
  client_id?: string;

  @ApiPropertyOptional({
    description: 'Nome do cliente',
    example: 'Empresa ABC Ltda',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  client_name?: string;

  @ApiPropertyOptional({
    description: 'Nome do solicitante',
    example: 'João Silva',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  requester_name?: string;

  @ApiPropertyOptional({
    description: 'Email do solicitante',
    example: 'joao@empresa.com',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  requester_email?: string;

  @ApiPropertyOptional({
    description: 'Telefone do solicitante',
    example: '(99) 98888-7777',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  requester_phone?: string;

  @ApiPropertyOptional({
    description: 'Título do ticket',
    example: 'Problema com impressora',
    minLength: 5,
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MinLength(5)
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    description: 'Descrição detalhada do problema',
    example: 'A impressora HP do setor financeiro está dando erro de papel atolado',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Status do ticket',
    enum: TicketStatus,
  })
  @IsEnum(TicketStatus)
  @IsOptional()
  status?: TicketStatus;

  @ApiPropertyOptional({
    description: 'Prioridade do ticket',
    enum: TicketPriority,
  })
  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  @ApiPropertyOptional({
    description: 'Tipo de atendimento',
    enum: TicketType,
  })
  @IsEnum(TicketType)
  @IsOptional()
  type?: TicketType;

  @ApiPropertyOptional({
    description: 'Categoria do ticket',
    example: 'Hardware',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({
    description: 'ID do catálogo de serviço',
    example: 'uuid-do-catalogo',
  })
  @ValidateIf((o) => o.service_catalog_id !== null && o.service_catalog_id !== undefined)
  @IsUUID()
  @IsOptional()
  service_catalog_id?: string | null;

  @ApiPropertyOptional({
    description: 'ID da categoria de serviço',
    example: 'uuid-da-categoria',
  })
  @ValidateIf((o) => o.service_category_id !== null && o.service_category_id !== undefined)
  @IsUUID()
  @IsOptional()
  service_category_id?: string | null;

  @ApiPropertyOptional({
    description: 'Tags para categorização',
    example: ['impressora', 'hardware', 'urgente'],
    type: [String],
  })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({
    description: 'ID do atendente responsável',
    example: 'uuid-do-atendente',
  })
  @IsUUID()
  @IsOptional()
  assigned_to_id?: string;

  @ApiPropertyOptional({
    description: 'ID do contrato no SIGE Cloud',
    example: '67890',
  })
  @IsString()
  @IsOptional()
  contract_id?: string;

  @ApiPropertyOptional({
    description: 'Cobertura do contrato',
    enum: ContractCoverage,
  })
  @IsEnum(ContractCoverage)
  @IsOptional()
  contract_coverage?: ContractCoverage;

  @ApiPropertyOptional({
    description: 'Pode ser faturado',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  can_invoice?: boolean;

  @ApiPropertyOptional({
    description: 'Já foi faturado',
    example: false,
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
    description: 'Valor total do atendimento',
    example: 150.00,
  })
  @IsNumber()
  @IsOptional()
  total_amount?: number;

  @ApiPropertyOptional({
    description: 'Latitude (atendimento externo)',
    example: -2.5307,
  })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude (atendimento externo)',
    example: -44.2567,
  })
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Endereço do local de atendimento',
    example: 'Rua Principal, 123 - Centro',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  location_address?: string;

  @ApiPropertyOptional({
    description: 'Data/hora da primeira resposta',
    example: '2024-01-15T10:30:00Z',
  })
  @IsDateString()
  @IsOptional()
  first_response_at?: string;

  @ApiPropertyOptional({
    description: 'Data/hora da resolução',
    example: '2024-01-15T14:30:00Z',
  })
  @IsDateString()
  @IsOptional()
  resolved_at?: string;

  @ApiPropertyOptional({
    description: 'Data/hora do fechamento',
    example: '2024-01-15T15:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  closed_at?: string;

  @ApiPropertyOptional({
    description: 'Data/hora de início do atendimento',
    example: '2024-01-15T09:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  started_at?: string;

  @ApiPropertyOptional({
    description: 'Data/hora de pausa do atendimento',
    example: '2024-01-15T12:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  paused_at?: string;

  @ApiPropertyOptional({
    description: 'SLA violado',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  sla_violated?: boolean;

  @ApiPropertyOptional({
    description: 'Campos customizados (JSON)',
    example: { campo1: 'valor1', campo2: 123 },
  })
  @IsObject()
  @IsOptional()
  custom_fields?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Metadados adicionais (JSON)',
    example: { source: 'mobile_app', version: '1.0.0' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
