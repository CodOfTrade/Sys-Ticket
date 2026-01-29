import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Headers,
  UseGuards,
  Req,
  Logger,
  UnauthorizedException,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { AgentService } from '../services/agent.service';
import { AgentActivationService, CreateActivationCodeDto } from '../services/agent-activation.service';
import {
  RegisterAgentDto,
  HeartbeatDto,
  UpdateInventoryDto,
  CreateAgentTicketDto,
} from '../dto/agent.dto';
import { Public } from '../../auth/decorators/public.decorator';
import { AgentTokenGuard } from '../guards/agent-token.guard';

@ApiTags('Agent')
@Controller({ path: 'agent', version: '1' })
export class AgentController {
  private readonly logger = new Logger(AgentController.name);

  constructor(
    private readonly agentService: AgentService,
    private readonly agentActivationService: AgentActivationService,
  ) {}

  // ========================================
  // CÓDIGOS DE ATIVAÇÃO
  // ========================================

  @Post('activation/generate')
  @ApiOperation({ summary: 'Gerar código de ativação para instalação de agentes' })
  @ApiResponse({
    status: 201,
    description: 'Código gerado com sucesso',
    schema: {
      example: {
        success: true,
        data: {
          code: 'ABCD-EFGH-IJKL',
          expiresAt: '2026-01-30T12:00:00Z',
          maxUses: 0,
        },
      },
    },
  })
  async generateActivationCode(
    @Body() dto: { description?: string; expiresInHours?: number; maxUses?: number },
    @Req() req: any,
  ) {
    const result = await this.agentActivationService.createCode({
      description: dto.description,
      expiresInHours: dto.expiresInHours || 24,
      maxUses: dto.maxUses || 0,
      createdByUserId: req.user?.id,
      createdByUserName: req.user?.name,
    });

    return {
      success: true,
      data: {
        id: result.id,
        code: result.code,
        description: result.description,
        expiresAt: result.expires_at,
        maxUses: result.max_uses,
        timesUsed: result.times_used,
        createdAt: result.created_at,
      },
    };
  }

  @Post('activation/validate')
  @Public()
  @ApiOperation({ summary: 'Validar código de ativação (usado pelo wizard do agente)' })
  @ApiResponse({
    status: 200,
    description: 'Resultado da validação',
    schema: {
      example: {
        success: true,
        valid: true,
        message: 'Código válido',
      },
    },
  })
  async validateActivationCode(@Body() body: { code: string }) {
    const result = await this.agentActivationService.validateCode(body.code);
    return {
      success: true,
      valid: result.valid,
      message: result.message,
    };
  }

