import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SlaService } from './sla.service';
import { ServiceDesk } from '../service-desks/entities/service-desk.entity';
import { UpdateSlaConfigDto } from './dto/update-sla-config.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('SLA')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'sla', version: '1' })
export class SlaController {
  constructor(
    private readonly slaService: SlaService,
    @InjectRepository(ServiceDesk)
    private readonly serviceDeskRepository: Repository<ServiceDesk>,
  ) {}

  @Get('service-desks/:serviceDeskId/config')
  @ApiOperation({ summary: 'Obter configuração de SLA de uma mesa de serviço' })
  @ApiParam({ name: 'serviceDeskId', description: 'ID da mesa de serviço' })
  @ApiResponse({ status: 200, description: 'Configuração de SLA' })
  @ApiResponse({ status: 404, description: 'Mesa de serviço não encontrada' })
  async getServiceDeskSlaConfig(@Param('serviceDeskId') serviceDeskId: string) {
    const serviceDesk = await this.serviceDeskRepository.findOne({
      where: { id: serviceDeskId },
    });

    if (!serviceDesk) {
      throw new NotFoundException('Mesa de serviço não encontrada');
    }

    return {
      service_desk_id: serviceDesk.id,
      service_desk_name: serviceDesk.name,
      sla_config: serviceDesk.sla_config || this.getDefaultSlaConfig(),
    };
  }

  @Patch('service-desks/:serviceDeskId/config')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Atualizar configuração de SLA de uma mesa de serviço' })
  @ApiParam({ name: 'serviceDeskId', description: 'ID da mesa de serviço' })
  @ApiResponse({ status: 200, description: 'Configuração atualizada com sucesso' })
  @ApiResponse({ status: 404, description: 'Mesa de serviço não encontrada' })
  async updateServiceDeskSlaConfig(
    @Param('serviceDeskId') serviceDeskId: string,
    @Body() updateSlaConfigDto: UpdateSlaConfigDto,
  ) {
    const serviceDesk = await this.serviceDeskRepository.findOne({
      where: { id: serviceDeskId },
    });

    if (!serviceDesk) {
      throw new NotFoundException('Mesa de serviço não encontrada');
    }

    serviceDesk.sla_config = updateSlaConfigDto as any;
    await this.serviceDeskRepository.save(serviceDesk);

    return {
      message: 'Configuração de SLA atualizada com sucesso',
      service_desk_id: serviceDesk.id,
      sla_config: serviceDesk.sla_config,
    };
  }

  @Get('tickets/:ticketId/stats')
  @ApiOperation({ summary: 'Obter estatísticas de SLA de um ticket' })
  @ApiParam({ name: 'ticketId', description: 'ID do ticket' })
  @ApiResponse({ status: 200, description: 'Estatísticas de SLA do ticket' })
  @ApiResponse({ status: 404, description: 'Ticket não encontrado' })
  async getTicketSlaStats(@Param('ticketId') ticketId: string) {
    const stats = await this.slaService.getTicketSlaStats(ticketId);

    if (!stats) {
      throw new NotFoundException('Ticket não encontrado');
    }

    return stats;
  }

  @Get('service-desks/:serviceDeskId/metrics')
  @ApiOperation({ summary: 'Obter métricas de SLA de uma mesa de serviço' })
  @ApiParam({ name: 'serviceDeskId', description: 'ID da mesa de serviço' })
  @ApiQuery({
    name: 'start_date',
    required: false,
    description: 'Data de início (ISO 8601)',
  })
  @ApiQuery({
    name: 'end_date',
    required: false,
    description: 'Data de fim (ISO 8601)',
  })
  @ApiResponse({ status: 200, description: 'Métricas de SLA' })
  @ApiResponse({ status: 404, description: 'Mesa de serviço não encontrada' })
  async getServiceDeskSlaMetrics(
    @Param('serviceDeskId') serviceDeskId: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    const serviceDesk = await this.serviceDeskRepository.findOne({
      where: { id: serviceDeskId },
    });

    if (!serviceDesk) {
      throw new NotFoundException('Mesa de serviço não encontrada');
    }

    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const metrics = await this.slaService.getServiceDeskSlaMetrics(
      serviceDeskId,
      start,
      end,
    );

    return {
      service_desk_id: serviceDeskId,
      service_desk_name: serviceDesk.name,
      period: {
        start: start || 'all_time',
        end: end || 'now',
      },
      metrics,
    };
  }

  /**
   * Retorna configuração padrão de SLA
   */
  private getDefaultSlaConfig() {
    return {
      priorities: {
        low: { first_response: 480, resolution: 2880 }, // 8h e 48h
        medium: { first_response: 240, resolution: 1440 }, // 4h e 24h
        high: { first_response: 120, resolution: 720 }, // 2h e 12h
        urgent: { first_response: 30, resolution: 240 }, // 30min e 4h
      },
      business_hours: {
        start: '09:00',
        end: '18:00',
        timezone: 'America/Sao_Paulo',
      },
      working_days: [1, 2, 3, 4, 5], // Segunda a Sexta
    };
  }
}
