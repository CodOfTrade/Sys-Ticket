import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsUUID,
  IsNumber,
  IsObject,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  TicketPriority,
  TicketType,
  ContractCoverage,
} from '../entities/ticket.entity';

export class CreateTicketDto {
  @ApiProperty({
    description: 'ID do cliente no SIGE Cloud',
    example: '12345',
  })
  @IsString()
  @IsNotEmpty()
  client_id: string;

  @ApiProperty({
    description: 'Nome do cliente',
    example: 'Empresa ABC Ltda',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  client_name: string;

  @ApiProperty({
    description: 'Nome do solicitante',
    example: 'João Silva',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  requester_name: string;

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

  @ApiProperty({
    description: 'Título do ticket',
    example: 'Problema com impressora',
    minLength: 5,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(255)
  title: string;

  @ApiProperty({
    description: 'Descrição detalhada do problema',
    example: 'A impressora HP do setor financeiro está dando erro de papel atolado',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({
    description: 'Prioridade do ticket',
    enum: TicketPriority,
    default: TicketPriority.MEDIUM,
  })
  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  @ApiPropertyOptional({
    description: 'Tipo de atendimento',
    enum: TicketType,
    default: TicketType.REMOTE,
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
    description: 'Tags para categorização',
    example: ['impressora', 'hardware', 'urgente'],
    type: [String],
  })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiProperty({
    description: 'ID da mesa de serviço',
    example: 'uuid-da-mesa',
  })
  @IsUUID()
  @IsNotEmpty()
  service_desk_id: string;

  @ApiPropertyOptional({
    description: 'ID do catálogo de serviço',
    example: 'uuid-do-catalogo',
  })
  @IsUUID()
  @IsOptional()
  service_catalog_id?: string;

  @ApiPropertyOptional({
    description: 'ID do contato/solicitante',
    example: 'uuid-do-contato',
  })
  @IsUUID()
  @IsOptional()
  contact_id?: string;

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
    default: ContractCoverage.NO_CONTRACT,
  })
  @IsEnum(ContractCoverage)
  @IsOptional()
  contract_coverage?: ContractCoverage;

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
    description: 'ID do ticket pai (para tickets vinculados)',
    example: 'uuid-do-ticket-pai',
  })
  @IsUUID()
  @IsOptional()
  parent_ticket_id?: string;

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
