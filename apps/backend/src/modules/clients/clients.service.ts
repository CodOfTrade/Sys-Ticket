import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { CACHE_MANAGER } from '../../shared/shared.module';
import { SimpleCacheService } from '../../shared/services/simple-cache.service';
import { SigeCloudService } from '../../shared/services/sige-cloud.service';
import { SigeClient as SigeClientInterface, SigeClientResponse } from './interfaces/sige-client.interface';
import { CreateServiceOrderDto, SigeServiceOrder, SigeServiceOrderResponse } from './interfaces/sige-service-order.interface';
import { SigeProduct } from './entities/sige-product.entity';
import { SigeClient } from './entities/sige-client.entity';

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);
  private readonly CACHE_TTL = 300; // 5 minutos

  constructor(
    private readonly sigeCloudService: SigeCloudService,
    @Inject(CACHE_MANAGER) private cacheManager: SimpleCacheService,
    @InjectRepository(SigeProduct)
    private productRepository: Repository<SigeProduct>,
    @InjectRepository(SigeClient)
    private clientRepository: Repository<SigeClient>,
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

  /**
   * Busca produtos no banco local (sincronizados do SIGE Cloud)
   */
  async searchProducts(query: string, page = 1, perPage = 20): Promise<any> {
    try {
      const [products, total] = await this.productRepository.findAndCount({
        where: [
          { nome: Like(`%${query}%`), ativo: true },
          { codigo: Like(`%${query}%`), ativo: true },
          { descricao: Like(`%${query}%`), ativo: true },
        ],
        skip: (page - 1) * perPage,
        take: perPage,
        order: { nome: 'ASC' },
      });

      return {
        data: products.map(p => ({
          id: p.sigeId,
          nome: p.nome,
          descricao: p.descricao,
          codigo: p.codigo,
          preco_venda: p.precoVenda,
          preco_custo: p.precoCusto,
          unidade: p.unidade,
          tipo: p.tipo,
          ativo: p.ativo,
        })),
        meta: {
          current_page: page,
          per_page: perPage,
          total,
        },
      };
    } catch (error) {
      this.logger.error(`Erro ao buscar produtos: ${query}`, error);
      throw error;
    }
  }

  /**
   * Busca produto por ID no banco local (sincronizados do SIGE Cloud)
   */
  async getProduct(productId: string): Promise<any> {
    try {
      const product = await this.productRepository.findOne({
        where: { sigeId: productId },
      });

      if (!product) {
        return null;
      }

      return {
        id: product.sigeId,
        nome: product.nome,
        descricao: product.descricao,
        codigo: product.codigo,
        preco_venda: product.precoVenda,
        preco_custo: product.precoCusto,
        unidade: product.unidade,
        tipo: product.tipo,
        ativo: product.ativo,
      };
    } catch (error) {
      this.logger.error(`Erro ao buscar produto ${productId}`, error);
      throw error;
    }
  }
}
