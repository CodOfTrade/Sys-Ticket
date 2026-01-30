import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsNumber,
  IsDateString,
  IsBoolean,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  AppointmentType,
  ServiceCoverageType,
} from '../entities/ticket-appointment.entity';
import { ServiceModality } from '../../service-desks/enums/service-modality.enum';

export class CreateAppointmentDto {
  @ApiProperty({ description: 'ID do ticket' })
  @IsUUID()
  @IsNotEmpty()
  ticket_id: string;

  @ApiProperty({ description: 'Data do apontamento (YYYY-MM-DD)' })
  @IsDateString()
  @IsNotEmpty()
  appointment_date: string;

  @ApiProperty({ description: 'Hora inicial (HH:MM)' })
  @IsString()
  @IsNotEmpty()
  start_time: string;

  @ApiProperty({ description: 'Hora final (HH:MM)' })
  @IsString()
  @IsNotEmpty()
  end_time: string;

  @ApiProperty({
    description: 'Tipo de apontamento',
    enum: AppointmentType,
    default: AppointmentType.SERVICE,
  })
  @IsEnum(AppointmentType)
  @IsOptional()
  type?: AppointmentType;

  @ApiProperty({
    description: 'Tipo de cobertura/faturamento',
    enum: ServiceCoverageType,
    default: ServiceCoverageType.CONTRACT,
  })
  @IsEnum(ServiceCoverageType)
  @IsOptional()
  coverage_type?: ServiceCoverageType;

  @ApiProperty({ description: 'ID da classificação de atendimento', required: false })
  @IsUUID()
  @IsOptional()
  pricing_config_id?: string;

  @ApiProperty({
    description: 'Modalidade de atendimento (INTERNAL, REMOTE, EXTERNAL)',
    enum: ServiceModality,
    required: false,
  })
  @IsEnum(ServiceModality)
  @IsOptional()
  service_modality?: ServiceModality;

  @ApiProperty({ description: 'Descrição do trabalho realizado', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Preço por hora', required: false })
  @IsNumber()
  @IsOptional()
  unit_price?: number;

  @ApiProperty({ description: 'Distância percorrida em KM', required: false })
  @IsNumber()
  @IsOptional()
  travel_distance_km?: number;

  @ApiProperty({ description: 'Custo do deslocamento', required: false })
  @IsNumber()
  @IsOptional()
  travel_cost?: number;

  @ApiProperty({ description: 'ID do contrato no SIGE Cloud', required: false })
  @IsString()
  @IsOptional()
  contract_id?: string;

  @ApiProperty({ description: 'Enviar como resposta ao cliente (criar comentário)', required: false })
  @IsBoolean()
  @IsOptional()
  send_as_response?: boolean;

  @ApiProperty({ description: 'IDs dos anexos', required: false })
  @IsOptional()
  attachment_ids?: string[];
}

export class StartTimerDto {
  @ApiProperty({ description: 'ID do ticket' })
  @IsUUID()
  @IsNotEmpty()
  ticket_id: string;

  @ApiProperty({
    description: 'Tipo de apontamento',
    enum: AppointmentType,
    default: AppointmentType.SERVICE,
  })
  @IsEnum(AppointmentType)
  @IsOptional()
  type?: AppointmentType;

  @ApiProperty({
    description: 'Tipo de cobertura/faturamento',
    enum: ServiceCoverageType,
    default: ServiceCoverageType.CONTRACT,
  })
  @IsEnum(ServiceCoverageType)
  @IsOptional()
  coverage_type?: ServiceCoverageType;
}

export class StopTimerDto {
  @ApiProperty({ description: 'ID do apontamento com timer ativo' })
  @IsUUID()
  @IsNotEmpty()
  appointment_id: string;

  @ApiProperty({ description: 'ID da classificação de atendimento' })
  @IsUUID()
  @IsNotEmpty()
  pricing_config_id: string;

  @ApiProperty({
    description: 'Modalidade de atendimento (INTERNAL, REMOTE, EXTERNAL)',
    enum: ServiceModality,
  })
  @IsEnum(ServiceModality)
  @IsNotEmpty()
  service_modality: ServiceModality;

  @ApiProperty({
    description: 'Tipo de cobertura/faturamento',
    enum: ServiceCoverageType,
  })
  @IsEnum(ServiceCoverageType)
  @IsNotEmpty()
  coverage_type: ServiceCoverageType;

  @ApiProperty({ description: 'É garantia (zera o valor)', required: false })
  @IsBoolean()
  @IsOptional()
  is_warranty?: boolean;

  @ApiProperty({ description: 'Override manual de preço', required: false })
  @IsBoolean()
  @IsOptional()
  manual_price_override?: boolean;

  @ApiProperty({ description: 'Preço por hora manual (se manual_price_override = true)', required: false })
  @IsNumber()
  @IsOptional()
  manual_unit_price?: number;

  @ApiProperty({ description: 'Descrição do trabalho realizado', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Enviar como resposta ao cliente (criar comentário)', required: false })
  @IsBoolean()
  @IsOptional()
  send_as_response?: boolean;

  @ApiProperty({ description: 'IDs dos anexos', required: false })
  @IsOptional()
  attachment_ids?: string[];
}

export class UpdateAppointmentDto {
  @ApiProperty({ description: 'Data do apontamento', required: false })
  @IsDateString()
  @IsOptional()
  appointment_date?: string;

  @ApiProperty({ description: 'Hora inicial', required: false })
  @IsString()
  @IsOptional()
  start_time?: string;

  @ApiProperty({ description: 'Hora final', required: false })
  @IsString()
  @IsOptional()
  end_time?: string;

  @ApiProperty({ description: 'Descrição', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Preço unitário', required: false })
  @IsNumber()
  @IsOptional()
  unit_price?: number;

  @ApiProperty({ description: 'IDs dos anexos', required: false })
  @IsOptional()
  attachment_ids?: string[];
}

export class CalculatePriceDto {
  @ApiProperty({ description: 'ID do ticket' })
  @IsUUID()
  @IsNotEmpty()
  ticket_id: string;

  @ApiProperty({ description: 'Hora inicial (HH:MM)' })
  @IsString()
  @IsNotEmpty()
  start_time: string;

  @ApiProperty({ description: 'Hora final (HH:MM)' })
  @IsString()
  @IsNotEmpty()
  end_time: string;

  @ApiProperty({ description: 'ID da classificação de atendimento' })
  @IsUUID()
  @IsNotEmpty()
  pricing_config_id: string;

  @ApiProperty({
    description: 'Modalidade de atendimento (INTERNAL, REMOTE, EXTERNAL)',
    enum: ServiceModality,
  })
  @IsEnum(ServiceModality)
  @IsNotEmpty()
  service_modality: ServiceModality;

  @ApiProperty({
    description: 'Tipo de cobertura/faturamento',
    enum: ServiceCoverageType,
  })
  @IsEnum(ServiceCoverageType)
  @IsNotEmpty()
  coverage_type: ServiceCoverageType;

  @ApiProperty({ description: 'É garantia (zera o valor)', required: false })
  @IsBoolean()
  @IsOptional()
  is_warranty?: boolean;

  @ApiProperty({ description: 'Override manual de preço', required: false })
  @IsBoolean()
  @IsOptional()
  manual_price_override?: boolean;

  @ApiProperty({ description: 'Preço por hora manual (se manual_price_override = true)', required: false })
  @IsNumber()
  @IsOptional()
  manual_unit_price?: number;
}
