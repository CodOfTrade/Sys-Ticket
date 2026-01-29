import { Controller, Get, Post, Patch, Delete, Query, Param, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientsService } from './clients.service';
import { SigeSyncService } from './sige-sync.service';
import { CreateServiceOrderDto } from './interfaces/sige-service-order.interface';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { ClientContact } from './entities/client-contact.entity';

@ApiTags('Clients')
@ApiBearerAuth('JWT-auth')
@Controller({ path: 'clients', version: '1' })
export class ClientsController {
  constructor(
    private readonly clientsService: ClientsService,
    private readonly sigeSyncService: SigeSyncService,
    @InjectRepository(ClientContact)
    private contactRepository: Repository<ClientContact>,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Listar clientes do SIGE Cloud' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'per_page', required: false, type: Number, example: 50 })
  @ApiResponse({ status: 200, description: 'Lista de clientes retornada com sucesso' })
  async findAll(
    @Query('page') page = 1,
    @Query('per_page') perPage = 50,
    @Query('includeInactive') includeInactive = 'false',
  ) {
    return this.clientsService.findAll(page, perPage, includeInactive === 'true');
  }

  @Get('search')
  @Public()
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

  @Post('sync')
  @Public()
  @ApiOperation({ summary: 'Sincronizar dados do SIGE Cloud manualmente' })
  @ApiResponse({ status: 200, description: 'Sincronização iniciada com sucesso' })
  async syncSigeData() {
    // Executa sync em background
    this.sigeSyncService.syncAll().catch(err => {
      console.error('Erro na sincronização:', err);
    });

    return {
      success: true,
      message: 'Sincronização iniciada em background',
    };
  }

  @Get('contacts')
  @Public()
  @ApiOperation({ summary: 'Listar contatos de clientes' })
  @ApiQuery({ name: 'client_id', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  async findContacts(
    @Query('client_id') clientId?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const query = this.contactRepository
      .createQueryBuilder('contact')
      .where('contact.is_active = :isActive', { isActive: true })
      .orderBy('contact.name', 'ASC');

    if (clientId) {
      query.andWhere('contact.client_id = :clientId', { clientId });
    }

    // Contar total
    const total = await query.getCount();

    // Aplicar paginação
    const contacts = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      success: true,
      data: contacts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  @Post('contacts')
  @Public()
  @ApiOperation({ summary: 'Criar contato de cliente' })
  async createContact(
    @Body()
    body: {
      client_id: string;
      name: string;
      email?: string;
      phone?: string;
      department?: string;
      position?: string;
    },
  ) {
    const contact = this.contactRepository.create(body);
    await this.contactRepository.save(contact);
    return {
      success: true,
      data: contact,
    };
  }

  @Get('contacts/:id')
  @Public()
  @ApiOperation({ summary: 'Buscar contato por ID' })
  async findContact(@Param('id') id: string) {
    const contact = await this.contactRepository.findOne({ where: { id } });
    return {
      success: true,
      data: contact,
    };
  }

  @Patch('contacts/:id')
  @Public()
  @ApiOperation({ summary: 'Atualizar contato de cliente' })
  async updateContact(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      email?: string;
      phone?: string;
      department?: string;
      position?: string;
    },
  ) {
    await this.contactRepository.update(id, body);
    const contact = await this.contactRepository.findOne({ where: { id } });
    return {
      success: true,
      data: contact,
    };
  }

  @Delete('contacts/:id')
  @Public()
  @ApiOperation({ summary: 'Deletar contato de cliente' })
  async deleteContact(@Param('id') id: string) {
    await this.contactRepository.delete(id);
    return {
      success: true,
      message: 'Contato removido com sucesso',
    };
  }

  @Get('document/:document')
  @ApiOperation({ summary: 'Buscar cliente por CPF/CNPJ' })
  @ApiResponse({ status: 200, description: 'Cliente encontrado' })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  async searchByDocument(@Param('document') document: string) {
    return this.clientsService.searchByDocument(document);
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

  @Get('products/search')
  @Public()
  @ApiOperation({ summary: 'Buscar produtos no SIGE Cloud' })
  @ApiQuery({ name: 'query', required: true, type: String, description: 'Termo de busca' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'per_page', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Lista de produtos retornada com sucesso' })
  async searchProducts(
    @Query('query') query: string,
    @Query('page') page = 1,
    @Query('per_page') perPage = 20,
  ) {
    return this.clientsService.searchProducts(query, page, perPage);
  }

  @Get('products/:id')
  @Public()
  @ApiOperation({ summary: 'Buscar produto por ID no SIGE Cloud' })
  @ApiResponse({ status: 200, description: 'Produto encontrado' })
  @ApiResponse({ status: 404, description: 'Produto não encontrado' })
  async getProduct(@Param('id') id: string) {
    return this.clientsService.getProduct(id);
  }

  @Get('contract/client/:clientId')
  @Public()
  @ApiOperation({ summary: 'Listar contratos de um cliente' })
  @ApiResponse({ status: 200, description: 'Lista de contratos retornada com sucesso' })
  async getClientContracts(@Param('clientId') clientId: string) {
    const contracts = await this.clientsService.getClientContracts(clientId);
    return {
      success: true,
      data: contracts,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar cliente por ID' })
  @ApiResponse({ status: 200, description: 'Cliente encontrado' })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  async findOne(@Param('id') id: string) {
    return this.clientsService.findOne(id);
  }

  @Patch(':id')
  @Public()
  @ApiOperation({ summary: 'Atualizar cliente' })
  @ApiResponse({ status: 200, description: 'Cliente atualizado' })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  async updateClient(
    @Param('id') id: string,
    @Body() body: { allowUnlimitedAgents?: boolean },
  ) {
    return this.clientsService.updateClient(id, body);
  }
}
