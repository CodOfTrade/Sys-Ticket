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
import { TimesheetsService } from './timesheets.service';
import { CreateTimesheetDto, UpdateTimesheetDto, QueryTimesheetDto } from './dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Timesheets')
@ApiBearerAuth('JWT-auth')
@Controller({ path: 'timesheets', version: '1' })
export class TimesheetsController {
  constructor(private readonly timesheetsService: TimesheetsService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar todos os timesheets',
    description: 'Retorna lista paginada de apontamentos de horas com filtros opcionais',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de timesheets retornada com sucesso',
  })
  async findAll(@Query() query: QueryTimesheetDto) {
    return this.timesheetsService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Obter estatísticas de timesheets',
    description: 'Retorna estatísticas de horas trabalhadas e valores',
  })
  @ApiQuery({ name: 'user_id', required: false })
  @ApiQuery({ name: 'start_date', required: false })
  @ApiQuery({ name: 'end_date', required: false })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas retornadas com sucesso',
  })
  async getStats(
    @Query('user_id') userId?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    return this.timesheetsService.getStats(userId, startDate, endDate);
  }

  @Get('unapproved')
  @ApiOperation({
    summary: 'Listar timesheets não aprovados',
    description: 'Retorna lista de apontamentos aguardando aprovação',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de timesheets não aprovados retornada com sucesso',
  })
  async findUnapproved(@Query() query: QueryTimesheetDto) {
    return this.timesheetsService.findUnapproved(query);
  }

  @Get('uninvoiced')
  @ApiOperation({
    summary: 'Listar timesheets não faturados',
    description: 'Retorna lista de apontamentos faturáveis ainda não incluídos em OS',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de timesheets não faturados retornada com sucesso',
  })
  async findUninvoiced(@Query() query: QueryTimesheetDto) {
    return this.timesheetsService.findUninvoiced(query);
  }

  @Get('ticket/:ticketId')
  @ApiOperation({
    summary: 'Listar timesheets por ticket',
    description: 'Retorna lista de apontamentos de um ticket específico',
  })
  @ApiParam({ name: 'ticketId', description: 'UUID do ticket' })
  @ApiResponse({
    status: 200,
    description: 'Lista de timesheets do ticket retornada com sucesso',
  })
  async findByTicket(
    @Param('ticketId') ticketId: string,
    @Query() query: QueryTimesheetDto,
  ) {
    return this.timesheetsService.findByTicket(ticketId, query);
  }

  @Get('user/:userId')
  @ApiOperation({
    summary: 'Listar timesheets por usuário',
    description: 'Retorna lista de apontamentos de um usuário específico',
  })
  @ApiParam({ name: 'userId', description: 'UUID do usuário' })
  @ApiResponse({
    status: 200,
    description: 'Lista de timesheets do usuário retornada com sucesso',
  })
  async findByUser(
    @Param('userId') userId: string,
    @Query() query: QueryTimesheetDto,
  ) {
    return this.timesheetsService.findByUser(userId, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Buscar timesheet por ID',
    description: 'Retorna um apontamento específico com todos os relacionamentos',
  })
  @ApiParam({ name: 'id', description: 'UUID do timesheet' })
  @ApiResponse({
    status: 200,
    description: 'Timesheet encontrado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Timesheet não encontrado',
  })
  async findOne(@Param('id') id: string) {
    return this.timesheetsService.findOne(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Criar novo timesheet',
    description: 'Cria um novo apontamento de horas',
  })
  @ApiResponse({
    status: 201,
    description: 'Timesheet criado com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos',
  })
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createTimesheetDto: CreateTimesheetDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.timesheetsService.create(createTimesheetDto, userId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar timesheet',
    description: 'Atualiza os dados de um apontamento existente',
  })
  @ApiParam({ name: 'id', description: 'UUID do timesheet' })
  @ApiResponse({
    status: 200,
    description: 'Timesheet atualizado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Timesheet não encontrado',
  })
  @ApiResponse({
    status: 400,
    description: 'Timesheet já faturado não pode ser alterado',
  })
  async update(
    @Param('id') id: string,
    @Body() updateTimesheetDto: UpdateTimesheetDto,
  ) {
    return this.timesheetsService.update(id, updateTimesheetDto);
  }

  @Patch(':id/stop')
  @ApiOperation({
    summary: 'Finalizar timesheet em andamento',
    description: 'Para o cronômetro e calcula duração e valores finais',
  })
  @ApiParam({ name: 'id', description: 'UUID do timesheet' })
  @ApiResponse({
    status: 200,
    description: 'Timesheet finalizado com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Timesheet já finalizado',
  })
  async stop(@Param('id') id: string) {
    return this.timesheetsService.stop(id);
  }

  @Patch(':id/approve')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Aprovar timesheet',
    description: 'Marca um apontamento como aprovado (requer permissão)',
  })
  @ApiParam({ name: 'id', description: 'UUID do timesheet' })
  @ApiResponse({
    status: 200,
    description: 'Timesheet aprovado com sucesso',
  })
  @ApiResponse({
    status: 403,
    description: 'Sem permissão para aprovar timesheets',
  })
  async approve(
    @Param('id') id: string,
    @CurrentUser('id') approvedById: string,
  ) {
    return this.timesheetsService.approve(id, approvedById);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Remover timesheet',
    description: 'Remove um apontamento do sistema (requer permissão)',
  })
  @ApiParam({ name: 'id', description: 'UUID do timesheet' })
  @ApiResponse({
    status: 204,
    description: 'Timesheet removido com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Timesheet não encontrado',
  })
  @ApiResponse({
    status: 400,
    description: 'Timesheet já faturado não pode ser removido',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.timesheetsService.remove(id);
  }
}
