import { IsNotEmpty, IsString, IsInt, IsBoolean, IsOptional, IsObject, Min } from 'class-validator';

export class CreateQuotaDto {
  @IsString()
  @IsNotEmpty()
  contract_id: string;

  @IsString()
  @IsNotEmpty()
  client_id: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  computers_quota?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  printers_quota?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  monitors_quota?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  servers_quota?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  windows_licenses_quota?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  office_licenses_quota?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  antivirus_licenses_quota?: number;

  @IsObject()
  @IsOptional()
  custom_quotas?: Record<string, any>;

  @IsBoolean()
  @IsOptional()
  allow_exceed?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  alert_threshold?: number;
}
