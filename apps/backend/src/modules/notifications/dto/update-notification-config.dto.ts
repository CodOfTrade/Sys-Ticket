import { IsOptional, IsBoolean, IsArray, IsString } from 'class-validator';

export class UpdateNotificationConfigDto {
  @IsOptional()
  @IsBoolean()
  notify_admins?: boolean;

  @IsOptional()
  @IsBoolean()
  email_admins?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  admin_user_ids?: string[];

  @IsOptional()
  @IsBoolean()
  notify_clients?: boolean;

  @IsOptional()
  @IsBoolean()
  email_clients?: boolean;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
