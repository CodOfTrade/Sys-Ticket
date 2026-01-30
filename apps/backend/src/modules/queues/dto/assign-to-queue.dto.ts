import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class AssignToQueueDto {
  @ApiProperty({
    description: 'ID da fila',
    example: 'uuid-da-fila',
  })
  @IsUUID()
  @IsNotEmpty()
  queue_id: string;

  @ApiPropertyOptional({
    description: 'Se deve distribuir automaticamente para um membro da fila',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  auto_assign_to_member?: boolean;
}
