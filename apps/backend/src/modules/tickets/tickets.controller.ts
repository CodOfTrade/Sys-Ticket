import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { CreateTicketDto, UpdateTicketDto, QueryTicketDto } from './dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '../users/entities/user.entity';
import { PaginatedResult } from './interfaces/paginated-result.interface';
import { Ticket } from './entities/ticket.entity';

@ApiTags('Tickets')
@ApiBearerAuth('JWT-auth')
@Controller({ path: 'tickets', version: '1' })
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Listar todos os tickets',
    description: 'Retorna lista paginada de tickets com filtros opcionais',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de tickets retornada com sucesso',
  })
  async findAll(@Query() query: QueryTicketDto) {
    return this.ticketsService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Obter estatísticas de tickets',
    description: 'Retorna estatísticas gerais dos tickets',
  })
  @ApiQuery({ name: 'service_desk_id', required: false })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas retornadas com sucesso',
  })
  async getStats(@Query('service_desk_id') serviceDeskId?: string) {
    return this.ticketsService.getStats(serviceDeskId);
  }

  @Get('unassigned')
  @ApiOperation({
    summary: 'Listar tickets não atribuídos',
    description: 'Retorna lista de tickets sem atendente responsável',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de tickets não atribuídos retornada com sucesso',
  })
  async findUnassigned(@Query() query: QueryTicketDto) {
    return this.ticketsService.findUnassigned(query);
  }

  @Get('client/:clientId')
  @ApiOperation({
    summary: 'Listar tickets por cliente',
    description: 'Retorna lista de tickets de um cliente específico (SIGE Cloud)',
  })
  @ApiParam({ name: 'clientId', description: 'ID do cliente no SIGE Cloud' })
  @ApiResponse({
    status: 200,
    description: 'Lista de tickets do cliente retornada com sucesso',
  })
  async findByClient(
    @Param('clientId') clientId: string,
    @Query() query: QueryTicketDto,
  ) {
    return this.ticketsService.findByClient(clientId, query);
  }

  @Get('assignee/:assigneeId')
  @ApiOperation({
    summary: 'Listar tickets por atendente',
    description: 'Retorna lista de tickets atribuídos a um atendente específico',
  })
  @ApiParam({ name: 'assigneeId', description: 'ID do atendente' })
  @ApiResponse({
    status: 200,
    description: 'Lista de tickets do atendente retornada com sucesso',
  })
  async findByAssignee(
    @Param('assigneeId') assigneeId: string,
    @Query() query: QueryTicketDto,
  ) {
    return this.ticketsService.findByAssignee(assigneeId, query);
  }

  @Get('number/:ticketNumber')
  @ApiOperation({
    summary: 'Buscar ticket por número',
    description: 'Retorna um ticket específico pelo seu número',
  })
  @ApiParam({
    name: 'ticketNumber',
    description: 'Número do ticket (ex: TKT-2024-000001)',
  })
  @ApiResponse({
    status: 200,
    description: 'Ticket encontrado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Ticket não encontrado',
  })
  async findByNumber(@Param('ticketNumber') ticketNumber: string) {
    return this.ticketsService.findByNumber(ticketNumber);
  }

  @Get(':id')
  @Public()
  @ApiOperation({
    summary: 'Buscar ticket por ID',
    description: 'Retorna um ticket específico com todos os relacionamentos',
  })
  @ApiParam({ name: 'id', description: 'UUID do ticket' })
  @ApiResponse({
    status: 200,
    description: 'Ticket encontrado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Ticket não encontrado',
  })
  async findOne(@Param('id') id: string) {
    return this.ticketsService.findOne(id);
  }

  @Post()
  @Public()
  @ApiOperation({
    summary: 'Criar novo ticket',
    description: 'Cria um novo ticket no sistema',
  })
  @ApiResponse({
    status: 201,
    description: 'Ticket criado com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos',
  })
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createTicketDto: CreateTicketDto,
    @CurrentUser('id') userId?: string,
  ) {
    return this.ticketsService.create(createTicketDto, userId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar ticket',
    description: 'Atualiza os dados de um ticket existente',
  })
  @ApiParam({ name: 'id', description: 'UUID do ticket' })
  @ApiResponse({
    status: 200,
    description: 'Ticket atualizado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Ticket não encontrado',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos',
  })
  async update(
    @Param('id') id: string,
    @Body() updateTicketDto: UpdateTicketDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.ticketsService.update(id, updateTicketDto, userId);
  }

  @Patch(':id/assign/:assigneeId')
  @ApiOperation({
    summary: 'Atribuir ticket a um atendente',
    description: 'Atribui um ticket a um atendente específico',
  })
  @ApiParam({ name: 'id', description: 'UUID do ticket' })
  @ApiParam({ name: 'assigneeId', description: 'UUID do atendente' })
  @ApiResponse({
    status: 200,
    description: 'Ticket atribuído com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Ticket não encontrado',
  })
  async assign(
    @Param('id') id: string,
    @Param('assigneeId') assigneeId: string,
    @CurrentUser('id') userId?: string,
  ) {
    return this.ticketsService.assign(id, assigneeId, userId);
  }

  @Patch(':id/unassign')
  @ApiOperation({
    summary: 'Remover atribuição de ticket',
    description: 'Remove o atendente responsável do ticket',
  })
  @ApiParam({ name: 'id', description: 'UUID do ticket' })
  @ApiResponse({
    status: 200,
    description: 'Atribuição removida com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Ticket não encontrado',
  })
  async unassign(@Param('id') id: string, @CurrentUser('id') userId?: string) {
    return this.ticketsService.unassign(id, userId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Remover ticket',
    description: 'Remove um ticket do sistema (requer permissão de admin ou gerente)',
  })
  @ApiParam({ name: 'id', description: 'UUID do ticket' })
  @ApiResponse({
    status: 204,
    description: 'Ticket removido com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Ticket não encontrado',
  })
  @ApiResponse({
    status: 403,
    description: 'Sem permissão para remover tickets',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.ticketsService.remove(id);
  }

  // ========================================
  // ENDPOINTS DE FOLLOWERS (SEGUIDORES)
  // ========================================

  @Get(':id/followers')
  @Public()
  @ApiOperation({
    summary: 'Listar seguidores do ticket',
    description: 'Retorna lista de seguidores de um ticket',
  })
  @ApiParam({ name: 'id', description: 'UUID do ticket' })
  @ApiResponse({
    status: 200,
    description: 'Lista de seguidores retornada com sucesso',
  })
  async getFollowers(@Param('id') id: string) {
    return this.ticketsService.getFollowers(id);
  }

  @Post(':id/followers')
  @Public()
  @ApiOperation({
    summary: 'Adicionar seguidor ao ticket',
    description: 'Adiciona um novo seguidor ao ticket (pode ser usuário do sistema ou email externo)',
  })
  @ApiParam({ name: 'id', description: 'UUID do ticket' })
  @ApiResponse({
    status: 201,
    description: 'Seguidor adicionado com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou seguidor já existe',
  })
  @HttpCode(HttpStatus.CREATED)
  async addFollower(
    @Param('id') id: string,
    @Body() data: { user_id?: string; email?: string; name?: string },
    @CurrentUser('id') userId?: string,
  ) {
    return this.ticketsService.addFollower(id, data, userId);
  }

  @Delete(':id/followers/:followerId')
  @Public()
  @ApiOperation({
    summary: 'Remover seguidor do ticket',
    description: 'Remove um seguidor do ticket',
  })
  @ApiParam({ name: 'id', description: 'UUID do ticket' })
  @ApiParam({ name: 'followerId', description: 'UUID do seguidor' })
  @ApiResponse({
    status: 204,
    description: 'Seguidor removido com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Seguidor não encontrado',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeFollower(
    @Param('id') id: string,
    @Param('followerId') followerId: string,
  ) {
    await this.ticketsService.removeFollower(id, followerId);
  }
}
