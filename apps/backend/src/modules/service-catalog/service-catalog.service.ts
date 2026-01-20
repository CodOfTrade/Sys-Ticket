import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceCatalog } from './entities/service-catalog.entity';
import { ServiceCategory } from './entities/service-category.entity';
import { CreateServiceCatalogDto } from './dto/create-service-catalog.dto';
import { CreateServiceCategoryDto } from './dto/create-service-category.dto';

@Injectable()
export class ServiceCatalogService {
  constructor(
    @InjectRepository(ServiceCatalog)
    private serviceCatalogRepository: Repository<ServiceCatalog>,
    @InjectRepository(ServiceCategory)
    private serviceCategoryRepository: Repository<ServiceCategory>,
  ) {}

  // ========================================
  // CATÁLOGOS DE SERVIÇO
  // ========================================

  async findAll(serviceDeskId?: string): Promise<ServiceCatalog[]> {
    const query = this.serviceCatalogRepository
      .createQueryBuilder('catalog')
      .leftJoinAndSelect('catalog.categories', 'categories', 'categories.is_active = :catActive', { catActive: true })
      .where('catalog.is_active = :isActive', { isActive: true })
      .orderBy('catalog.display_order', 'ASC')
      .addOrderBy('catalog.name', 'ASC')
      .addOrderBy('categories.display_order', 'ASC')
      .addOrderBy('categories.name', 'ASC');

    if (serviceDeskId) {
      query.andWhere('catalog.service_desk_id = :serviceDeskId', {
        serviceDeskId,
      });
    }

    return query.getMany();
  }

  async findAllIncludingInactive(serviceDeskId?: string): Promise<ServiceCatalog[]> {
    const query = this.serviceCatalogRepository
      .createQueryBuilder('catalog')
      .leftJoinAndSelect('catalog.categories', 'categories')
      .orderBy('catalog.display_order', 'ASC')
      .addOrderBy('catalog.name', 'ASC')
      .addOrderBy('categories.display_order', 'ASC')
      .addOrderBy('categories.name', 'ASC');

    if (serviceDeskId) {
      query.andWhere('catalog.service_desk_id = :serviceDeskId', {
        serviceDeskId,
      });
    }

    return query.getMany();
  }

  async findOne(id: string): Promise<ServiceCatalog> {
    const catalog = await this.serviceCatalogRepository.findOne({
      where: { id },
      relations: ['categories', 'service_desk'],
    });

    if (!catalog) {
      throw new NotFoundException(`Catálogo de serviço ${id} não encontrado`);
    }

    return catalog;
  }

  async create(
    createDto: CreateServiceCatalogDto,
  ): Promise<ServiceCatalog> {
    const catalog = this.serviceCatalogRepository.create(createDto);
    return this.serviceCatalogRepository.save(catalog);
  }

  async update(
    id: string,
    updateDto: Partial<CreateServiceCatalogDto>,
  ): Promise<ServiceCatalog> {
    await this.findOne(id);
    await this.serviceCatalogRepository.update(id, updateDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const catalog = await this.findOne(id);
    // Primeiro exclui todas as categorias vinculadas
    await this.serviceCategoryRepository.delete({ service_catalog_id: id });
    // Depois exclui o catalogo
    await this.serviceCatalogRepository.remove(catalog);
  }

  // ========================================
  // CATEGORIAS DE SERVIÇO
  // ========================================

  async findAllCategories(serviceCatalogId?: string): Promise<ServiceCategory[]> {
    const query = this.serviceCategoryRepository
      .createQueryBuilder('category')
      .where('category.is_active = :isActive', { isActive: true })
      .orderBy('category.display_order', 'ASC')
      .addOrderBy('category.name', 'ASC');

    if (serviceCatalogId) {
      query.andWhere('category.service_catalog_id = :serviceCatalogId', {
        serviceCatalogId,
      });
    }

    return query.getMany();
  }

  async findCategoriesByCatalog(serviceCatalogId: string): Promise<ServiceCategory[]> {
    return this.serviceCategoryRepository.find({
      where: {
        service_catalog_id: serviceCatalogId,
        is_active: true,
      },
      order: {
        display_order: 'ASC',
        name: 'ASC',
      },
    });
  }

  async findOneCategory(id: string): Promise<ServiceCategory> {
    const category = await this.serviceCategoryRepository.findOne({
      where: { id },
      relations: ['service_catalog'],
    });

    if (!category) {
      throw new NotFoundException(`Categoria ${id} não encontrada`);
    }

    return category;
  }

  async createCategory(
    createDto: CreateServiceCategoryDto,
  ): Promise<ServiceCategory> {
    // Verifica se o catálogo existe
    await this.findOne(createDto.service_catalog_id);

    const category = this.serviceCategoryRepository.create(createDto);
    return this.serviceCategoryRepository.save(category);
  }

  async updateCategory(
    id: string,
    updateDto: Partial<CreateServiceCategoryDto>,
  ): Promise<ServiceCategory> {
    await this.findOneCategory(id);

    // Se está mudando o catálogo, verifica se o novo existe
    if (updateDto.service_catalog_id) {
      await this.findOne(updateDto.service_catalog_id);
    }

    await this.serviceCategoryRepository.update(id, updateDto);
    return this.findOneCategory(id);
  }

  async removeCategory(id: string): Promise<void> {
    const category = await this.findOneCategory(id);
    await this.serviceCategoryRepository.remove(category);
  }
}
