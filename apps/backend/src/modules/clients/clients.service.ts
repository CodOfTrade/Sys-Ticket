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

  /**
   * Lista todos os clientes do banco local (sincronizados do SIGE Cloud)
   */
  async findAll(page = 1, perPage = 50): Promise<SigeClientResponse> {
    try {
      const [clients, total] = await this.clientRepository.findAndCount({
        where: { ativo: true },
        skip: (page - 1) * perPage,
        take: perPage,
        order: { nome: 'ASC' },
      });

      return {
        data: clients.map(c => this.mapClientToInterface(c)),
        meta: {
          current_page: page,
          per_page: perPage,
          total,
        },
      };
    } catch (error) {
      this.logger.error('Erro ao buscar clientes', error);
      throw error;
    }
  }

  /**
   * Busca cliente por ID no banco local
   */
  async findOne(clientId: string): Promise<SigeClientInterface | null> {
    try {
      const client = await this.clientRepository.findOne({
        where: { sigeId: clientId },
      });

      if (!client) {
        return null;
      }

      return this.mapClientToInterface(client);
    } catch (error) {
      this.logger.error(`Erro ao buscar cliente ${clientId}`, error);
      throw error;
    }
  }

  /**
   * Busca cliente por CPF/CNPJ no banco local
   */
  async searchByDocument(document: string): Promise<SigeClientInterface | null> {
    try {
      const client = await this.clientRepository.findOne({
        where: { cpfCnpj: document.replace(/\D/g, ''), ativo: true },
      });

      if (!client) {
        return null;
      }

      return this.mapClientToInterface(client);
    } catch (error) {
      this.logger.error(`Erro ao buscar cliente por documento ${document}`, error);
      throw error;
    }
  }

  /**
   * Busca clientes por nome no banco local (case-insensitive, busca parcial)
   */
  async searchByName(name: string, page = 1, perPage = 20): Promise<SigeClientResponse> {
    try {
      // Remove caracteres especiais e normaliza para busca mais flexível
      const searchTerm = name.trim();

      const [clients, total] = await this.clientRepository
        .createQueryBuilder('client')
        .where('client.ativo = :ativo', { ativo: true })
        .andWhere(
          '(LOWER(client.nome) LIKE LOWER(:search) OR ' +
          'LOWER(client.razaoSocial) LIKE LOWER(:search) OR ' +
          'LOWER(client.nomeFantasia) LIKE LOWER(:search) OR ' +
          'REPLACE(REPLACE(client.cpfCnpj, \'.\', \'\'), \'-\', \'\') LIKE :searchClean OR ' +
          'client.telefone LIKE :search OR ' +
          'client.celular LIKE :search)',
          {
            search: `%${searchTerm}%`,
            searchClean: `%${searchTerm.replace(/\D/g, '')}%`
          }
        )
        .orderBy('client.nome', 'ASC')
        .skip((page - 1) * perPage)
        .take(perPage)
        .getManyAndCount();

      return {
        data: clients.map(c => this.mapClientToInterface(c)),
        meta: {
          current_page: page,
          per_page: perPage,
          total,
        },
      };
    } catch (error) {
      this.logger.error(`Erro ao buscar clientes por nome: ${name}`, error);
      throw error;
    }
  }

  /**
   * Mapeia entidade para interface
   */
  private mapClientToInterface(client: SigeClient): SigeClientInterface {
    return {
      id: client.sigeId,
      nome: client.nome,
      razao_social: client.razaoSocial,
      nome_fantasia: client.nomeFantasia,
      cpf_cnpj: client.cpfCnpj,
      tipo_pessoa: client.tipoPessoa,
      email: client.email,
      telefone: client.telefone,
      celular: client.celular,
      endereco: client.endereco,
      cidade: client.cidade,
      estado: client.estado,
      cep: client.cep,
      ativo: client.ativo,
    };
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
