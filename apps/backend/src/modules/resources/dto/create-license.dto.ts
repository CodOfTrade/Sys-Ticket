import { IsEnum, IsNotEmpty, IsOptional, IsString, IsBoolean, IsDateString, IsObject, IsNumber, IsInt } from 'class-validator';
import { LicenseType, LicenseStatus } from '../entities/resource-license.entity';

export class CreateLicenseDto {
  @IsString()
  @IsOptional()
  license_key?: string;

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
}
