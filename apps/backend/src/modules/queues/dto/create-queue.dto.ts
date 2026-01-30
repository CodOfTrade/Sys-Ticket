import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsUUID,
  IsInt,
  IsObject,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { DistributionStrategy } from '../enums/distribution-strategy.enum';

export class CreateQueueDto {
  @ApiProperty({
    description: 'Nome da fila',
    example: 'Suporte N1',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: 'Descrição da fila',
    example: 'Fila para atendimentos de primeiro nível',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'ID da mesa de serviço',
    example: 'uuid-da-mesa',
  })
  @IsUUID()
  @IsNotEmpty()
  service_desk_id: string;

  @ApiPropertyOptional({
    description: 'Estratégia de distribuição de tickets',
    enum: DistributionStrategy,
    default: DistributionStrategy.MANUAL,
  })
  @IsEnum(DistributionStrategy)
  @IsOptional()
  distribution_strategy?: DistributionStrategy;

  @ApiPropertyOptional({
    description: 'Configuração de atribuição automática',
    example: {
      enabled: true,
      on_ticket_create: true,
      on_ticket_status_change: false,
      max_tickets_per_member: 10,
      priority_weight: true,
      skills_matching: false,
    },
  })
  @IsObject()
  @IsOptional()
  auto_assignment_config?: {
    enabled: boolean;
    on_ticket_create: boolean;
    on_ticket_status_change: boolean;
    max_tickets_per_member: number | null;
    priority_weight: boolean;
    skills_matching: boolean;
  };

  @ApiPropertyOptional({
    description: 'IDs dos membros (usuários) da fila',
    example: ['uuid-user-1', 'uuid-user-2'],
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  member_ids?: string[];

  @ApiPropertyOptional({
    description: 'Se a fila está ativa',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @ApiPropertyOptional({
    description: 'Cor da fila (hex color)',
    example: '#3B82F6',
  })
  @IsString()
  @IsOptional()
  @MaxLength(7)
  color?: string;

  @ApiPropertyOptional({
    description: 'Ordem de exibição',
    default: 0,
  })
  @IsInt()
  @IsOptional()
  @Min(0)
  display_order?: number;

  @ApiPropertyOptional({
    description: 'Configuração de SLA específica da fila. Se null, usa o SLA padrão do service_desk.',
    example: {
      priorities: {
        low: { first_response: 480, resolution: 2880 },
        medium: { first_response: 240, resolution: 1440 },
        high: { first_response: 120, resolution: 480 },
        urgent: { first_response: 60, resolution: 240 },
      },
    },
  })
  @IsObject()
  @IsOptional()
  sla_config?: {
    priorities: {
      low: { first_response: number; resolution: number };
      medium: { first_response: number; resolution: number };
      high: { first_response: number; resolution: number };
      urgent: { first_response: number; resolution: number };
    };
  } | null;
}
