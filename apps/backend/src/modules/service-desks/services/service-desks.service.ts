import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceDesk } from '../entities/service-desk.entity';
import { UpdateCompanyInfoDto } from '../dto/update-company-info.dto';

@Injectable()
export class ServiceDesksService {
  private readonly logger = new Logger(ServiceDesksService.name);

  constructor(
    @InjectRepository(ServiceDesk)
    private serviceDeskRepository: Repository<ServiceDesk>,
  ) {}

  /**
   * Busca ServiceDesk por ID
   */
  async findOne(id: string): Promise<ServiceDesk> {
    const serviceDesk = await this.serviceDeskRepository.findOne({
      where: { id },
    });

    if (!serviceDesk) {
      throw new NotFoundException(`ServiceDesk com ID "${id}" não encontrado`);
    }

    return serviceDesk;
  }

  /**
   * Atualiza informações da empresa
   */
  async updateCompanyInfo(
    id: string,
    updateDto: UpdateCompanyInfoDto,
  ): Promise<ServiceDesk> {
    const serviceDesk = await this.findOne(id);

    // Atualizar campos de empresa
    if (updateDto.company_trade_name !== undefined) {
      serviceDesk.company_trade_name = updateDto.company_trade_name;
    }
    if (updateDto.company_cnpj !== undefined) {
      serviceDesk.company_cnpj = updateDto.company_cnpj;
    }
    if (updateDto.company_legal_name !== undefined) {
      serviceDesk.company_legal_name = updateDto.company_legal_name;
    }
    if (updateDto.company_address !== undefined) {
      serviceDesk.company_address = updateDto.company_address;
    }
    if (updateDto.company_phone !== undefined) {
      serviceDesk.company_phone = updateDto.company_phone;
    }
    if (updateDto.company_email !== undefined) {
      serviceDesk.company_email = updateDto.company_email;
    }
    if (updateDto.company_website !== undefined) {
      serviceDesk.company_website = updateDto.company_website;
    }

    const updated = await this.serviceDeskRepository.save(serviceDesk);

    this.logger.log(`Informações da empresa atualizadas para ServiceDesk ID: ${id}`);

    return updated;
  }

  /**
   * Retorna informações da empresa
   */
  async getCompanyInfo(id: string) {
    const serviceDesk = await this.findOne(id);

    return {
      company_trade_name: serviceDesk.company_trade_name,
      company_cnpj: serviceDesk.company_cnpj,
      company_legal_name: serviceDesk.company_legal_name,
      company_address: serviceDesk.company_address,
      company_phone: serviceDesk.company_phone,
      company_email: serviceDesk.company_email,
      company_website: serviceDesk.company_website,
    };
  }
}
