import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { UserRole } from '../../users/entities/user.entity';

export class UpdateUserPermissionsDto {
  @ApiProperty({
    description: 'Lista de permissoes extras do usuario',
    example: ['reports:export', 'timesheets:approve'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  permissions: string[];
}

export class UpdateUserRoleDto {
  @ApiProperty({
    description: 'Role fixo do usuario',
    enum: UserRole,
    example: UserRole.AGENT,
  })
  @IsEnum(UserRole)
  role: UserRole;
}

export class AssignCustomRoleDto {
  @ApiProperty({
    description: 'ID do perfil customizado',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  custom_role_id: string;
}

export class AuditLogQueryDto {
  @ApiPropertyOptional({
    description: 'ID do usuario alvo',
  })
  @IsUUID()
  @IsOptional()
  targetUserId?: string;

  @ApiPropertyOptional({
    description: 'ID do usuario que fez a alteracao',
  })
  @IsUUID()
  @IsOptional()
  changedById?: string;

  @ApiPropertyOptional({
    description: 'Tipo de acao',
  })
  @IsString()
  @IsOptional()
  action?: string;

  @ApiPropertyOptional({
    description: 'Data inicial',
  })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Data final',
  })
  @IsString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Pagina',
    default: 1,
  })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({
    description: 'Itens por pagina',
    default: 20,
  })
  @IsOptional()
  perPage?: number;
}
