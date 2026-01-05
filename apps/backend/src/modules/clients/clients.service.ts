import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '../../shared/shared.module';
import { SimpleCacheService } from '../../shared/services/simple-cache.service';
import { SigeCloudService } from '../../shared/services/sige-cloud.service';
import { SigeClient, SigeClientResponse } from './interfaces/sige-client.interface';
import { CreateServiceOrderDto, SigeServiceOrder, SigeServiceOrderResponse } from './interfaces/sige-service-order.interface';

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);
  private readonly CACHE_TTL = 300; // 5 minutos

  constructor(
    private readonly sigeCloudService: SigeCloudService,
    @Inject(CACHE_MANAGER) private cacheManager: SimpleCacheService,
  ) {}

  async findAll(page = 1, perPage = 50): Promise<SigeClientResponse> {
    const cacheKey = `sige:clients:${page}:${perPage}`;

    try {
      const cached = await this.cacheManager.get<SigeClientResponse>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for ${cacheKey}`);
        return cached;
      }

      const rawResponse = await this.sigeCloudService.get<any>('/request/Oportunidades/Pesquisar', {
        pageSize: perPage,
        skip: (page - 1) * perPage,
      });

      // A API do SIGE Cloud retorna um array diretamente
      const response: SigeClientResponse = Array.isArray(rawResponse)
        ? { data: rawResponse }
        : rawResponse;

      await this.cacheManager.set(cacheKey, response, this.CACHE_TTL);

      return response;
    } catch (error) {
      this.logger.error('Erro ao buscar clientes do SIGE Cloud', error);
      throw error;
    }
  }

  async findOne(clientId: string): Promise<SigeClient> {
    const cacheKey = `sige:client:${clientId}`;

    try {
      const cached = await this.cacheManager.get<SigeClient>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for ${cacheKey}`);
        return cached;
      }

      const response = await this.sigeCloudService.get<SigeClient>(`/request/Pessoas/GetById`, {
        id: clientId,
      });

      await this.cacheManager.set(cacheKey, response, this.CACHE_TTL);

      return response;
    } catch (error) {
      this.logger.error(`Erro ao buscar cliente ${clientId} do SIGE Cloud`, error);
      throw error;
    }
  }

  async searchByDocument(document: string): Promise<SigeClient | null> {
    try {
      const rawResponse = await this.sigeCloudService.get<any>('/request/Oportunidades/Pesquisar', {
        cliente: document,
      });

      const response: SigeClientResponse = Array.isArray(rawResponse)
        ? { data: rawResponse }
        : rawResponse;

      const data = response.data || [];
      return data.length > 0 ? data[0] : null;
    } catch (error) {
      this.logger.error(`Erro ao buscar cliente por documento ${document}`, error);
      throw error;
    }
  }

  async searchByName(name: string, page = 1, perPage = 20): Promise<SigeClientResponse> {
    try {
      const rawResponse = await this.sigeCloudService.get<any>('/request/Oportunidades/Pesquisar', {
        cliente: name,
        pageSize: perPage,
        skip: (page - 1) * perPage,
      });

      const response: SigeClientResponse = Array.isArray(rawResponse)
        ? { data: rawResponse }
        : rawResponse;

      return response;
    } catch (error) {
      this.logger.error(`Erro ao buscar clientes por nome: ${name}`, error);
      throw error;
    }
  }

  async createServiceOrder(createDto: CreateServiceOrderDto): Promise<SigeServiceOrder> {
    try {
      this.logger.log(`Criando OS para cliente ${createDto.client_id}`);

      const response = await this.sigeCloudService.post<SigeServiceOrderResponse>(
        '/service-orders',
        createDto
      );

      this.logger.log(`OS criada com sucesso: ${response.data.order_number}`);

      return response.data;
    } catch (error) {
      this.logger.error('Erro ao criar Ordem de Serviço no SIGE Cloud', error);
      throw error;
    }
  }

  async getServiceOrder(orderId: string): Promise<SigeServiceOrder> {
    const cacheKey = `sige:service-order:${orderId}`;

    try {
      const cached = await this.cacheManager.get<SigeServiceOrder>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for ${cacheKey}`);
        return cached;
      }

      const response = await this.sigeCloudService.get<SigeServiceOrder>(`/service-orders/${orderId}`);

      await this.cacheManager.set(cacheKey, response, this.CACHE_TTL);

      return response;
    } catch (error) {
      this.logger.error(`Erro ao buscar OS ${orderId} do SIGE Cloud`, error);
      throw error;
    }
  }

  async invalidateCache(pattern: string): Promise<void> {
    this.logger.log(`Invalidando cache: ${pattern}`);
    // Implementação depende do cache manager usado (Redis, etc)
  }
}
