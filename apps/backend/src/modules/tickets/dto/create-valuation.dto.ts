import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsNumber,
  IsDateString,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ValuationType, ValuationCategory } from '../entities/ticket-valuation.entity';

export class CreateValuationDto {
  @ApiProperty({ description: 'ID do ticket' })
  @IsUUID()
  @IsNotEmpty()
  ticket_id: string;

  @ApiProperty({
    description: 'Tipo de valorização',
    enum: ValuationType,
    default: ValuationType.PRODUCT,
  })
  @IsEnum(ValuationType)
  @IsOptional()
  type?: ValuationType;

  @ApiProperty({
    description: 'Categoria',
    enum: ValuationCategory,
    default: ValuationCategory.CLIENT_CHARGE,
  })
  @IsEnum(ValuationCategory)
  @IsOptional()
  category?: ValuationCategory;

  @ApiProperty({ description: 'ID do produto no SIGE Cloud', required: false })
  @IsString()
  @IsOptional()
  sige_product_id?: string;

  @ApiProperty({ description: 'Nome do produto/serviço' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Data da valorização (YYYY-MM-DD)' })
  @IsDateString()
  @IsNotEmpty()
  valuation_date: string;

  @ApiProperty({ description: 'Quantidade', default: 1 })
  @IsNumber()
  @Min(0.001)
  @IsOptional()
  quantity?: number;

  @ApiProperty({ description: 'Unidade de medida', default: 'UN' })
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiProperty({ description: 'Preço unitário' })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  unit_price: number;

  @ApiProperty({ description: 'Percentual de desconto', required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  discount_percent?: number;

  @ApiProperty({ description: 'Percentual de imposto', required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  tax_percent?: number;

  @ApiProperty({ description: 'Observações', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ description: 'IDs dos anexos', required: false })
  @IsOptional()
  attachment_ids?: string[];
}

export class UpdateValuationDto {
  @ApiProperty({ description: 'Descrição', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Quantidade', required: false })
  @IsNumber()
  @Min(0.001)
  @IsOptional()
  quantity?: number;

  @ApiProperty({ description: 'Preço unitário', required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  unit_price?: number;

  @ApiProperty({ description: 'Percentual de desconto', required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  discount_percent?: number;

  @ApiProperty({ description: 'Observações', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class ApproveValuationDto {
  @ApiProperty({ description: 'ID da valorização' })
  @IsUUID()
  @IsNotEmpty()
  valuation_id: string;

  @ApiProperty({ description: 'Aprovado (true) ou rejeitado (false)' })
  @IsNotEmpty()
  is_approved: boolean;
}
