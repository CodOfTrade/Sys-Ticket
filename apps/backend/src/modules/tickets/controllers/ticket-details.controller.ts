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
  Req,
  Header,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { TicketCommentsService } from '../services/ticket-comments.service';
import { TicketAppointmentsService } from '../services/ticket-appointments.service';
import { TicketValuationsService } from '../services/ticket-valuations.service';
import { ChecklistsService } from '../services/checklists.service';
import { SigeServiceOrderService } from '../services/sige-service-order.service';
import { TicketHistoryService } from '../services/ticket-history.service';
import { TicketApprovalsService } from '../services/ticket-approvals.service';
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
import {
  RequestApprovalDto,
  SubmitApprovalDto,
  UpdateApproverDto,
} from '../dto/ticket-approval.dto';

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
    private readonly historyService: TicketHistoryService,
    private readonly approvalsService: TicketApprovalsService,
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
  async getTicketHistory(
    @Param('ticketId') ticketId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const history = await this.historyService.getTicketHistory(
      ticketId,
      limit || 100,
      offset || 0,
    );

    // Formatar para o frontend
    const formattedHistory = history.map((h) => ({
      id: h.id,
      action: h.action,
      field: h.field,
      old_value: h.old_value,
      new_value: h.new_value,
      description: h.description,
      created_at: h.created_at,
      user: h.user
        ? {
            id: h.user.id,
            name: h.user.name,
            email: h.user.email,
          }
        : null,
    }));

    return { success: true, data: formattedHistory, errors: [] };
  }

  // ==================== APROVAÇÃO DE TICKETS ====================

  @Post(':ticketId/approval/request')
  @ApiOperation({ summary: 'Solicitar aprovação para o ticket' })
  @ApiParam({ name: 'ticketId', description: 'ID do ticket' })
  @ApiResponse({ status: 201, description: 'Solicitação de aprovação criada com sucesso' })
  @ApiResponse({ status: 400, description: 'Já existe aprovação pendente ou dados inválidos' })
  async requestApproval(
    @Param('ticketId') ticketId: string,
    @Body() dto: RequestApprovalDto,
    @CurrentUser('id') userId: string,
  ) {
    const approval = await this.approvalsService.requestApproval(userId, {
      ...dto,
      ticket_id: ticketId,
    });
    return { success: true, data: approval };
  }

  @Get(':ticketId/approval/pending')
  @ApiOperation({ summary: 'Obter aprovação pendente do ticket' })
  @ApiParam({ name: 'ticketId', description: 'ID do ticket' })
  @ApiResponse({ status: 200, description: 'Aprovação pendente retornada (ou null)' })
  async getPendingApproval(@Param('ticketId') ticketId: string) {
    const approval = await this.approvalsService.getPendingApproval(ticketId);
    return { success: true, data: approval };
  }

  @Get(':ticketId/approval/history')
  @ApiOperation({ summary: 'Histórico de aprovações do ticket' })
  @ApiParam({ name: 'ticketId', description: 'ID do ticket' })
  @ApiResponse({ status: 200, description: 'Histórico de aprovações retornado' })
  async getApprovalHistory(@Param('ticketId') ticketId: string) {
    const history = await this.approvalsService.getApprovalHistory(ticketId);
    return { success: true, data: history };
  }

  @Delete(':ticketId/approval/:approvalId')
  @ApiOperation({ summary: 'Cancelar aprovação pendente' })
  @ApiParam({ name: 'ticketId', description: 'ID do ticket' })
  @ApiParam({ name: 'approvalId', description: 'ID da aprovação' })
  @HttpCode(HttpStatus.OK)
  async cancelApproval(
    @Param('approvalId') approvalId: string,
    @CurrentUser('id') userId: string,
  ) {
    const approval = await this.approvalsService.cancelApproval(approvalId, userId);
    return { success: true, data: approval, message: 'Aprovação cancelada com sucesso' };
  }

  @Post(':ticketId/approval/:approvalId/resend')
  @ApiOperation({ summary: 'Reenviar email de aprovação' })
  @ApiParam({ name: 'ticketId', description: 'ID do ticket' })
  @ApiParam({ name: 'approvalId', description: 'ID da aprovação' })
  @ApiResponse({ status: 200, description: 'Email reenviado com sucesso' })
  async resendApprovalEmail(
    @Param('approvalId') approvalId: string,
    @CurrentUser('id') userId: string,
  ) {
    const sent = await this.approvalsService.resendApprovalEmail(approvalId, userId);
    return { success: sent, message: sent ? 'Email reenviado com sucesso' : 'Falha ao enviar email' };
  }

  @Patch(':ticketId/approval/:approvalId')
  @ApiOperation({ summary: 'Editar email do aprovador (gera novo token)' })
  @ApiParam({ name: 'ticketId', description: 'ID do ticket' })
  @ApiParam({ name: 'approvalId', description: 'ID da aprovação' })
  @ApiResponse({ status: 200, description: 'Aprovador atualizado e novo email enviado' })
  async updateApprover(
    @Param('approvalId') approvalId: string,
    @Body() dto: UpdateApproverDto,
    @CurrentUser('id') userId: string,
  ) {
    const approval = await this.approvalsService.updateApproverEmail(approvalId, userId, dto);
    return { success: true, data: approval, message: 'Aprovador atualizado e email enviado' };
  }

  // ==================== ENDPOINTS PÚBLICOS DE APROVAÇÃO ====================

  @Get('public/approval/:token')
  @Public()
  @ApiOperation({ summary: 'Obter detalhes da aprovação pelo token (público)' })
  @ApiParam({ name: 'token', description: 'Token de aprovação' })
  @ApiResponse({ status: 200, description: 'Detalhes da aprovação' })
  @ApiResponse({ status: 404, description: 'Token não encontrado' })
  async getApprovalByToken(@Param('token') token: string) {
    const details = await this.approvalsService.getPublicApprovalDetails(token);
    return { success: true, data: details };
  }

  @Get('public/approval/:token/submit')
  @Public()
  @ApiOperation({ summary: 'Submeter decisão via GET (para links de email)' })
  @ApiParam({ name: 'token', description: 'Token de aprovação' })
  @ApiResponse({ status: 200, description: 'Decisão processada - retorna página HTML' })
  @Header('Content-Type', 'text/html; charset=utf-8')
  async submitApprovalViaGet(
    @Param('token') token: string,
    @Query('decision') decision: 'approved' | 'rejected',
    @Req() req: Request,
  ) {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

    try {
      if (!decision || !['approved', 'rejected'].includes(decision)) {
        return this.renderApprovalResultPage(false, 'Decisão inválida. Use approved ou rejected.');
      }

      await this.approvalsService.submitApproval(token, { decision }, clientIp);
      const statusText = decision === 'approved' ? 'aprovado' : 'rejeitado';
      return this.renderApprovalResultPage(true, `Ticket ${statusText} com sucesso!`);
    } catch (error) {
      return this.renderApprovalResultPage(false, error.message || 'Erro ao processar aprovação');
    }
  }

  @Post('public/approval/:token/submit')
  @Public()
  @ApiOperation({ summary: 'Submeter decisão de aprovação (público)' })
  @ApiParam({ name: 'token', description: 'Token de aprovação' })
  @ApiResponse({ status: 200, description: 'Decisão processada com sucesso' })
  @ApiResponse({ status: 400, description: 'Token inválido, expirado ou já respondido' })
  async submitApproval(
    @Param('token') token: string,
    @Body() dto: SubmitApprovalDto,
    @Req() req: Request,
  ) {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const approval = await this.approvalsService.submitApproval(token, dto, clientIp);
    return {
      success: true,
      data: approval,
      message: `Ticket ${dto.decision === 'approved' ? 'aprovado' : 'rejeitado'} com sucesso`,
    };
  }

  @Get('public/approval/:token/page')
  @Public()
  @ApiOperation({ summary: 'Página HTML de aprovação com formulário' })
  @ApiParam({ name: 'token', description: 'Token de aprovação' })
  @Header('Content-Type', 'text/html; charset=utf-8')
  async renderApprovalPage(@Param('token') token: string) {
    try {
      const details = await this.approvalsService.getPublicApprovalDetails(token);

      if (details.is_expired) {
        return this.renderApprovalResultPage(false, 'Esta solicitação de aprovação expirou.');
      }

      if (details.is_already_responded) {
        const statusText = details.status === 'approved' ? 'aprovada' : 'rejeitada';
        return this.renderApprovalResultPage(false, `Esta solicitação já foi ${statusText}.`);
      }

      return this.renderApprovalFormPage(token, details);
    } catch (error) {
      return this.renderApprovalResultPage(false, error.message || 'Erro ao carregar aprovação');
    }
  }

  // ==================== HELPERS PARA PÁGINAS HTML ====================

  private renderApprovalFormPage(token: string, details: any): string {
    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Aprovação de Ticket - Sys-Ticket</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f3f4f6;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            max-width: 600px;
            width: 100%;
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #f59e0b, #d97706);
            color: white;
            padding: 30px;
            text-align: center;
          }
          .header h1 { font-size: 24px; margin-bottom: 5px; }
          .header p { opacity: 0.9; }
          .content { padding: 30px; }
          .ticket-info {
            background: #f9fafb;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 25px;
          }
          .info-row {
            display: flex;
            padding: 10px 0;
            border-bottom: 1px solid #e5e7eb;
          }
          .info-row:last-child { border-bottom: none; }
          .info-label { font-weight: 600; width: 120px; color: #374151; }
          .info-value { flex: 1; color: #4b5563; }
          .description {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #e5e7eb;
          }
          .description-label { font-weight: 600; color: #374151; margin-bottom: 8px; }
          .description-text { color: #4b5563; white-space: pre-wrap; }
          .form-group { margin-bottom: 20px; }
          .form-group label { display: block; font-weight: 600; margin-bottom: 8px; color: #374151; }
          .form-group textarea {
            width: 100%;
            padding: 12px;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            font-size: 14px;
            resize: vertical;
            min-height: 100px;
          }
          .form-group textarea:focus {
            outline: none;
            border-color: #f59e0b;
            box-shadow: 0 0 0 3px rgba(245,158,11,0.1);
          }
          .buttons {
            display: flex;
            gap: 15px;
            margin-top: 25px;
          }
          .btn {
            flex: 1;
            padding: 14px 24px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.1s, box-shadow 0.1s;
          }
          .btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
          .btn:active { transform: translateY(0); }
          .btn-approve { background: #10b981; color: white; }
          .btn-reject { background: #ef4444; color: white; }
          .footer {
            text-align: center;
            padding: 20px;
            background: #f9fafb;
            color: #6b7280;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Aprovação de Ticket</h1>
            <p>Ticket #${details.ticket_number}</p>
          </div>
          <div class="content">
            <div class="ticket-info">
              <div class="info-row">
                <span class="info-label">Título:</span>
                <span class="info-value">${this.escapeHtml(details.ticket_title)}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Cliente:</span>
                <span class="info-value">${this.escapeHtml(details.client_name)}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Solicitante:</span>
                <span class="info-value">${this.escapeHtml(details.requester_name)}</span>
              </div>
              ${details.ticket_description ? `
              <div class="description">
                <div class="description-label">Descrição:</div>
                <div class="description-text">${this.escapeHtml(details.ticket_description)}</div>
              </div>
              ` : ''}
            </div>

            <form id="approvalForm" method="POST" action="/api/v1/tickets/public/approval/${token}/submit">
              <div class="form-group">
                <label for="comment">Comentário (opcional):</label>
                <textarea name="comment" id="comment" placeholder="Adicione um comentário sobre sua decisão..."></textarea>
              </div>
              <input type="hidden" name="decision" id="decision" value="">
              <div class="buttons">
                <button type="button" class="btn btn-approve" onclick="submitDecision('approved')">
                  APROVAR
                </button>
                <button type="button" class="btn btn-reject" onclick="submitDecision('rejected')">
                  REJEITAR
                </button>
              </div>
            </form>
          </div>
          <div class="footer">
            <p>Sys-Ticket - Sistema de Gestão de Chamados</p>
          </div>
        </div>

        <script>
          function submitDecision(decision) {
            document.getElementById('decision').value = decision;
            const form = document.getElementById('approvalForm');
            const formData = new FormData(form);

            fetch(form.action, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                decision: formData.get('decision'),
                comment: formData.get('comment')
              })
            })
            .then(response => response.json())
            .then(data => {
              if (data.success) {
                const statusText = decision === 'approved' ? 'aprovado' : 'rejeitado';
                document.body.innerHTML = \`
                  <div class="container" style="text-align: center; padding: 50px;">
                    <div style="font-size: 60px; margin-bottom: 20px;">\${decision === 'approved' ? '✅' : '❌'}</div>
                    <h1 style="color: \${decision === 'approved' ? '#10b981' : '#ef4444'}; margin-bottom: 15px;">
                      Ticket \${statusText}!
                    </h1>
                    <p style="color: #6b7280;">Sua decisão foi registrada com sucesso.</p>
                    <p style="color: #6b7280; margin-top: 10px;">Você pode fechar esta página.</p>
                  </div>
                \`;
              } else {
                alert('Erro: ' + (data.message || 'Falha ao processar aprovação'));
              }
            })
            .catch(error => {
              alert('Erro ao enviar: ' + error.message);
            });
          }
        </script>
      </body>
      </html>
    `;
  }

  private renderApprovalResultPage(success: boolean, message: string): string {
    const icon = success ? '✅' : '❌';
    const color = success ? '#10b981' : '#ef4444';

    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${success ? 'Sucesso' : 'Erro'} - Sys-Ticket</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f3f4f6;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            max-width: 500px;
            width: 100%;
            text-align: center;
            padding: 50px 30px;
          }
          .icon { font-size: 80px; margin-bottom: 20px; }
          h1 { color: ${color}; margin-bottom: 15px; font-size: 24px; }
          p { color: #6b7280; line-height: 1.6; }
          .footer { margin-top: 30px; color: #9ca3af; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">${icon}</div>
          <h1>${success ? 'Sucesso!' : 'Ops!'}</h1>
          <p>${this.escapeHtml(message)}</p>
          <p class="footer">Você pode fechar esta página.</p>
        </div>
      </body>
      </html>
    `;
  }

  private escapeHtml(text: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
