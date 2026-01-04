import { Controller, Get, Post, Query, Param, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { CreateServiceOrderDto } from './interfaces/sige-service-order.interface';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Clients')
@ApiBearerAuth('JWT-auth')
@Controller({ path: 'clients', version: '1' })
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar clientes do SIGE Cloud' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'per_page', required: false, type: Number, example: 50 })
  @ApiResponse({ status: 200, description: 'Lista de clientes retornada com sucesso' })
  async findAll(
    @Query('page') page = 1,
    @Query('per_page') perPage = 50,
  ) {
    return this.clientsService.findAll(page, perPage);
  }

  @Get('search')
  @ApiOperation({ summary: 'Buscar clientes por nome' })
  @ApiQuery({ name: 'name', required: true, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'per_page', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Resultados da busca' })
  async searchByName(
    @Query('name') name: string,
    @Query('page') page = 1,
    @Query('per_page') perPage = 20,
  ) {
    return this.clientsService.searchByName(name, page, perPage);
  }

  @Get('document/:document')
  @ApiOperation({ summary: 'Buscar cliente por CPF/CNPJ' })
  @ApiResponse({ status: 200, description: 'Cliente encontrado' })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  async searchByDocument(@Param('document') document: string) {
    return this.clientsService.searchByDocument(document);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar cliente por ID' })
  @ApiResponse({ status: 200, description: 'Cliente encontrado' })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  async findOne(@Param('id') id: string) {
    return this.clientsService.findOne(id);
  }

  @Post('service-orders')
  @Roles('admin', 'manager', 'agent')
  @ApiOperation({ summary: 'Criar Ordem de Serviço no SIGE Cloud' })
  @ApiResponse({ status: 201, description: 'OS criada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async createServiceOrder(@Body() createDto: CreateServiceOrderDto) {
    return this.clientsService.createServiceOrder(createDto);
  }

  @Get('service-orders/:id')
  @ApiOperation({ summary: 'Buscar Ordem de Serviço por ID' })
  @ApiResponse({ status: 200, description: 'OS encontrada' })
  @ApiResponse({ status: 404, description: 'OS não encontrada' })
  async getServiceOrder(@Param('id') id: string) {
    return this.clientsService.getServiceOrder(id);
  }
}
