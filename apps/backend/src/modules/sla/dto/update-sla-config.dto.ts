import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsInt,
  IsObject,
  ValidateNested,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SlaPriorityConfigDto {
  @ApiProperty({
    description: 'Tempo para primeira resposta (minutos)',
    example: 120,
  })
  @IsInt()
  @Min(1)
  first_response: number;

  @ApiProperty({
    description: 'Tempo para resolução (minutos)',
    example: 720,
  })
  @IsInt()
  @Min(1)
  resolution: number;
}

export class BusinessHoursConfigDto {
  @ApiProperty({
    description: 'Horário de início (formato: HH:mm)',
    example: '09:00',
  })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Formato de hora inválido. Use HH:mm',
  })
  start: string;

  @ApiProperty({
    description: 'Horário de término (formato: HH:mm)',
    example: '18:00',
  })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Formato de hora inválido. Use HH:mm',
  })
  end: string;

  @ApiProperty({
    description: 'Timezone (formato IANA)',
    example: 'America/Sao_Paulo',
  })
  @IsString()
  @IsNotEmpty()
  timezone: string;
}

export class SlaPrioritiesConfigDto {
  @ApiProperty({ type: SlaPriorityConfigDto })
  @ValidateNested()
  @Type(() => SlaPriorityConfigDto)
  low: SlaPriorityConfigDto;

  @ApiProperty({ type: SlaPriorityConfigDto })
  @ValidateNested()
  @Type(() => SlaPriorityConfigDto)
  medium: SlaPriorityConfigDto;

  @ApiProperty({ type: SlaPriorityConfigDto })
  @ValidateNested()
  @Type(() => SlaPriorityConfigDto)
  high: SlaPriorityConfigDto;

  @ApiProperty({ type: SlaPriorityConfigDto })
  @ValidateNested()
  @Type(() => SlaPriorityConfigDto)
  urgent: SlaPriorityConfigDto;
}

export class UpdateSlaConfigDto {
  @ApiProperty({
    description: 'Configurações de SLA por prioridade',
    type: SlaPrioritiesConfigDto,
  })
  @ValidateNested()
  @Type(() => SlaPrioritiesConfigDto)
  priorities: SlaPrioritiesConfigDto;

  @ApiProperty({
    description: 'Configuração de horário comercial',
    type: BusinessHoursConfigDto,
  })
  @ValidateNested()
  @Type(() => BusinessHoursConfigDto)
  business_hours: BusinessHoursConfigDto;

  @ApiProperty({
    description: 'Dias da semana de trabalho (0=Domingo, 1=Segunda, ..., 6=Sábado)',
    example: [1, 2, 3, 4, 5],
    type: [Number],
  })
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  working_days: number[];
}
