import { IsString, MaxLength, IsOptional, IsEmail, Matches } from 'class-validator';

/**
 * DTO para atualizar informações da empresa no ServiceDesk
 */
export class UpdateCompanyInfoDto {
  @IsString()
  @MaxLength(255)
  @IsOptional()
  company_trade_name?: string;

  @IsString()
  @Matches(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, {
    message: 'CNPJ deve estar no formato XX.XXX.XXX/XXXX-XX',
  })
  @IsOptional()
  company_cnpj?: string;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  company_legal_name?: string;

  @IsString()
  @IsOptional()
  company_address?: string;

  @IsString()
  @MaxLength(20)
  @IsOptional()
  company_phone?: string;

  @IsEmail({}, { message: 'Email da empresa inválido' })
  @IsOptional()
  company_email?: string;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  company_website?: string;
}
