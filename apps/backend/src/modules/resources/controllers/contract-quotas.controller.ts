import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ContractQuotasService } from '../services/contract-quotas.service';
import { CreateQuotaDto } from '../dto/create-quota.dto';
import { UpdateQuotaDto } from '../dto/update-quota.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('resources/quotas')
@UseGuards(JwtAuthGuard)
export class ContractQuotasController {
  constructor(private readonly quotasService: ContractQuotasService) {}

  @Post()
  async create(@Body() createQuotaDto: CreateQuotaDto) {
    return this.quotasService.create(createQuotaDto);
  }

  @Get('contract/:contractId')
  async findByContract(@Param('contractId') contractId: string) {
    return this.quotasService.findByContractId(contractId);
  }

  @Get('contract/:contractId/usage')
  async getUsage(@Param('contractId') contractId: string) {
    return this.quotasService.getUsage(contractId);
  }

  @Post('contract/:contractId/recalculate')
  async recalculateUsage(@Param('contractId') contractId: string) {
    return this.quotasService.recalculateUsage(contractId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateQuotaDto: UpdateQuotaDto,
  ) {
    return this.quotasService.update(id, updateQuotaDto);
  }
}
