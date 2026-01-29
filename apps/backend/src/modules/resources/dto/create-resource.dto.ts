import { IsEnum, IsNotEmpty, IsOptional, IsString, IsBoolean, IsDateString, IsObject } from 'class-validator';
import { ResourceType, ResourceStatus } from '../entities/resource.entity';

export class CreateResourceDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(ResourceType)
  @IsNotEmpty()
  resource_type: ResourceType;

  @IsString()
  @IsNotEmpty()
  client_id: string;

  @IsString()
  @IsOptional()
  contract_id?: string;

  @IsString()
  @IsOptional()
  resource_group?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsEnum(ResourceStatus)
  @IsOptional()
  status?: ResourceStatus;

  @IsString()
  @IsOptional()
  assigned_user_name?: string;

  @IsString()
  @IsOptional()
  assigned_user_email?: string;

  @IsString()
  @IsOptional()
  manufacturer?: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsString()
  @IsOptional()
  serial_number?: string;

  @IsString()
  @IsOptional()
  asset_tag?: string;

  @IsDateString()
  @IsOptional()
  purchase_date?: string;

  @IsDateString()
  @IsOptional()
  warranty_expiry_date?: string;

  @IsString()
  @IsOptional()
  os_name?: string;

  @IsString()
  @IsOptional()
  os_version?: string;

  @IsString()
  @IsOptional()
  ip_address?: string;

  @IsString()
  @IsOptional()
  mac_address?: string;

  @IsString()
  @IsOptional()
  hostname?: string;

  @IsObject()
  @IsOptional()
  specifications?: Record<string, any>;

  @IsObject()
  @IsOptional()
  custom_fields?: Record<string, any>;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  image_url?: string;
}
