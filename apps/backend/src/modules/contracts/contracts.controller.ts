import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { ContractsService } from './contracts.service';

@ApiTags('Contracts')
@ApiBearerAuth('JWT-auth')
@Controller({ path: 'contracts', version: '1' })
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar contratos do SIGE Cloud' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'per_page', required: false, type: Number, example: 50 })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'inactive', 'suspended', 'expired'] })
  @ApiResponse({ status: 200, description: 'Lista de contratos retornada com sucesso' })
  async findAll(
    @Query('page') page = 1,
    @Query('per_page') perPage = 50,
    @Query('status') status?: string,
  ) {
    return this.contractsService.findAll(page, perPage, status);
  }

  @Get('client/:clientId')
  @ApiOperation({ summary: 'Buscar contratos de um cliente' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'per_page', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Contratos do cliente' })
  async findByClient(
    @Param('clientId') clientId: string,
    @Query('page') page = 1,
    @Query('per_page') perPage = 20,
  ) {
    return this.contractsService.findByClient(clientId, page, perPage);
  }

  @Get('client/:clientId/active')
  @ApiOperation({ summary: 'Buscar contratos ativos de um cliente' })
  @ApiResponse({ status: 200, description: 'Contratos ativos do cliente' })
  async getActiveContracts(@Param('clientId') clientId: string) {
    return this.contractsService.getActiveContracts(clientId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar contrato por ID' })
  @ApiResponse({ status: 200, description: 'Contrato encontrado' })
  @ApiResponse({ status: 404, description: 'Contrato não encontrado' })
  async findOne(@Param('id') id: string) {
    return this.contractsService.findOne(id);
  }
}
