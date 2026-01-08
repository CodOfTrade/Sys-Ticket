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
import { PricingConfigService } from '../services/pricing-config.service';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { UserRole } from '../../users/entities/user.entity';

@ApiTags('Pricing')
@ApiBearerAuth('JWT-auth')
@Controller({ path: 'pricing-configs', version: '1' })
export class PricingConfigController {
  constructor(private readonly pricingConfigService: PricingConfigService) {}

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Listar configurações de preço',
    description: 'Retorna lista de configurações de preço por tipo de atendimento',
  })
  @ApiQuery({
    name: 'service_desk_id',
    required: false,
    description: 'Filtrar por mesa de serviço',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de configurações retornada com sucesso',
  })
  async findAll(@Query('service_desk_id') serviceDeskId?: string) {
    const configs = await this.pricingConfigService.findAll(serviceDeskId);
    return { success: true, data: configs };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Buscar configuração de preço por ID',
    description: 'Retorna uma configuração específica',
  })
  @ApiParam({ name: 'id', description: 'UUID da configuração' })
  @ApiResponse({
    status: 200,
    description: 'Configuração encontrada com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Configuração não encontrada',
  })
  async findOne(@Param('id') id: string) {
    const config = await this.pricingConfigService.findOne(id);
    return { success: true, data: config };
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Criar configuração de preço',
    description: 'Cria uma nova configuração de preço (requer permissão)',
  })
  @ApiResponse({
    status: 201,
    description: 'Configuração criada com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou configuração já existe',
  })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: any) {
    const config = await this.pricingConfigService.create(createDto);
    return { success: true, data: config };
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Atualizar configuração de preço',
    description: 'Atualiza uma configuração existente (requer permissão)',
  })
  @ApiParam({ name: 'id', description: 'UUID da configuração' })
  @ApiResponse({
    status: 200,
    description: 'Configuração atualizada com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Configuração não encontrada',
  })
  async update(@Param('id') id: string, @Body() updateDto: any) {
    const config = await this.pricingConfigService.update(id, updateDto);
    return { success: true, data: config };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Remover configuração de preço',
    description: 'Remove uma configuração (requer permissão de admin)',
  })
  @ApiParam({ name: 'id', description: 'UUID da configuração' })
  @ApiResponse({
    status: 204,
    description: 'Configuração removida com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Configuração não encontrada',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.pricingConfigService.remove(id);
  }
}
