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
} from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { TicketCommentsService } from '../services/ticket-comments.service';
import { TicketAppointmentsService } from '../services/ticket-appointments.service';
import { TicketValuationsService } from '../services/ticket-valuations.service';
import { ChecklistsService } from '../services/checklists.service';
import { SigeServiceOrderService } from '../services/sige-service-order.service';
import { CreateCommentDto, UpdateCommentDto } from '../dto/create-comment.dto';
import {
  CreateAppointmentDto,
  StartTimerDto,
  StopTimerDto,
  UpdateAppointmentDto,
  CalculatePriceDto,
} from '../dto/create-appointment.dto';
import {
  CreateValuationDto,
  UpdateValuationDto,
  ApproveValuationDto,
} from '../dto/create-valuation.dto';
import {
  CreateChecklistTemplateDto,
  UpdateChecklistTemplateDto,
  AddChecklistToTicketDto,
  UpdateChecklistItemDto,
} from '../dto/create-checklist.dto';

@ApiTags('Ticket Details')
@ApiBearerAuth('JWT-auth')
@Controller({ path: 'tickets', version: '1' })
export class TicketDetailsController {
  constructor(
    private readonly commentsService: TicketCommentsService,
    private readonly appointmentsService: TicketAppointmentsService,
    private readonly valuationsService: TicketValuationsService,
    private readonly checklistsService: ChecklistsService,
    private readonly sigeServiceOrderService: SigeServiceOrderService,
  ) {}

  // ==================== COMENTÁRIOS ====================

  @Post(':ticketId/comments')
  @ApiOperation({ summary: 'Adicionar comentário ao ticket' })
  @ApiParam({ name: 'ticketId', description: 'ID do ticket' })
  async createComment(
    @Param('ticketId') ticketId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser('id') userId: string,
  ) {
    const comment = await this.commentsService.create(userId, dto, ticketId);
    return { success: true, data: comment };
  }

  @Get(':ticketId/comments')
  @ApiOperation({ summary: 'Listar comentários do ticket' })
  @ApiParam({ name: 'ticketId', description: 'ID do ticket' })
  async getComments(
    @Param('ticketId') ticketId: string,
    @Query('type') type?: string,
  ) {
    const comments = await this.commentsService.findAll(ticketId, type);
    return { success: true, data: comments };
  }

  @Patch('comments/:id')
  @ApiOperation({ summary: 'Editar comentário' })
  @ApiParam({ name: 'id', description: 'ID do comentário' })
  async updateComment(
    @Param('id') id: string,
    @Body() dto: UpdateCommentDto,
    @CurrentUser('id') userId: string,
  ) {
    const comment = await this.commentsService.update(id, userId, dto);
    return { success: true, data: comment };
  }

