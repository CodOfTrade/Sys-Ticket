import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceCatalog } from './entities/service-catalog.entity';
import { CreateServiceCatalogDto } from './dto/create-service-catalog.dto';

@Injectable()
export class ServiceCatalogService {
  constructor(
    @InjectRepository(ServiceCatalog)
    private serviceCatalogRepository: Repository<ServiceCatalog>,
  ) {}

  async findAll(serviceDeskId?: string): Promise<ServiceCatalog[]> {
    const query = this.serviceCatalogRepository
      .createQueryBuilder('catalog')
      .leftJoinAndSelect('catalog.categories', 'categories')
      .where('catalog.is_active = :isActive', { isActive: true })
      .orderBy('catalog.display_order', 'ASC')
      .addOrderBy('catalog.name', 'ASC');

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
    catalog.is_active = false;
    await this.serviceCatalogRepository.save(catalog);
  }
}
