import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsUUID,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ChecklistItemDto {
  @ApiProperty({ description: 'ID único do item' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: 'Título do item' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Descrição do item', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Ordem de exibição' })
  @IsNotEmpty()
  order: number;

  @ApiProperty({ description: 'Item obrigatório', required: false })
  @IsBoolean()
  @IsOptional()
  required?: boolean;
}

export class CreateChecklistTemplateDto {
  @ApiProperty({ description: 'Nome do checklist' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Descrição do checklist', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'ID do service desk' })
  @IsUUID()
  @IsNotEmpty()
  service_desk_id: string;

  @ApiProperty({ description: 'Items do checklist', type: [ChecklistItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemDto)
  items: ChecklistItemDto[];

  @ApiProperty({ description: 'Categoria', required: false })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ description: 'Ordem de exibição', required: false })
  @IsOptional()
  display_order?: number;
}

export class UpdateChecklistTemplateDto {
  @ApiProperty({ description: 'Nome do checklist', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'Descrição', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Items', required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemDto)
  @IsOptional()
  items?: ChecklistItemDto[];

  @ApiProperty({ description: 'Categoria', required: false })
  @IsString()
  @IsOptional()
  category?: string;
}

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

export class UpdateChecklistItemDto {
  @ApiProperty({ description: 'ID do item no checklist' })
  @IsString()
  @IsNotEmpty()
  item_id: string;

  @ApiProperty({ description: 'Item completado' })
  @IsBoolean()
  @IsNotEmpty()
  is_completed: boolean;

  @ApiProperty({ description: 'Observações', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