  @Delete('comments/:id')
  @ApiOperation({ summary: 'Remover comentário' })
  @ApiParam({ name: 'id', description: 'ID do comentário' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteComment(@Param('id') id: string, @CurrentUser('id') userId: string) {
    await this.commentsService.remove(id, userId);
  }

  // ==================== APONTAMENTOS ====================

  @Post('appointments')
  @ApiOperation({ summary: 'Criar apontamento manual' })
  async createAppointment(
    @Body() dto: CreateAppointmentDto,
    @CurrentUser('id') userId: string,
  ) {
    const appointment = await this.appointmentsService.create(userId, dto);
    return { success: true, data: appointment };
  }

  @Post('appointments/calculate-price')
  @ApiOperation({ summary: 'Calcular preço estimado de apontamento' })
  async calculateAppointmentPrice(@Body() dto: CalculatePriceDto) {
    const pricing = await this.appointmentsService.calculatePriceEstimate(dto);
    return { success: true, data: pricing };
  }

  @Post('appointments/timer/start')
  @ApiOperation({ summary: 'Iniciar timer de apontamento' })
  async startTimer(@Body() dto: StartTimerDto, @CurrentUser('id') userId: string) {
    const appointment = await this.appointmentsService.startTimer(userId, dto);
    return { success: true, data: appointment };
  }

  @Post('appointments/timer/stop')
  @ApiOperation({ summary: 'Parar timer de apontamento' })
  async stopTimer(@Body() dto: StopTimerDto, @CurrentUser('id') userId: string) {
    const appointment = await this.appointmentsService.stopTimer(userId, dto);
    return { success: true, data: appointment };
  }

  @Get('appointments/timer/active')
  @ApiOperation({ summary: 'Obter timer ativo do usuário' })
  async getActiveTimer(@CurrentUser('id') userId: string) {
    const timer = await this.appointmentsService.getActiveTimer(userId);
    return { success: true, data: timer };
  }

  @Get(':ticketId/appointments')
  @ApiOperation({ summary: 'Listar apontamentos do ticket' })
  @ApiParam({ name: 'ticketId', description: 'ID do ticket' })
  async getAppointments(@Param('ticketId') ticketId: string) {
    const appointments = await this.appointmentsService.findAll(ticketId);
    return { success: true, data: appointments };
  }

  @Get(':ticketId/appointments/summary')
  @ApiOperation({ summary: 'Obter resumo de apontamentos do ticket' })
  @ApiParam({ name: 'ticketId', description: 'ID do ticket' })
  async getAppointmentsSummary(@Param('ticketId') ticketId: string) {
    const totalHours = await this.appointmentsService.getTotalHours(ticketId);
    const totalCost = await this.appointmentsService.getTotalCost(ticketId);
    return {
      success: true,
      data: { total_hours: totalHours, total_cost: totalCost },
    };
  }

  @Patch('appointments/:id')
  @ApiOperation({ summary: 'Atualizar apontamento' })
  @ApiParam({ name: 'id', description: 'ID do apontamento' })
  async updateAppointment(
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentDto,
    @CurrentUser('id') userId: string,
  ) {
    const appointment = await this.appointmentsService.update(id, userId, dto);
    return { success: true, data: appointment };
  }

  @Delete('appointments/:id')
  @ApiOperation({ summary: 'Remover apontamento' })
  @ApiParam({ name: 'id', description: 'ID do apontamento' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAppointment(@Param('id') id: string, @CurrentUser('id') userId: string) {
    await this.appointmentsService.remove(id, userId);
  }

  // ==================== VALORIZAÇÃO ====================

  @Post('valuations')
  @ApiOperation({ summary: 'Adicionar valorização ao ticket' })
  async createValuation(
    @Body() dto: CreateValuationDto,
    @CurrentUser('id') userId: string,
  ) {
    const valuation = await this.valuationsService.create(userId, dto);
    return { success: true, data: valuation };
  }

  @Get(':ticketId/valuations')
  @ApiOperation({ summary: 'Listar valorizações do ticket' })
  @ApiParam({ name: 'ticketId', description: 'ID do ticket' })
  async getValuations(
    @Param('ticketId') ticketId: string,
    @Query('category') category?: string,
  ) {
    const valuations = await this.valuationsService.findAll(ticketId, category);
    return { success: true, data: valuations };
  }

  @Get(':ticketId/valuations/summary')
  @ApiOperation({ summary: 'Obter resumo de valorização do ticket' })
  @ApiParam({ name: 'ticketId', description: 'ID do ticket' })
  async getValuationSummary(@Param('ticketId') ticketId: string) {
    const summary = await this.valuationsService.getTotalValuation(ticketId);
    return { success: true, data: summary };
  }

  @Patch('valuations/:id')
  @ApiOperation({ summary: 'Atualizar valorização' })
  @ApiParam({ name: 'id', description: 'ID da valorização' })
  async updateValuation(
    @Param('id') id: string,
    @Body() dto: UpdateValuationDto,
    @CurrentUser('id') userId: string,
  ) {
    const valuation = await this.valuationsService.update(id, userId, dto);
    return { success: true, data: valuation };
  }

  @Post('valuations/approve')
  @ApiOperation({ summary: 'Aprovar/Rejeitar valorização' })
  async approveValuation(
    @Body() dto: ApproveValuationDto,
    @CurrentUser('id') userId: string,
  ) {
    const valuation = await this.valuationsService.approve(userId, dto);
    return { success: true, data: valuation };
  }

  @Delete('valuations/:id')
  @ApiOperation({ summary: 'Remover valorização' })
  @ApiParam({ name: 'id', description: 'ID da valorização' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteValuation(@Param('id') id: string, @CurrentUser('id') userId: string) {
    await this.valuationsService.remove(id, userId);
  }

  // ==================== CHECKLISTS - TEMPLATES ====================

  @Post('checklists/templates')
  @ApiOperation({ summary: 'Criar template de checklist' })
  async createChecklistTemplate(
    @Body() dto: CreateChecklistTemplateDto,
    @CurrentUser('id') userId: string,
  ) {
    const checklist = await this.checklistsService.createTemplate(userId, dto);
    return { success: true, data: checklist };
  }

  @Get('checklists/templates')
  @ApiOperation({ summary: 'Listar templates de checklist' })
  async getChecklistTemplates(
    @Query('service_desk_id') serviceDeskId?: string,
    @Query('category') category?: string,
    @Query('include_inactive') includeInactive?: string,
  ) {
    const includeInactiveFlag = includeInactive === 'true';
    const templates = await this.checklistsService.findTemplates(serviceDeskId, category, includeInactiveFlag);
    return { success: true, data: templates };
  }

  @Get('checklists/templates/:id')
  @ApiOperation({ summary: 'Buscar template de checklist por ID' })
  @ApiParam({ name: 'id', description: 'ID do template' })
  async getChecklistTemplate(@Param('id') id: string) {
    const template = await this.checklistsService.findTemplate(id);
    return { success: true, data: template };
  }

  @Patch('checklists/templates/:id')
  @ApiOperation({ summary: 'Atualizar template de checklist' })
  @ApiParam({ name: 'id', description: 'ID do template' })
  async updateChecklistTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateChecklistTemplateDto,
  ) {
    const checklist = await this.checklistsService.updateTemplate(id, dto);
    return { success: true, data: checklist };
  }

  @Delete('checklists/templates/:id')
  @ApiOperation({ summary: 'Excluir template de checklist permanentemente' })
  @ApiParam({ name: 'id', description: 'ID do template' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteChecklistTemplate(@Param('id') id: string) {
    await this.checklistsService.deleteTemplate(id);
  }

  // ==================== CHECKLISTS - TICKET ====================

  @Post(':ticketId/checklists')
  @ApiOperation({ summary: 'Adicionar checklist ao ticket' })
  @ApiParam({ name: 'ticketId', description: 'ID do ticket' })
  async addChecklistToTicket(
    @Param('ticketId') ticketId: string,
    @Body() dto: AddChecklistToTicketDto,
    @CurrentUser('id') userId: string,
  ) {
    const ticketChecklist = await this.checklistsService.addToTicket(userId, {
      ...dto,
      ticket_id: ticketId,
    });
    return { success: true, data: ticketChecklist };
  }

  @Get(':ticketId/checklists')
  @ApiOperation({ summary: 'Listar checklists do ticket' })
  @ApiParam({ name: 'ticketId', description: 'ID do ticket' })
  async getTicketChecklists(@Param('ticketId') ticketId: string) {
    const checklists = await this.checklistsService.findTicketChecklists(ticketId);
    return { success: true, data: checklists };
  }

  @Patch('checklists/:checklistId/items')
  @ApiOperation({ summary: 'Atualizar item do checklist' })
  @ApiParam({ name: 'checklistId', description: 'ID do checklist do ticket' })
  async updateChecklistItem(
    @Param('checklistId') checklistId: string,
    @Body() dto: UpdateChecklistItemDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('name') userName: string,
  ) {
    const checklist = await this.checklistsService.updateItem(
      checklistId,
      userId,
      userName,
      dto,
    );
    return { success: true, data: checklist };
  }

  @Delete(':ticketId/checklists/:checklistId')
  @ApiOperation({ summary: 'Remover checklist do ticket' })
  @ApiParam({ name: 'ticketId', description: 'ID do ticket' })
  @ApiParam({ name: 'checklistId', description: 'ID do checklist' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeChecklistFromTicket(@Param('checklistId') checklistId: string) {
    await this.checklistsService.removeFromTicket(checklistId);
  }

  // ==================== SIGE / ORDEM DE SERVIÇO ====================

  @Get('sige/empresas')
  @ApiOperation({ summary: 'Listar empresas cadastradas no SIGE Cloud' })
  @ApiResponse({ status: 200, description: 'Lista de empresas retornada com sucesso' })
  async getSigeEmpresas() {
    const empresas = await this.sigeServiceOrderService.getSigeEmpresas();
    return { success: true, data: empresas };
  }

  @Get(':ticketId/billing-summary')
  @ApiOperation({ summary: 'Obter resumo de faturamento do ticket' })
  @ApiParam({ name: 'ticketId', description: 'ID do ticket' })
  @ApiResponse({ status: 200, description: 'Resumo de faturamento retornado com sucesso' })
  async getBillingSummary(@Param('ticketId') ticketId: string) {
    const summary = await this.sigeServiceOrderService.getTicketBillingSummary(ticketId);
    return { success: true, data: summary };
  }

  @Post(':ticketId/create-service-order')
  @ApiOperation({ summary: 'Criar Ordem de Serviço no SIGE Cloud' })
  @ApiParam({ name: 'ticketId', description: 'ID do ticket' })
  @ApiResponse({ status: 200, description: 'OS criada com sucesso no SIGE' })
  @ApiResponse({ status: 400, description: 'Erro ao criar OS no SIGE' })
  async createServiceOrder(
    @Param('ticketId') ticketId: string,
    @CurrentUser('id') userId: string,
    @Body() body?: { observacoes?: string },
  ) {
    const result = await this.sigeServiceOrderService.createServiceOrderFromTicket(ticketId, userId, body?.observacoes);

    if (!result.success) {
      return { success: false, message: result.message };
    }

    return {
      success: true,
      data: {
        sigeOrderId: result.sigeOrderId,
        totalValue: result.totalValue,
      },
      message: result.message,
    };
  }

  // ============ HISTÓRICO ============

  @Get(':ticketId/history')
  @ApiOperation({ summary: 'Buscar histórico de alterações do ticket' })
  @ApiParam({ name: 'ticketId', description: 'ID do ticket' })
  @ApiResponse({ status: 200, description: 'Histórico retornado com sucesso' })
  async getTicketHistory(@Param('ticketId') ticketId: string) {
    // TODO: Implementar serviço de histórico completo
    // Por enquanto retorna array vazio para não quebrar o frontend
    return { success: true, data: [], errors: [] };
  }
}
