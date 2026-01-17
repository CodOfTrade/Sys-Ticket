import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsUUID,
  IsBoolean,
  IsEnum,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ChecklistFieldType } from '../entities/checklist.entity';

/**
 * DTO para opção de campo de múltipla/única escolha
 */
export class ChecklistFieldOptionDto {
  @ApiProperty({ description: 'ID único da opção' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: 'Label da opção' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ description: 'Ordem de exibição' })
  @IsNumber()
  order: number;
}

/**
 * DTO para campo do checklist (template)
 */
export class ChecklistFieldDto {
  @ApiProperty({ description: 'ID único do campo' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: 'Label/Título do campo' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiPropertyOptional({ description: 'Descrição/ajuda do campo' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Tipo do campo',
    enum: ChecklistFieldType,
    example: ChecklistFieldType.TEXT
  })
  @IsEnum(ChecklistFieldType)
  @IsNotEmpty()
  type: ChecklistFieldType;

  @ApiProperty({ description: 'Ordem de exibição' })
  @IsNumber()
  order: number;

  @ApiProperty({ description: 'Campo obrigatório', default: false })
  @IsBoolean()
  required: boolean;

  @ApiPropertyOptional({
    description: 'Opções para campos de escolha',
    type: [ChecklistFieldOptionDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistFieldOptionDto)
  @IsOptional()
  options?: ChecklistFieldOptionDto[];

  @ApiPropertyOptional({ description: 'Placeholder para campos de texto' })
  @IsString()
  @IsOptional()
  placeholder?: string;

  @ApiPropertyOptional({ description: 'Valor mínimo (number/currency)' })
  @IsNumber()
  @IsOptional()
  min_value?: number;

  @ApiPropertyOptional({ description: 'Valor máximo (number/currency)' })
  @IsNumber()
  @IsOptional()
  max_value?: number;

  @ApiPropertyOptional({ description: 'Tamanho máximo (text/paragraph)' })
  @IsNumber()
  @IsOptional()
  max_length?: number;

  @ApiPropertyOptional({ description: 'Extensões permitidas (file)', type: [String] })
  @IsArray()
  @IsOptional()
  allowed_extensions?: string[];
}

/**
 * DTO legado para compatibilidade
 * @deprecated Use ChecklistFieldDto
 */
export class ChecklistItemDto extends ChecklistFieldDto {
  @ApiProperty({ description: 'Título do item (alias para label)' })
  @IsString()
  @IsOptional()
  title?: string;
}

/**
 * DTO para criar template de checklist
 */
export class CreateChecklistTemplateDto {
  @ApiProperty({ description: 'Nome do checklist' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Descrição do checklist (até 1000 caracteres)' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'ID do service desk (opcional)' })
  @IsUUID()
  @IsOptional()
  service_desk_id?: string;

  @ApiProperty({ description: 'Campos do checklist', type: [ChecklistFieldDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistFieldDto)
  items: ChecklistFieldDto[];

  @ApiPropertyOptional({ description: 'Categoria para organização' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: 'Ordem de exibição', default: 0 })
  @IsNumber()
  @IsOptional()
  display_order?: number;

  @ApiProperty({ description: 'Checklist obrigatório para concluir ticket', default: false })
  @IsBoolean()
  @IsOptional()
  is_mandatory?: boolean;

  @ApiPropertyOptional({
    description: 'IDs de clientes específicos (vazio = todos)',
    type: [String]
  })
  @IsArray()
  @IsOptional()
  client_restrictions?: string[];

  @ApiPropertyOptional({
    description: 'IDs de catálogos de serviço específicos (vazio = todos)',
    type: [String]
  })
  @IsArray()
  @IsOptional()
  catalog_restrictions?: string[];
}

/**
 * DTO para atualizar template de checklist
 */
export class UpdateChecklistTemplateDto {
  @ApiPropertyOptional({ description: 'Nome do checklist' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Descrição' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'ID do service desk' })
  @IsUUID()
  @IsOptional()
  service_desk_id?: string;

  @ApiPropertyOptional({ description: 'Campos do checklist', type: [ChecklistFieldDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistFieldDto)
  @IsOptional()
  items?: ChecklistFieldDto[];

  @ApiPropertyOptional({ description: 'Categoria' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: 'Ordem de exibição' })
  @IsNumber()
  @IsOptional()
  display_order?: number;

  @ApiPropertyOptional({ description: 'Checklist obrigatório' })
  @IsBoolean()
  @IsOptional()
  is_mandatory?: boolean;

  @ApiPropertyOptional({ description: 'Ativo/Inativo' })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @ApiPropertyOptional({ description: 'Restrições por cliente', type: [String] })
  @IsArray()
  @IsOptional()
  client_restrictions?: string[];

  @ApiPropertyOptional({ description: 'Restrições por catálogo', type: [String] })
  @IsArray()
  @IsOptional()
  catalog_restrictions?: string[];
}

/**
 * DTO para adicionar checklist a um ticket
 */
export class AddChecklistToTicketDto {
  @ApiProperty({ description: 'ID do ticket' })
  @IsUUID()
  @IsNotEmpty()
  ticket_id: string;

  @ApiProperty({ description: 'ID do template de checklist' })
  @IsUUID()
  @IsNotEmpty()
  checklist_id: string;
}

/**
 * DTO para atualizar campo do checklist no ticket
 */
export class UpdateChecklistFieldDto {
  @ApiProperty({ description: 'ID do campo no checklist' })
  @IsString()
  @IsNotEmpty()
  field_id: string;

  @ApiPropertyOptional({ description: 'Valor do campo (varia por tipo)' })
  @IsOptional()
  value?: any;

  @ApiPropertyOptional({ description: 'Observações/notas' })
  @IsString()
  @IsOptional()
  notes?: string;
}

/**
 * DTO legado para compatibilidade
 * @deprecated Use UpdateChecklistFieldDto
 */
export class UpdateChecklistItemDto {
  @ApiProperty({ description: 'ID do item no checklist' })
  @IsString()
  @IsNotEmpty()
  item_id: string;

  @ApiProperty({ description: 'Item completado (para checkbox)' })
  @IsBoolean()
  @IsOptional()
  is_completed?: boolean;

  @ApiPropertyOptional({ description: 'Valor do campo' })
  @IsOptional()
  value?: any;

  @ApiPropertyOptional({ description: 'Observações' })
  @IsString()
  @IsOptional()
  notes?: string;
}
