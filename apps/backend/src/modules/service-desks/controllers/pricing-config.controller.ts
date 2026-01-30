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
import { CreatePricingConfigDto } from '../dto/create-pricing-config.dto';
import { UpdatePricingConfigDto } from '../dto/update-pricing-config.dto';
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
    summary: 'Listar classificações de atendimento',
    description: 'Retorna lista de classificações de atendimento com suas modalidades',
  })
  @ApiQuery({
    name: 'service_desk_id',
    required: false,
    description: 'Filtrar por mesa de serviço',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de classificações retornada com sucesso',
  })
  async findAll(@Query('service_desk_id') serviceDeskId?: string) {
    const configs = await this.pricingConfigService.findAll(serviceDeskId);
    return { success: true, data: configs };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Buscar classificação de atendimento por ID',
    description: 'Retorna uma classificação específica com suas modalidades',
  })
  @ApiParam({ name: 'id', description: 'UUID da classificação' })
  @ApiResponse({
    status: 200,
    description: 'Classificação encontrada com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Classificação não encontrada',
  })
  async findOne(@Param('id') id: string) {
    const config = await this.pricingConfigService.findOne(id);
    return { success: true, data: config };
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Criar classificação de atendimento',
    description: 'Cria uma nova classificação de atendimento com 3 modalidades (interno, remoto, externo)',
  })
  @ApiResponse({
    status: 201,
    description: 'Classificação criada com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou classificação já existe',
  })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreatePricingConfigDto) {
    const config = await this.pricingConfigService.create(createDto);
    return { success: true, data: config };
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Atualizar classificação de atendimento',
    description: 'Atualiza uma classificação existente e/ou suas modalidades (requer permissão)',
  })
  @ApiParam({ name: 'id', description: 'UUID da classificação' })
  @ApiResponse({
    status: 200,
    description: 'Classificação atualizada com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Classificação não encontrada',
  })
  async update(@Param('id') id: string, @Body() updateDto: UpdatePricingConfigDto) {
    const config = await this.pricingConfigService.update(id, updateDto);
    return { success: true, data: config };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Remover classificação de atendimento',
    description: 'Remove uma classificação e suas modalidades (requer permissão de admin)',
  })
  @ApiParam({ name: 'id', description: 'UUID da classificação' })
  @ApiResponse({
    status: 204,
    description: 'Classificação removida com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Classificação não encontrada',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.pricingConfigService.remove(id);
  }
}
