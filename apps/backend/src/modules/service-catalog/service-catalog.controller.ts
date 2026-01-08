import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { ServiceCatalogService } from './service-catalog.service';
import { CreateServiceCatalogDto } from './dto/create-service-catalog.dto';

@ApiTags('Service Catalog')
@Controller({ path: 'service-catalog', version: '1' })
@ApiBearerAuth()
export class ServiceCatalogController {
  constructor(private readonly serviceCatalogService: ServiceCatalogService) {}

  @Get()
  @ApiOperation({ summary: 'Listar catálogos de serviço' })
  async findAll(@Query('service_desk_id') serviceDeskId?: string) {
    const catalogs = await this.serviceCatalogService.findAll(serviceDeskId);
    return {
      success: true,
      data: catalogs,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar catálogo por ID' })
  async findOne(@Param('id') id: string) {
    const catalog = await this.serviceCatalogService.findOne(id);
    return {
      success: true,
      data: catalog,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Criar catálogo de serviço' })
  async create(@Body() createDto: CreateServiceCatalogDto) {
    const catalog = await this.serviceCatalogService.create(createDto);
    return {
      success: true,
      data: catalog,
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar catálogo' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: Partial<CreateServiceCatalogDto>,
  ) {
    const catalog = await this.serviceCatalogService.update(id, updateDto);
    return {
      success: true,
      data: catalog,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover catálogo (soft delete)' })
  async remove(@Param('id') id: string) {
    await this.serviceCatalogService.remove(id);
    return {
      success: true,
      message: 'Catálogo removido com sucesso',
    };
  }
}
