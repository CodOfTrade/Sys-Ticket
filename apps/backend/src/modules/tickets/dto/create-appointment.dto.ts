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

  @ApiProperty({ description: 'Descrição do trabalho realizado', required: false })
  @IsString()
  @IsOptional()
  description?: string;

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
}
