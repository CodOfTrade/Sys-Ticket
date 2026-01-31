import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateCustomRoleDto {
  @ApiProperty({
    description: 'Nome do perfil customizado',
    example: 'Supervisor N2',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Descricao do perfil',
    example: 'Supervisor de nivel 2 com acesso a relatorios',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Lista de permissoes do perfil',
    example: ['tickets:read', 'tickets:create', 'tickets:update'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  permissions: string[];

  @ApiPropertyOptional({
    description: 'Cor do perfil em hexadecimal',
    example: '#3B82F6',
    default: '#6B7280',
  })
  @IsString()
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'Cor deve estar no formato hexadecimal (#RRGGBB)',
  })
  color?: string;
}
