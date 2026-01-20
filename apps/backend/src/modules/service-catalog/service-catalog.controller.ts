import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { ServiceCatalogService } from './service-catalog.service';
import { CreateServiceCatalogDto } from './dto/create-service-catalog.dto';
import { CreateServiceCategoryDto } from './dto/create-service-category.dto';

@ApiTags('Service Catalog')
@Controller({ path: 'service-catalog', version: '1' })
@ApiBearerAuth()
export class ServiceCatalogController {
  constructor(private readonly serviceCatalogService: ServiceCatalogService) {}

  // ========================================
  // CATÁLOGOS DE SERVIÇO
  // ========================================

  @Get()
  @Public()
  @ApiOperation({ summary: 'Listar catálogos de serviço ativos' })
  @ApiQuery({ name: 'service_desk_id', required: false, description: 'Filtrar por mesa de serviço' })
  async findAll(@Query('service_desk_id') serviceDeskId?: string) {
    const catalogs = await this.serviceCatalogService.findAll(serviceDeskId);
    return {
      success: true,
      data: catalogs,
    };
  }

  @Get('all')
  @Public()
  @ApiOperation({ summary: 'Listar todos os catálogos (incluindo inativos)' })
  @ApiQuery({ name: 'service_desk_id', required: false, description: 'Filtrar por mesa de serviço' })
  async findAllIncludingInactive(@Query('service_desk_id') serviceDeskId?: string) {
    const catalogs = await this.serviceCatalogService.findAllIncludingInactive(serviceDeskId);
    return {
      success: true,
      data: catalogs,
    };
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Buscar catálogo por ID' })
  @ApiParam({ name: 'id', description: 'UUID do catálogo' })
  async findOne(@Param('id') id: string) {
    const catalog = await this.serviceCatalogService.findOne(id);
    return {
      success: true,
      data: catalog,
    };
  }

  @Post()
  @Public()
  @ApiOperation({ summary: 'Criar catálogo de serviço' })
  async create(@Body() createDto: CreateServiceCatalogDto) {
    const catalog = await this.serviceCatalogService.create(createDto);
    return {
      success: true,
      data: catalog,
    };
  }

  @Put(':id')
  @Public()
  @ApiOperation({ summary: 'Atualizar catálogo' })
  @ApiParam({ name: 'id', description: 'UUID do catálogo' })
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
  @Public()
  @ApiOperation({ summary: 'Remover catálogo (soft delete)' })
  @ApiParam({ name: 'id', description: 'UUID do catálogo' })
  async remove(@Param('id') id: string) {
    await this.serviceCatalogService.remove(id);
    return {
      success: true,
      message: 'Catálogo removido com sucesso',
    };
  }

  // ========================================
  // CATEGORIAS DE SERVIÇO
  // ========================================

  @Get('categories/all')
  @Public()
  @ApiOperation({ summary: 'Listar todas as categorias' })
  @ApiQuery({ name: 'service_catalog_id', required: false, description: 'Filtrar por catálogo' })
  async findAllCategories(@Query('service_catalog_id') serviceCatalogId?: string) {
    const categories = await this.serviceCatalogService.findAllCategories(serviceCatalogId);
    return {
      success: true,
      data: categories,
    };
  }

  @Get(':catalogId/categories')
  @Public()
  @ApiOperation({ summary: 'Listar categorias de um catálogo específico' })
  @ApiParam({ name: 'catalogId', description: 'UUID do catálogo' })
  async findCategoriesByCatalog(@Param('catalogId') catalogId: string) {
    const categories = await this.serviceCatalogService.findCategoriesByCatalog(catalogId);
    return {
      success: true,
      data: categories,
    };
  }

  @Get('categories/:id')
  @Public()
  @ApiOperation({ summary: 'Buscar categoria por ID' })
  @ApiParam({ name: 'id', description: 'UUID da categoria' })
  async findOneCategory(@Param('id') id: string) {
    const category = await this.serviceCatalogService.findOneCategory(id);
    return {
      success: true,
      data: category,
    };
  }

  @Post('categories')
  @Public()
  @ApiOperation({ summary: 'Criar categoria de serviço' })
  async createCategory(@Body() createDto: CreateServiceCategoryDto) {
    const category = await this.serviceCatalogService.createCategory(createDto);
    return {
      success: true,
      data: category,
    };
  }

  @Put('categories/:id')
  @Public()
  @ApiOperation({ summary: 'Atualizar categoria' })
  @ApiParam({ name: 'id', description: 'UUID da categoria' })
  async updateCategory(
    @Param('id') id: string,
    @Body() updateDto: Partial<CreateServiceCategoryDto>,
  ) {
    const category = await this.serviceCatalogService.updateCategory(id, updateDto);
    return {
      success: true,
      data: category,
    };
  }

  @Delete('categories/:id')
  @Public()
  @ApiOperation({ summary: 'Remover categoria (soft delete)' })
  @ApiParam({ name: 'id', description: 'UUID da categoria' })
  async removeCategory(@Param('id') id: string) {
    await this.serviceCatalogService.removeCategory(id);
    return {
      success: true,
      message: 'Categoria removida com sucesso',
    };
  }
}
