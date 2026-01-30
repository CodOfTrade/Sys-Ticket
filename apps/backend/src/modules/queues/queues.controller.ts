import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { QueuesService } from './queues.service';
import { CreateQueueDto, UpdateQueueDto, AssignToQueueDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Queues')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'queues', version: '1' })
export class QueuesController {
  constructor(private readonly queuesService: QueuesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Criar nova fila' })
  @ApiResponse({ status: 201, description: 'Fila criada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  create(@Body() createQueueDto: CreateQueueDto) {
    return this.queuesService.create(createQueueDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas as filas' })
  @ApiQuery({
    name: 'service_desk_id',
    required: false,
    description: 'Filtrar por ID da mesa de serviço',
  })
  @ApiResponse({ status: 200, description: 'Lista de filas' })
  findAll(@Query('service_desk_id') serviceDeskId?: string) {
    return this.queuesService.findAll(serviceDeskId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar fila por ID' })
  @ApiResponse({ status: 200, description: 'Fila encontrada' })
  @ApiResponse({ status: 404, description: 'Fila não encontrada' })
  findOne(@Param('id') id: string) {
    return this.queuesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Atualizar fila' })
  @ApiResponse({ status: 200, description: 'Fila atualizada com sucesso' })
  @ApiResponse({ status: 404, description: 'Fila não encontrada' })
  update(@Param('id') id: string, @Body() updateQueueDto: UpdateQueueDto) {
    return this.queuesService.update(id, updateQueueDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Deletar fila' })
  @ApiResponse({ status: 200, description: 'Fila deletada com sucesso' })
  @ApiResponse({ status: 404, description: 'Fila não encontrada' })
  @ApiResponse({
    status: 400,
    description: 'Não é possível deletar fila com tickets atribuídos',
  })
  remove(@Param('id') id: string) {
    return this.queuesService.remove(id);
  }

  @Post(':id/members/:userId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Adicionar membro à fila' })
  @ApiResponse({ status: 200, description: 'Membro adicionado com sucesso' })
  @ApiResponse({ status: 400, description: 'Usuário já é membro ou inválido' })
  @ApiResponse({ status: 404, description: 'Fila ou usuário não encontrado' })
  addMember(@Param('id') id: string, @Param('userId') userId: string) {
    return this.queuesService.addMember(id, userId);
  }

  @Delete(':id/members/:userId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Remover membro da fila' })
  @ApiResponse({ status: 200, description: 'Membro removido com sucesso' })
  @ApiResponse({ status: 404, description: 'Fila não encontrada' })
  removeMember(@Param('id') id: string, @Param('userId') userId: string) {
    return this.queuesService.removeMember(id, userId);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Obter estatísticas da fila' })
  @ApiResponse({ status: 200, description: 'Estatísticas da fila' })
  @ApiResponse({ status: 404, description: 'Fila não encontrada' })
  getStats(@Param('id') id: string) {
    return this.queuesService.getQueueStats(id);
  }

  @Post(':id/assign-ticket/:ticketId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT)
  @ApiOperation({ summary: 'Atribuir ticket à fila' })
  @ApiResponse({ status: 200, description: 'Ticket atribuído à fila com sucesso' })
  @ApiResponse({ status: 404, description: 'Fila ou ticket não encontrado' })
  @ApiResponse({
    status: 400,
    description: 'Fila pertence a uma mesa de serviço diferente',
  })
  assignTicket(
    @Param('id') id: string,
    @Param('ticketId') ticketId: string,
    @Body() assignDto: AssignToQueueDto,
    @Request() req: any,
  ) {
    // Garantir que o queue_id do body seja o mesmo do parâmetro
    assignDto.queue_id = id;
    return this.queuesService.assignTicketToQueue(
      ticketId,
      assignDto,
      req.user.sub,
    );
  }
}
