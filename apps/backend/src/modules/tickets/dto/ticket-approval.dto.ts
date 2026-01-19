import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  MaxLength,
  IsEnum,
  ValidateIf,
} from 'class-validator';

/**
 * DTO para solicitar aprovação de um ticket
 */
export class RequestApprovalDto {
  @ApiPropertyOptional({ description: 'ID do ticket (preenchido automaticamente pela URL)' })
  @IsUUID()
  @IsOptional()
  ticket_id?: string;

  @ApiPropertyOptional({ description: 'ID do contato do cliente (solicitante registrado)' })
  @IsUUID()
  @IsOptional()
  contact_id?: string;

  @ApiPropertyOptional({ description: 'Email do aprovador (quando não é contato registrado)' })
  @ValidateIf((o) => !o.contact_id)
  @IsEmail({}, { message: 'Email inválido' })
  @IsNotEmpty({ message: 'Email do aprovador é obrigatório quando não há contato selecionado' })
  approver_email?: string;

  @ApiPropertyOptional({ description: 'Nome do aprovador (para email manual)' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  approver_name?: string;

  @ApiPropertyOptional({ description: 'Mensagem adicional no email de aprovação' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  message?: string;
}

/**
 * DTO para submeter decisão de aprovação (endpoint público)
 */
export class SubmitApprovalDto {
  @ApiProperty({ description: 'Decisão: approved ou rejected' })
  @IsEnum(['approved', 'rejected'], { message: 'Decisão deve ser "approved" ou "rejected"' })
  @IsNotEmpty()
  decision: 'approved' | 'rejected';

  @ApiPropertyOptional({ description: 'Comentário do aprovador' })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  comment?: string;
}

/**
 * DTO para editar email do aprovador
 */
export class UpdateApproverDto {
  @ApiProperty({ description: 'Novo email do aprovador' })
  @IsEmail({}, { message: 'Email inválido' })
  @IsNotEmpty()
  approver_email: string;

  @ApiPropertyOptional({ description: 'Nome do aprovador' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  approver_name?: string;
}

/**
 * DTO de resposta para aprovação
 */
export class ApprovalResponseDto {
  id: string;
  ticket_id: string;
  status: string;
  approver_email: string;
  approver_name: string | null;
  expires_at: Date;
  created_at: Date;
  responded_at: Date | null;
  comment: string | null;
  email_sent: boolean;
  email_sent_at: Date | null;
  email_retry_count: number;
}

/**
 * DTO para detalhes públicos da aprovação (sem dados sensíveis)
 */
export class PublicApprovalDetailsDto {
  ticket_number: string;
  ticket_title: string;
  ticket_description: string;
  client_name: string;
  requester_name: string;
  approver_name: string | null;
  status: string;
  expires_at: Date;
  is_expired: boolean;
  is_already_responded: boolean;
}
