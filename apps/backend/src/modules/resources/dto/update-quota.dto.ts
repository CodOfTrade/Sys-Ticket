import { PartialType } from '@nestjs/mapped-types';
import { CreateQuotaDto } from './create-quota.dto';

export class UpdateQuotaDto extends PartialType(CreateQuotaDto) {}
