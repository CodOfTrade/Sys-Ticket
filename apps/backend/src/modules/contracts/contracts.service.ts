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
        pageSize: perPage,
        skip: (page - 1) * perPage,
      };

      if (status) {
        params.situacao = status;
      }

      const rawResponse = await this.sigeCloudService.get<any>('/request/Contratos/GetAll', params);

      // A API do SIGE Cloud retorna um array diretamente, não { data: [] }
      const response: SigeContractResponse = Array.isArray(rawResponse)
        ? { data: rawResponse }
        : rawResponse;

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

      const response = await this.sigeCloudService.get<SigeContract>(`/request/Contratos/GetById`, {
        id: contractId,
      });

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

      const rawResponse = await this.sigeCloudService.get<any>('/request/Contratos/Pesquisar', {
        cliente: clientId,
        pageSize: perPage,
        skip: (page - 1) * perPage,
      });

      const response: SigeContractResponse = Array.isArray(rawResponse)
        ? { data: rawResponse }
        : rawResponse;

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
      const contracts = response.data || [];
      return contracts.filter(contract => contract.Situacao === 'Ativo');
    } catch (error) {
      this.logger.error(`Erro ao buscar contratos ativos do cliente ${clientId}`, error);
      throw error;
    }
  }

  calculateServicePrice(contract: SigeContract, hours: number): number {
    // Cálculo baseado no valor total do contrato
    if (!contract.ValorTotal || contract.ValorTotal === 0) {
      this.logger.warn(`Contrato ${contract.Codigo} não possui valor total definido`);
      return 0;
    }

    // Calcula valor por hora baseado no valor total e duração do contrato
    const valorMensal = contract.ValorTotal / 12; // Assumindo contrato de 12 meses
    const valorPorHora = valorMensal / 160; // Assumindo 160 horas/mês

    return valorPorHora * hours;
  }

  async invalidateCache(pattern: string): Promise<void> {
    this.logger.log(`Invalidando cache: ${pattern}`);
  }
}
