import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SettingKey } from '../entities/system-setting.entity';

export class UpdateSettingDto {
  @IsEnum(SettingKey)
  key: SettingKey;

  @IsString()
  @IsOptional()
  value?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
