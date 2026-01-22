import { IsOptional, IsString, IsEnum, IsBoolean, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ResourceType, ResourceStatus } from '../entities/resource.entity';

export class QueryResourceDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  perPage?: number = 10;

  @IsOptional()
  @IsString()
  client_id?: string;

  @IsOptional()
  @IsString()
  contract_id?: string;

  @IsOptional()
  @IsEnum(ResourceType)
  resource_type?: ResourceType;

  @IsOptional()
  @IsEnum(ResourceStatus)
  status?: ResourceStatus;

  @IsOptional()
  @IsString()
  resource_group?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  is_online?: boolean;

  @IsOptional()
  @IsString()
  search?: string;
}
