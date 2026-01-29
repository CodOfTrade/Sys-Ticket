import { IsEnum, IsNotEmpty, IsOptional, IsString, IsBoolean, IsDateString, IsObject, IsNumber, IsInt, IsEmail, Min } from 'class-validator';
import { LicenseType, LicenseStatus, ActivationType, DurationType } from '../entities/resource-license.entity';

export class CreateLicenseDto {
  @IsString()
  @IsOptional()
  license_key?: string;

  @IsEnum(ActivationType)
  @IsOptional()
  activation_type?: ActivationType;

  @IsEmail()
  @IsOptional()
  linked_email?: string;

  @IsEnum(LicenseType)
  @IsNotEmpty()
  license_type: LicenseType;

  @IsString()
  @IsNotEmpty()
  product_name: string;

  @IsString()
  @IsOptional()
  product_version?: string;

  @IsString()
  @IsNotEmpty()
  client_id: string;

  @IsString()
  @IsOptional()
  contract_id?: string;

  @IsString()
  @IsOptional()
  resource_id?: string;

  @IsString()
  @IsOptional()
  assigned_to_user?: string;

  @IsEnum(LicenseStatus)
  @IsOptional()
  license_status?: LicenseStatus;

  @IsDateString()
  @IsOptional()
  purchase_date?: string;

  @IsDateString()
  @IsOptional()
  expiry_date?: string;

  @IsBoolean()
  @IsOptional()
  is_perpetual?: boolean;

  @IsEnum(DurationType)
  @IsOptional()
  duration_type?: DurationType;

  @IsInt()
  @IsOptional()
  @Min(1)
  duration_value?: number;

  @IsDateString()
  @IsOptional()
  activation_date?: string;

  @IsInt()
  @IsOptional()
  max_activations?: number;

  @IsString()
  @IsOptional()
  vendor?: string;

  @IsString()
  @IsOptional()
  purchase_order?: string;

  @IsNumber()
  @IsOptional()
  cost?: number;

  @IsObject()
  @IsOptional()
  custom_fields?: Record<string, any>;

  @IsString()
  @IsOptional()
  notes?: string;

  // Contato para notificações de vencimento
  @IsEmail()
  @IsOptional()
  notification_email?: string;

  @IsString()
  @IsOptional()
  requester_name?: string;

  @IsString()
  @IsOptional()
  requester_phone?: string;
}
