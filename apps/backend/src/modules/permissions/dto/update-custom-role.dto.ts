import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsOptional,
  IsBoolean,
  MaxLength,
  Matches,
} from 'class-validator';

export class UpdateCustomRoleDto {
  @ApiPropertyOptional({
    description: 'Nome do perfil customizado',
    example: 'Supervisor N2',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Descricao do perfil',
    example: 'Supervisor de nivel 2 com acesso a relatorios',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Lista de permissoes do perfil',
    example: ['tickets:read', 'tickets:create', 'tickets:update'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissions?: string[];

  @ApiPropertyOptional({
    description: 'Cor do perfil em hexadecimal',
    example: '#3B82F6',
  })
  @IsString()
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'Cor deve estar no formato hexadecimal (#RRGGBB)',
  })
  color?: string;

  @ApiPropertyOptional({
    description: 'Se o perfil esta ativo',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
