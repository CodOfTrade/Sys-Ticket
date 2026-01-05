import { IsString, IsNotEmpty, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CommentType, CommentVisibility } from '../entities/ticket-comment.entity';

export class CreateCommentDto {
  @ApiProperty({ description: 'Conteúdo do comentário' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    description: 'Tipo do comentário',
    enum: CommentType,
    default: CommentType.INTERNAL,
  })
  @IsEnum(CommentType)
  @IsOptional()
  type?: CommentType;

  @ApiProperty({
    description: 'Visibilidade do comentário',
    enum: CommentVisibility,
    default: CommentVisibility.PRIVATE,
  })
  @IsEnum(CommentVisibility)
  @IsOptional()
  visibility?: CommentVisibility;

  @ApiProperty({ description: 'Enviar como resposta ao cliente', required: false })
  @IsBoolean()
  @IsOptional()
  sent_to_client?: boolean;

  @ApiProperty({ description: 'IDs dos anexos', required: false })
  @IsOptional()
  attachment_ids?: string[];
}

export class UpdateCommentDto {
  @ApiProperty({ description: 'Novo conteúdo do comentário' })
  @IsString()
  @IsNotEmpty()
  content: string;
}
