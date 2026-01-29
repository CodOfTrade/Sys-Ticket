import { IsString, IsIn, IsOptional, IsArray, MaxLength } from 'class-validator';

export class CreateEmailTemplateDto {
  @IsString()
  @MaxLength(50)
  alert_type: string;

  @IsString()
  @IsIn(['admin', 'client'])
  target_audience: 'admin' | 'client';

  @IsString()
  @MaxLength(255)
  subject: string;

  @IsString()
  html_body: string;

  @IsString()
  text_body: string;

  @IsOptional()
  @IsArray()
  available_variables?: string[];
}
