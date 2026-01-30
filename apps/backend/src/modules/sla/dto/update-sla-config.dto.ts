import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsInt,
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

export class BusinessHoursPeriodDto {
  @ApiProperty({
    description: 'Horário de início (formato: HH:mm)',
    example: '08:00',
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
}

export class BusinessHoursScheduleDto {
  @ApiProperty({
    description: 'Dia da semana (0=Domingo, 1=Segunda, ..., 6=Sábado)',
    example: 1,
  })
  @IsInt()
  @Min(0)
  @Max(6)
  day_of_week: number;

  @ApiProperty({
    description: 'Períodos de expediente no dia',
    type: [BusinessHoursPeriodDto],
    example: [
      { start: '08:00', end: '12:00' },
      { start: '14:00', end: '18:00' },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BusinessHoursPeriodDto)
  periods: BusinessHoursPeriodDto[];
}

export class BusinessHoursConfigDto {
  @ApiProperty({
    description: 'Timezone (formato IANA)',
    example: 'America/Sao_Paulo',
  })
  @IsString()
  @IsNotEmpty()
  timezone: string;

  @ApiProperty({
    description: 'Configuração de horários por dia da semana',
    type: [BusinessHoursScheduleDto],
    example: [
      {
        day_of_week: 1,
        periods: [
          { start: '08:00', end: '12:00' },
          { start: '14:00', end: '18:00' },
        ],
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BusinessHoursScheduleDto)
  schedules: BusinessHoursScheduleDto[];
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
}
