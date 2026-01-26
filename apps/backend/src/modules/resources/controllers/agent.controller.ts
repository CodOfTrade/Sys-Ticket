import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { AgentService } from '../services/agent.service';
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
  constructor(private readonly agentService: AgentService) {}

  @Post('register')
  @Public()
  @ApiOperation({ summary: 'Registrar novo agente' })
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
  async register(@Body() dto: RegisterAgentDto) {
    const result = await this.agentService.registerAgent(dto);
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
      return {
        success: false,
        message: 'Acesso negado',
        data: null,
      };
    }

    const pendingCommand = await this.agentService.getPendingCommand(agentId);
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
      return {
        success: false,
        message: 'Acesso negado',
      };
    }

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
