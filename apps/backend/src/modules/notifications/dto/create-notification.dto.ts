import { IsString, IsOptional, IsUUID, IsBoolean } from 'class-validator';
import { NotificationType } from '../entities/notification.entity';

export class CreateNotificationDto {
  @IsString()
  type: NotificationType;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsUUID()
  @IsOptional()
  target_user_id?: string;

  @IsUUID()
  @IsOptional()
  client_id?: string;

  @IsUUID()
  @IsOptional()
  reference_id?: string;

  @IsString()
  @IsOptional()
  reference_type?: string;
}
