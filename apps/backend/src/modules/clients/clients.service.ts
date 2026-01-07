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
import { SigeContract } from './entities/sige-contract.entity';

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
    @InjectRepository(SigeContract)
    private contractRepository: Repository<SigeContract>,
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
      const searchPattern = `%${searchTerm}%`;
      const cleanedSearch = searchTerm.replace(/\D/g, '');

      const queryBuilder = this.clientRepository
        .createQueryBuilder('client')
        .where('client.ativo = :ativo', { ativo: true });

      // Montar condições de busca
      const conditions = [
        'LOWER(client.nome) LIKE LOWER(:search)',
        'LOWER(client.razaoSocial) LIKE LOWER(:search)',
        'LOWER(client.nomeFantasia) LIKE LOWER(:search)',
        'client.telefone LIKE :search',
        'client.celular LIKE :search',
      ];

      const params: any = { search: searchPattern };

      // Só buscar por CPF/CNPJ se houver números no termo de busca
      if (cleanedSearch.length > 0) {
        conditions.push('client.cpfCnpj LIKE :searchClean');
        params.searchClean = `%${cleanedSearch}%`;
      }

      // Adicionar condições de busca com OR
      queryBuilder.andWhere(`(${conditions.join(' OR ')})`, params);

      // Log da query SQL gerada
      const sql = queryBuilder.getSql();
      this.logger.debug(`SQL gerado: ${sql}`);
      this.logger.debug(`Parâmetros: ${JSON.stringify(queryBuilder.getParameters())}`);

      const [clients, total] = await queryBuilder
        .orderBy('client.nome', 'ASC')
        .skip((page - 1) * perPage)
        .take(perPage)
        .getManyAndCount();

      this.logger.debug(`Busca por "${searchTerm}" retornou ${total} resultados`);

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
      localId: client.id, // UUID local para uso em contratos
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

  /**
   * Busca contratos de um cliente por ID local
   */
  async getClientContracts(clientId: string): Promise<any> {
    try {
      this.logger.log(`Buscando contratos para cliente ${clientId}`);

      // Buscar o cliente pelo ID local
      const client = await this.clientRepository.findOne({
        where: { id: clientId },
      });

      if (!client) {
        this.logger.warn(`Cliente ${clientId} não encontrado`);
        return [];
      }

      this.logger.log(`Cliente encontrado: ${client.nome}, ID: ${client.id}`);

      // Buscar contratos vinculados ao cliente usando o ID local (UUID) do cliente
      const contracts = await this.contractRepository.find({
        where: { sigeClientId: clientId },
        order: { dataInicio: 'DESC' },
      });

      this.logger.log(`Contratos encontrados: ${contracts.length}`);

      return contracts.map(contract => ({
        id: contract.id,
        numero_contrato: contract.numeroContrato,
        descricao: contract.descricao,
        valor_mensal: contract.valorMensal ? parseFloat(contract.valorMensal.toString()) : null,
        data_inicio: contract.dataInicio,
        data_fim: contract.dataFim,
        status: contract.status,
        tipo: contract.tipo,
        observacoes: contract.observacoes,
        ativo: contract.ativo,
      }));
    } catch (error) {
      this.logger.error(`Erro ao buscar contratos do cliente ${clientId}`, error);
      throw error;
    }
  }
}
