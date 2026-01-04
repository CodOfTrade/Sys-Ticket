import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '../../shared/shared.module';
import { SimpleCacheService } from '../../shared/services/simple-cache.service';
import { SigeCloudService } from '../../shared/services/sige-cloud.service';
import { SigeContract, SigeContractResponse } from './interfaces/sige-contract.interface';

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);
  private readonly CACHE_TTL = 600; // 10 minutos (contratos mudam menos)

  constructor(
    private readonly sigeCloudService: SigeCloudService,
    @Inject(CACHE_MANAGER) private cacheManager: SimpleCacheService,
  ) {}

  async findAll(page = 1, perPage = 50, status?: string): Promise<SigeContractResponse> {
    const cacheKey = `sige:contracts:${page}:${perPage}:${status || 'all'}`;

    try {
      const cached = await this.cacheManager.get<SigeContractResponse>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for ${cacheKey}`);
        return cached;
      }

      const params: any = {
        page,
        per_page: perPage,
      };

      if (status) {
        params.status = status;
      }

      const response = await this.sigeCloudService.get<SigeContractResponse>('/contracts', params);

      await this.cacheManager.set(cacheKey, response, this.CACHE_TTL);

      return response;
    } catch (error) {
      this.logger.error('Erro ao buscar contratos do SIGE Cloud', error);
      throw error;
    }
  }

  async findOne(contractId: string): Promise<SigeContract> {
    const cacheKey = `sige:contract:${contractId}`;

    try {
      const cached = await this.cacheManager.get<SigeContract>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for ${cacheKey}`);
        return cached;
      }

      const response = await this.sigeCloudService.get<SigeContract>(`/contracts/${contractId}`);

      await this.cacheManager.set(cacheKey, response, this.CACHE_TTL);

      return response;
    } catch (error) {
      this.logger.error(`Erro ao buscar contrato ${contractId} do SIGE Cloud`, error);
      throw error;
    }
  }

  async findByClient(clientId: string, page = 1, perPage = 20): Promise<SigeContractResponse> {
    const cacheKey = `sige:contracts:client:${clientId}:${page}:${perPage}`;

    try {
      const cached = await this.cacheManager.get<SigeContractResponse>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for ${cacheKey}`);
        return cached;
      }

      const response = await this.sigeCloudService.get<SigeContractResponse>('/contracts', {
        client_id: clientId,
        page,
        per_page: perPage,
      });

      await this.cacheManager.set(cacheKey, response, this.CACHE_TTL);

      return response;
    } catch (error) {
      this.logger.error(`Erro ao buscar contratos do cliente ${clientId}`, error);
      throw error;
    }
  }

  async getActiveContracts(clientId: string): Promise<SigeContract[]> {
    try {
      const response = await this.findByClient(clientId, 1, 100);
      return response.data.filter(contract => contract.status === 'active');
    } catch (error) {
      this.logger.error(`Erro ao buscar contratos ativos do cliente ${clientId}`, error);
      throw error;
    }
  }

  calculateServicePrice(contract: SigeContract, serviceId: string, hours: number): number {
    const service = contract.services.find(s => s.id === serviceId);

    if (!service) {
      this.logger.warn(`Serviço ${serviceId} não encontrado no contrato ${contract.id}`);
      return contract.hourly_rate * hours;
    }

    return service.price * hours;
  }

  async invalidateCache(pattern: string): Promise<void> {
    this.logger.log(`Invalidando cache: ${pattern}`);
  }
}
