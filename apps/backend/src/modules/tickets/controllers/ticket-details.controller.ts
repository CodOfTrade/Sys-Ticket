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
  Res,
} from '@nestjs/common';
import { Response } from 'express';
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
  async submitApprovalViaGet(
    @Param('token') token: string,
    @Query('decision') decision: 'approved' | 'rejected',
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

    try {
      if (!decision || !['approved', 'rejected'].includes(decision)) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(this.renderApprovalResultPage(false, 'Decisao invalida. Use approved ou rejected.'));
      }

      await this.approvalsService.submitApproval(token, { decision }, clientIp);
      const statusText = decision === 'approved' ? 'aprovado' : 'rejeitado';
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(this.renderApprovalResultPage(true, `Ticket ${statusText} com sucesso!`));
    } catch (error) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(this.renderApprovalResultPage(false, error.message || 'Erro ao processar aprovacao'));
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
  async renderApprovalPage(
    @Param('token') token: string,
    @Query('action') action: 'approve' | 'reject' | undefined,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    try {
      const details = await this.approvalsService.getPublicApprovalDetails(token);

      if (details.is_expired) {
        return res.send(this.renderApprovalResultPage(false, 'Esta solicitacao de aprovacao expirou.'));
      }

      if (details.is_already_responded) {
        const statusText = details.status === 'approved' ? 'aprovada' : 'rejeitada';
        return res.send(this.renderApprovalResultPage(false, `Esta solicitacao ja foi ${statusText}.`));
      }

      return res.send(this.renderApprovalFormPage(token, details, action));
    } catch (error) {
      return res.send(this.renderApprovalResultPage(false, error.message || 'Erro ao carregar aprovacao'));
    }
  }

  // ==================== HELPERS PARA PÁGINAS HTML ====================

  private renderApprovalFormPage(token: string, details: any, preselectedAction?: 'approve' | 'reject'): string {
    const expiresAt = new Date(details.expires_at);
    const now = new Date();
    const hoursRemaining = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)));

    // Determinar título e cor do header baseado na ação pre-selecionada
    const isApproveAction = preselectedAction === 'approve';
    const isRejectAction = preselectedAction === 'reject';
    const headerTitle = isApproveAction ? 'Confirmar Aprovacao' : isRejectAction ? 'Confirmar Rejeicao' : 'Solicitacao de Aprovacao';
    const badgeText = isApproveAction ? 'Voce escolheu APROVAR' : isRejectAction ? 'Voce escolheu REJEITAR' : 'Aguardando sua decisao';
    const headerColor = isApproveAction ? '#10b981, #059669' : isRejectAction ? '#ef4444, #dc2626' : '#f59e0b, #d97706';

    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Aprovacao de Ticket #${details.ticket_number} - Sys-Ticket</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }

          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }

          .card {
            background: white;
            border-radius: 24px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            max-width: 520px;
            width: 100%;
            overflow: hidden;
            animation: slideUp 0.5s ease-out;
          }

          @keyframes slideUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }

          .header {
            background: linear-gradient(135deg, ${headerColor});
            color: white;
            padding: 32px 28px;
            position: relative;
            overflow: hidden;
          }

          .header::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -50%;
            width: 100%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
          }

          .header-content { position: relative; z-index: 1; }

          .badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(255,255,255,0.2);
            backdrop-filter: blur(10px);
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 500;
            margin-bottom: 16px;
          }

          .badge svg { width: 14px; height: 14px; }

          .header h1 {
            font-size: 26px;
            font-weight: 700;
            margin-bottom: 6px;
            letter-spacing: -0.5px;
          }

          .ticket-number {
            font-size: 15px;
            opacity: 0.9;
            font-weight: 500;
          }

          .content { padding: 28px; }

          .info-card {
            background: linear-gradient(145deg, #f8fafc 0%, #f1f5f9 100%);
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 24px;
          }

          .info-title {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
            margin-bottom: 18px;
            padding-bottom: 12px;
            border-bottom: 1px solid #e2e8f0;
          }

          .info-title svg { width: 16px; height: 16px; color: #f59e0b; }

          .info-grid {
            display: grid;
            gap: 16px;
          }

          .info-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .info-label {
            font-size: 12px;
            font-weight: 500;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }

          .info-value {
            font-size: 15px;
            font-weight: 500;
            color: #1e293b;
            line-height: 1.5;
          }

          .description-box {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 16px;
            margin-top: 16px;
          }

          .description-label {
            font-size: 12px;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            margin-bottom: 8px;
          }

          .description-text {
            font-size: 14px;
            color: #475569;
            line-height: 1.7;
            white-space: pre-wrap;
            max-height: 150px;
            overflow-y: auto;
          }

          .comment-section {
            margin-bottom: 24px;
          }

          .comment-label {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            font-weight: 600;
            color: #334155;
            margin-bottom: 10px;
          }

          .comment-label svg { width: 18px; height: 18px; color: #64748b; }

          .comment-label span.optional {
            font-size: 12px;
            font-weight: 400;
            color: #94a3b8;
          }

          textarea {
            width: 100%;
            padding: 16px;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            font-family: inherit;
            font-size: 14px;
            line-height: 1.6;
            resize: vertical;
            min-height: 120px;
            transition: all 0.2s ease;
            background: #f8fafc;
          }

          textarea:focus {
            outline: none;
            border-color: #f59e0b;
            background: white;
            box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.1);
          }

          textarea::placeholder { color: #94a3b8; }

          .buttons {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }

          .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            padding: 16px 24px;
            border: none;
            border-radius: 12px;
            font-family: inherit;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            position: relative;
            overflow: hidden;
          }

          .btn svg { width: 20px; height: 20px; }

          .btn::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
            transition: left 0.5s ease;
          }

          .btn:hover::before { left: 100%; }

          .btn:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15); }
          .btn:active { transform: translateY(0); }

          .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none !important;
          }

          .btn-approve {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
          }

          .btn-approve:hover { box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4); }

          .btn-reject {
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            color: white;
          }

          .btn-reject:hover { box-shadow: 0 8px 25px rgba(239, 68, 68, 0.4); }

          .expiry-notice {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 12px;
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border-radius: 10px;
            margin-top: 20px;
            font-size: 13px;
            color: #92400e;
            font-weight: 500;
          }

          .expiry-notice svg { width: 16px; height: 16px; }

          .footer {
            text-align: center;
            padding: 20px 28px;
            background: #f8fafc;
            border-top: 1px solid #e2e8f0;
          }

          .footer-logo {
            font-size: 14px;
            font-weight: 600;
            color: #64748b;
            letter-spacing: -0.3px;
          }

          .footer-text {
            font-size: 12px;
            color: #94a3b8;
            margin-top: 4px;
          }

          .loading-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(4px);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 1000;
          }

          .loading-overlay.active { display: flex; }

          .spinner {
            width: 50px;
            height: 50px;
            border: 4px solid #e2e8f0;
            border-top-color: #f59e0b;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          .success-card {
            text-align: center;
            padding: 48px 32px;
          }

          .success-icon {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
            animation: scaleIn 0.3s ease-out;
          }

          @keyframes scaleIn {
            from { transform: scale(0); }
            to { transform: scale(1); }
          }

          .success-icon.approved { background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); }
          .success-icon.rejected { background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); }

          .success-icon svg { width: 40px; height: 40px; }
          .success-icon.approved svg { color: #059669; }
          .success-icon.rejected svg { color: #dc2626; }

          .success-title {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 12px;
            letter-spacing: -0.5px;
          }

          .success-title.approved { color: #059669; }
          .success-title.rejected { color: #dc2626; }

          .success-message {
            color: #64748b;
            font-size: 15px;
            line-height: 1.6;
          }

          @media (max-width: 480px) {
            .card { border-radius: 20px; }
            .header { padding: 24px 20px; }
            .header h1 { font-size: 22px; }
            .content { padding: 20px; }
            .buttons { grid-template-columns: 1fr; }
          }
        </style>
      </head>
      <body>
        <div class="loading-overlay" id="loadingOverlay">
          <div class="spinner"></div>
        </div>

        <div class="card" id="mainCard">
          <div class="header">
            <div class="header-content">
              <div class="badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  ${isApproveAction ? '<path d="M5 13l4 4L19 7"/>' : isRejectAction ? '<path d="M6 18L18 6M6 6l12 12"/>' : '<path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>'}
                </svg>
                ${badgeText}
              </div>
              <h1>${headerTitle}</h1>
              <p class="ticket-number">Ticket #${details.ticket_number}</p>
            </div>
          </div>

          <div class="content">
            <div class="info-card">
              <div class="info-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
                Detalhes do Ticket
              </div>

              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Titulo</span>
                  <span class="info-value">${this.escapeHtml(details.ticket_title)}</span>
                </div>

                <div class="info-item">
                  <span class="info-label">Cliente</span>
                  <span class="info-value">${this.escapeHtml(details.client_name)}</span>
                </div>

                <div class="info-item">
                  <span class="info-label">Solicitado por</span>
                  <span class="info-value">${this.escapeHtml(details.requester_name)}</span>
                </div>
              </div>

              ${details.ticket_description ? `
              <div class="description-box">
                <div class="description-label">Descricao</div>
                <div class="description-text">${this.escapeHtml(this.stripHtmlTags(details.ticket_description))}</div>
              </div>
              ` : ''}
            </div>

            <form id="approvalForm">
              <div class="comment-section">
                <label class="comment-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                  </svg>
                  Seu Comentario <span class="optional">(opcional)</span>
                </label>
                <textarea
                  name="comment"
                  id="comment"
                  placeholder="Deixe um comentario sobre sua decisao. Ex: Aprovado conforme solicitado, Rejeitado pois necessita mais detalhes..."
                ></textarea>
              </div>

              <div class="buttons">
                ${isApproveAction ? `
                <button type="button" class="btn btn-approve" onclick="submitDecision('approved')" id="btnApprove" style="flex: 1;">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M5 13l4 4L19 7"/>
                  </svg>
                  Confirmar Aprovacao
                </button>
                <a href="?action=" class="btn" style="background: #64748b; color: white; text-decoration: none; flex: 0.5;">
                  Cancelar
                </a>
                ` : isRejectAction ? `
                <button type="button" class="btn btn-reject" onclick="submitDecision('rejected')" id="btnReject" style="flex: 1;">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                  Confirmar Rejeicao
                </button>
                <a href="?action=" class="btn" style="background: #64748b; color: white; text-decoration: none; flex: 0.5;">
                  Cancelar
                </a>
                ` : `
                <button type="button" class="btn btn-approve" onclick="submitDecision('approved')" id="btnApprove">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M5 13l4 4L19 7"/>
                  </svg>
                  Aprovar
                </button>
                <button type="button" class="btn btn-reject" onclick="submitDecision('rejected')" id="btnReject">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                  Rejeitar
                </button>
                `}
              </div>

              <div class="expiry-notice">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                ${hoursRemaining > 0 ? `Este link expira em aproximadamente ${hoursRemaining} hora${hoursRemaining !== 1 ? 's' : ''}` : 'Este link expira em breve'}
              </div>
            </form>
          </div>

          <div class="footer">
            <div class="footer-logo">Sys-Ticket</div>
            <div class="footer-text">Sistema de Gestao de Chamados</div>
          </div>
        </div>

        <script>
          function submitDecision(decision) {
            const loading = document.getElementById('loadingOverlay');
            const btnApprove = document.getElementById('btnApprove');
            const btnReject = document.getElementById('btnReject');
            const comment = document.getElementById('comment').value;

            loading.classList.add('active');
            if (btnApprove) btnApprove.disabled = true;
            if (btnReject) btnReject.disabled = true;

            fetch('/api/v1/tickets/public/approval/${token}/submit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ decision, comment })
            })
            .then(response => response.json())
            .then(data => {
              loading.classList.remove('active');

              if (data.success) {
                const isApproved = decision === 'approved';
                const card = document.getElementById('mainCard');

                card.innerHTML = \`
                  <div class="success-card">
                    <div class="success-icon \${isApproved ? 'approved' : 'rejected'}">
                      \${isApproved
                        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 13l4 4L19 7"/></svg>'
                        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 18L18 6M6 6l12 12"/></svg>'
                      }
                    </div>
                    <h2 class="success-title \${isApproved ? 'approved' : 'rejected'}">
                      Ticket \${isApproved ? 'Aprovado' : 'Rejeitado'}!
                    </h2>
                    <p class="success-message">
                      Sua decisao foi registrada com sucesso.<br>
                      Voce pode fechar esta pagina.
                    </p>
                  </div>
                  <div class="footer">
                    <div class="footer-logo">Sys-Ticket</div>
                    <div class="footer-text">Sistema de Gestao de Chamados</div>
                  </div>
                \`;
              } else {
                if (btnApprove) btnApprove.disabled = false;
                if (btnReject) btnReject.disabled = false;
                alert('Erro: ' + (data.message || 'Falha ao processar aprovacao'));
              }
            })
            .catch(error => {
              loading.classList.remove('active');
              if (btnApprove) btnApprove.disabled = false;
              if (btnReject) btnReject.disabled = false;
              alert('Erro ao enviar: ' + error.message);
            });
          }
        </script>
      </body>
      </html>
    `;
  }

  private renderApprovalResultPage(success: boolean, message: string): string {
    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${success ? 'Sucesso' : 'Erro'} - Sys-Ticket</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }

          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }

          .card {
            background: white;
            border-radius: 24px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            max-width: 450px;
            width: 100%;
            overflow: hidden;
            animation: slideUp 0.5s ease-out;
          }

          @keyframes slideUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }

          .content {
            text-align: center;
            padding: 48px 32px;
          }

          .icon-wrapper {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 28px;
            animation: scaleIn 0.4s ease-out 0.2s both;
          }

          @keyframes scaleIn {
            from { transform: scale(0); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }

          .icon-wrapper.success {
            background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
          }

          .icon-wrapper.error {
            background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
          }

          .icon-wrapper svg {
            width: 50px;
            height: 50px;
          }

          .icon-wrapper.success svg { color: #059669; }
          .icon-wrapper.error svg { color: #dc2626; }

          h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 12px;
            letter-spacing: -0.5px;
            animation: fadeIn 0.4s ease-out 0.3s both;
          }

          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }

          h1.success { color: #059669; }
          h1.error { color: #dc2626; }

          .message {
            color: #64748b;
            font-size: 16px;
            line-height: 1.7;
            margin-bottom: 8px;
            animation: fadeIn 0.4s ease-out 0.4s both;
          }

          .hint {
            color: #94a3b8;
            font-size: 14px;
            animation: fadeIn 0.4s ease-out 0.5s both;
          }

          .footer {
            text-align: center;
            padding: 20px 28px;
            background: #f8fafc;
            border-top: 1px solid #e2e8f0;
          }

          .footer-logo {
            font-size: 14px;
            font-weight: 600;
            color: #64748b;
            letter-spacing: -0.3px;
          }

          .footer-text {
            font-size: 12px;
            color: #94a3b8;
            margin-top: 4px;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="content">
            <div class="icon-wrapper ${success ? 'success' : 'error'}">
              ${success
                ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 13l4 4L19 7"/></svg>'
                : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 9v4m0 4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"/></svg>'
              }
            </div>
            <h1 class="${success ? 'success' : 'error'}">${success ? 'Sucesso!' : 'Ops!'}</h1>
            <p class="message">${this.escapeHtml(message)}</p>
            <p class="hint">Voce pode fechar esta pagina.</p>
          </div>
          <div class="footer">
            <div class="footer-logo">Sys-Ticket</div>
            <div class="footer-text">Sistema de Gestao de Chamados</div>
          </div>
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

  private stripHtmlTags(html: string): string {
    if (!html) return '';
    // Remove tags HTML e converte entidades comuns
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}