  @Get('activation/codes')
  @ApiOperation({ summary: 'Listar códigos de ativação' })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'Lista de códigos',
  })
  async listActivationCodes(@Query('activeOnly') activeOnly?: string) {
    const codes = activeOnly === 'true'
      ? await this.agentActivationService.listActiveCodes()
      : await this.agentActivationService.listAllCodes();

    return {
      success: true,
      data: codes.map(c => ({
        id: c.id,
        code: c.code,
        description: c.description,
        expiresAt: c.expires_at,
        maxUses: c.max_uses,
        timesUsed: c.times_used,
        isActive: c.is_active,
        isValid: c.isValid(),
        createdByUserName: c.created_by_user_name,
        createdAt: c.created_at,
      })),
    };
  }

  @Delete('activation/codes/:id')
  @ApiOperation({ summary: 'Desativar código de ativação' })
  @ApiResponse({ status: 200, description: 'Código desativado' })
  async deactivateCode(@Param('id') id: string) {
    await this.agentActivationService.deactivateCode(id);
    return {
      success: true,
      message: 'Código desativado',
    };
  }

  // ========================================
  // REGISTRO E OPERAÇÕES DO AGENTE
  // ========================================

  @Post('validate-registration')
  @Public()
  @ApiOperation({ summary: 'Validar se cliente/contrato pode registrar novos agentes' })
  @ApiHeader({ name: 'X-Activation-Code', description: 'Código de ativação', required: true })
  @ApiResponse({
    status: 200,
    description: 'Resultado da validação',
    schema: {
      example: {
        success: true,
        canRegister: true,
        message: 'Cliente pode registrar novos agentes',
      },
    },
  })
  async validateRegistration(
    @Body() body: { clientId: string; contractId?: string },
    @Headers('x-activation-code') activationCode: string,
  ) {
    // Validar código de ativação primeiro
    if (!activationCode) {
      throw new UnauthorizedException('Código de ativação não fornecido');
    }

    await this.agentActivationService.validateOrThrow(activationCode);

    // Validar se pode registrar
    const result = await this.agentService.validateCanRegister(
      body.clientId,
      body.contractId,
    );

    return {
      success: true,
      canRegister: result.canRegister,
      message: result.message,
    };
  }

  @Post('register')
  @Public()
  @ApiOperation({ summary: 'Registrar novo agente' })
  @ApiHeader({ name: 'X-Activation-Code', description: 'Código de ativação', required: true })
  @ApiResponse({
    status: 201,
    description: 'Agente registrado com sucesso',
    schema: {
      example: {
        success: true,
        data: {
          agentId: 'uuid',
          agentToken: 'agt_xxxxx',
          resourceId: 'uuid',
          resourceCode: 'RES-2026-000001',
        },
      },
    },
  })
  async register(
    @Body() dto: RegisterAgentDto,
    @Headers('x-activation-code') activationCode: string,
  ) {
    // Validar código de ativação
    if (!activationCode) {
      throw new UnauthorizedException('Código de ativação não fornecido');
    }

    await this.agentActivationService.validateOrThrow(activationCode);

    // Registrar agente
    const result = await this.agentService.registerAgent(dto);

    // Incrementar uso do código após sucesso
    await this.agentActivationService.useCode(activationCode);

    return {
      success: true,
      data: result,
    };
  }

  @Post('heartbeat')
  @Public()
  @UseGuards(AgentTokenGuard)
  @ApiOperation({ summary: 'Enviar heartbeat do agente' })
  @ApiHeader({ name: 'X-Agent-Token', description: 'Token do agente', required: true })
  @ApiResponse({ status: 200, description: 'Heartbeat recebido' })
  async heartbeat(@Body() dto: HeartbeatDto) {
    await this.agentService.processHeartbeat(dto);
    return {
      success: true,
      message: 'Heartbeat recebido',
    };
  }

  @Post('update-inventory')
  @Public()
  @UseGuards(AgentTokenGuard)
  @ApiOperation({ summary: 'Atualizar inventário completo do sistema' })
  @ApiHeader({ name: 'X-Agent-Token', description: 'Token do agente', required: true })
  @ApiResponse({ status: 200, description: 'Inventário atualizado' })
  async updateInventory(@Body() dto: UpdateInventoryDto) {
    await this.agentService.updateInventory(dto);
    return {
      success: true,
      message: 'Inventário atualizado',
    };
  }

  @Post('tickets')
  @Public()
  @UseGuards(AgentTokenGuard)
  @ApiOperation({ summary: 'Criar ticket via agente' })
  @ApiHeader({ name: 'X-Agent-Token', description: 'Token do agente', required: true })
  @ApiResponse({
    status: 201,
    description: 'Ticket criado',
    schema: {
      example: {
        success: true,
        data: {
          ticketId: 'uuid',
          ticketNumber: 'TKT-2026-000001',
          chatWebSocketUrl: '/ws/tickets/uuid',
        },
      },
    },
  })
  async createTicket(@Body() dto: CreateAgentTicketDto) {
    const result = await this.agentService.createTicket(dto);
    return {
      success: true,
      data: result,
    };
  }

  @Get('tickets/:agentId')
  @Public()
  @UseGuards(AgentTokenGuard)
  @ApiOperation({ summary: 'Listar tickets do agente' })
  @ApiHeader({ name: 'X-Agent-Token', description: 'Token do agente', required: true })
  @ApiResponse({
    status: 200,
    description: 'Lista de tickets',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 'uuid',
            ticketNumber: 'TKT-2026-000001',
            title: 'Problema com impressora',
            status: 'new',
            priority: 'medium',
            createdAt: '2026-01-22T00:00:00Z',
            updatedAt: '2026-01-22T00:00:00Z',
          },
        ],
      },
    },
  })
  async getTickets(@Param('agentId') agentId: string, @Req() req: any) {
    // Validar que o agentId do path corresponde ao token
    if (req.agentId !== agentId) {
      return {
        success: false,
        message: 'Acesso negado',
        data: [],
      };
    }

    const tickets = await this.agentService.getAgentTickets(agentId);
    return {
      success: true,
      data: tickets,
    };
  }

  @Get('commands/:agentId')
  @Public()
  @UseGuards(AgentTokenGuard)
  @ApiOperation({ summary: 'Buscar comando pendente para o agente' })
  @ApiHeader({ name: 'X-Agent-Token', description: 'Token do agente', required: true })
  @ApiResponse({
    status: 200,
    description: 'Comando pendente (ou null se não houver)',
    schema: {
      example: {
        success: true,
        data: {
          command: 'uninstall',
          commandAt: '2026-01-26T12:00:00Z',
        },
      },
    },
  })
  async getPendingCommand(@Param('agentId') agentId: string, @Req() req: any) {
    // Validar que o agentId do path corresponde ao token
    if (req.agentId !== agentId) {
      this.logger.warn(`Tentativa de acesso negada: agentId ${agentId} não corresponde ao token`);
      return {
        success: false,
        message: 'Acesso negado',
        data: null,
      };
    }

    const pendingCommand = await this.agentService.getPendingCommand(agentId);

    if (pendingCommand.command) {
      this.logger.debug(
        `Agente ${agentId} buscou comando pendente: ${pendingCommand.command}`,
      );
    }

    return {
      success: true,
      data: pendingCommand,
    };
  }

  @Post('commands/:agentId/confirm')
  @Public()
  @UseGuards(AgentTokenGuard)
  @ApiOperation({ summary: 'Confirmar execução de comando pelo agente' })
  @ApiHeader({ name: 'X-Agent-Token', description: 'Token do agente', required: true })
  @ApiResponse({
    status: 200,
    description: 'Confirmação recebida',
    schema: {
      example: {
        success: true,
        message: 'Comando confirmado',
      },
    },
  })
  async confirmCommand(
    @Param('agentId') agentId: string,
    @Body() body: { command: string; success: boolean; message?: string },
    @Req() req: any,
  ) {
    // Validar que o agentId do path corresponde ao token
    if (req.agentId !== agentId) {
      this.logger.warn(`Tentativa de confirmação negada: agentId ${agentId} não corresponde ao token`);
      return {
        success: false,
        message: 'Acesso negado',
      };
    }

    this.logger.log(
      `Agente ${agentId} confirmando comando '${body.command}': ${body.success ? 'Sucesso' : 'Falhou'}${body.message ? ` - ${body.message}` : ''}`,
    );

    await this.agentService.confirmCommandExecution(
      agentId,
      body.command,
      body.success,
      body.message,
    );

    return {
      success: true,
      message: 'Comando confirmado',
    };
  }
}
