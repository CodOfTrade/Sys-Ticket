import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SigeCloudService } from '../../shared/services/sige-cloud.service';
import { SigeProduct } from './entities/sige-product.entity';
import { SigeClient } from './entities/sige-client.entity';
import { SigeContract } from './entities/sige-contract.entity';

@Injectable()
export class SigeSyncService {
  private readonly logger = new Logger(SigeSyncService.name);
  private readonly BATCH_SIZE = 100;

  constructor(
    private readonly sigeCloudService: SigeCloudService,
    @InjectRepository(SigeProduct)
    private productRepository: Repository<SigeProduct>,
    @InjectRepository(SigeClient)
    private clientRepository: Repository<SigeClient>,
    @InjectRepository(SigeContract)
    private contractRepository: Repository<SigeContract>,
  ) {}

  /**
   * Sincroniza produtos do SIGE Cloud a cada 6 horas
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async syncProducts(): Promise<void> {
    this.logger.log('Iniciando sincronização de produtos...');

    try {
      let page = 1;
      let hasMore = true;
      let totalSynced = 0;

      while (hasMore) {
        const rawResponse = await this.sigeCloudService.get<any>('/request/Produtos/Pesquisar', {
          pageSize: this.BATCH_SIZE,
          skip: (page - 1) * this.BATCH_SIZE,
        });

        const products = Array.isArray(rawResponse) ? rawResponse : (rawResponse.data || []);

        if (products.length === 0) {
          hasMore = false;
          break;
        }

        for (const product of products) {
          await this.upsertProduct(product);
          totalSynced++;
        }

        this.logger.debug(`Sincronizados ${totalSynced} produtos (página ${page})`);

        if (products.length < this.BATCH_SIZE) {
          hasMore = false;
        } else {
          page++;
        }
      }

      this.logger.log(`Sincronização de produtos concluída: ${totalSynced} produtos`);
    } catch (error) {
      this.logger.error('Erro ao sincronizar produtos', error);
      throw error;
    }
  }

  /**
   * Sincroniza clientes do SIGE Cloud a cada 6 horas
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async syncClients(): Promise<void> {
    this.logger.log('Iniciando sincronização de clientes...');

    try {
      let page = 1;
      let hasMore = true;
      let totalSynced = 0;

      while (hasMore) {
        const rawResponse = await this.sigeCloudService.get<any>('/request/Oportunidades/Pesquisar', {
          pageSize: this.BATCH_SIZE,
          skip: (page - 1) * this.BATCH_SIZE,
        });

        const clients = Array.isArray(rawResponse) ? rawResponse : (rawResponse.data || []);

        if (clients.length === 0) {
          hasMore = false;
          break;
        }

        for (const client of clients) {
          await this.upsertClient(client);
          totalSynced++;
        }

        this.logger.debug(`Sincronizados ${totalSynced} clientes (página ${page})`);

        if (clients.length < this.BATCH_SIZE) {
          hasMore = false;
        } else {
          page++;
        }
      }

      this.logger.log(`Sincronização de clientes concluída: ${totalSynced} clientes`);
    } catch (error) {
      this.logger.error('Erro ao sincronizar clientes', error);
      throw error;
    }
  }

  /**
   * Sincroniza contratos do SIGE Cloud a cada 12 horas
   */
  @Cron(CronExpression.EVERY_12_HOURS)
  async syncContracts(): Promise<void> {
    this.logger.log('Iniciando sincronização de contratos...');

    try {
      // Nota: Ajustar endpoint quando soubermos o correto da API SIGE Cloud
      let page = 1;
      let hasMore = true;
      let totalSynced = 0;

      while (hasMore) {
        const rawResponse = await this.sigeCloudService.get<any>('/request/Contratos/Pesquisar', {
          pageSize: this.BATCH_SIZE,
          skip: (page - 1) * this.BATCH_SIZE,
        });

        const contracts = Array.isArray(rawResponse) ? rawResponse : (rawResponse.data || []);

        if (contracts.length === 0) {
          hasMore = false;
          break;
        }

        for (const contract of contracts) {
          await this.upsertContract(contract);
          totalSynced++;
        }

        this.logger.debug(`Sincronizados ${totalSynced} contratos (página ${page})`);

        if (contracts.length < this.BATCH_SIZE) {
          hasMore = false;
        } else {
          page++;
        }
      }

      this.logger.log(`Sincronização de contratos concluída: ${totalSynced} contratos`);
    } catch (error) {
      this.logger.error('Erro ao sincronizar contratos', error);
      throw error;
    }
  }

  /**
   * Insere ou atualiza um produto no banco local
   */
  private async upsertProduct(productData: any): Promise<SigeProduct> {
    try {
      const existing = await this.productRepository.findOne({
        where: { sigeId: productData.id || productData.IdProduto },
      });

      const product = existing || this.productRepository.create();

      product.sigeId = productData.id || productData.IdProduto;
      product.nome = productData.nome || productData.Nome || productData.Descricao;
      product.descricao = productData.descricao || productData.DescricaoCompleta;
      product.codigo = productData.codigo || productData.Codigo;
      product.precoVenda = productData.preco_venda || productData.PrecoVenda;
      product.precoCusto = productData.preco_custo || productData.PrecoCusto;
      product.unidade = productData.unidade || productData.Unidade;
      product.tipo = productData.tipo || productData.Tipo;
      product.ativo = productData.ativo !== undefined ? productData.ativo : (productData.Ativo !== undefined ? productData.Ativo : true);
      product.lastSyncedAt = new Date();

      return await this.productRepository.save(product);
    } catch (error) {
      this.logger.error(`Erro ao fazer upsert do produto ${productData.id}`, error);
      throw error;
    }
  }

  /**
   * Insere ou atualiza um cliente no banco local
   */
  private async upsertClient(clientData: any): Promise<SigeClient> {
    try {
      const existing = await this.clientRepository.findOne({
        where: { sigeId: clientData.id || clientData.IdPessoa },
      });

      const client = existing || this.clientRepository.create();

      client.sigeId = clientData.id || clientData.IdPessoa;
      client.nome = clientData.nome || clientData.Nome;
      client.razaoSocial = clientData.razao_social || clientData.RazaoSocial;
      client.nomeFantasia = clientData.nome_fantasia || clientData.NomeFantasia;
      client.cpfCnpj = clientData.cpf_cnpj || clientData.CpfCnpj || clientData.Documento;
      client.tipoPessoa = clientData.tipo_pessoa || clientData.TipoPessoa;
      client.email = clientData.email || clientData.Email;
      client.telefone = clientData.telefone || clientData.Telefone;
      client.celular = clientData.celular || clientData.Celular;
      client.endereco = clientData.endereco || clientData.Endereco;
      client.cidade = clientData.cidade || clientData.Cidade;
      client.estado = clientData.estado || clientData.Estado || clientData.UF;
      client.cep = clientData.cep || clientData.Cep;
      client.ativo = clientData.ativo !== undefined ? clientData.ativo : (clientData.Ativo !== undefined ? clientData.Ativo : true);
      client.lastSyncedAt = new Date();

      return await this.clientRepository.save(client);
    } catch (error) {
      this.logger.error(`Erro ao fazer upsert do cliente ${clientData.id}`, error);
      throw error;
    }
  }

  /**
   * Insere ou atualiza um contrato no banco local
   */
  private async upsertContract(contractData: any): Promise<SigeContract> {
    try {
      const existing = await this.contractRepository.findOne({
        where: { sigeId: contractData.id || contractData.IdContrato },
      });

      const contract = existing || this.contractRepository.create();

      contract.sigeId = contractData.id || contractData.IdContrato;
      contract.numeroContrato = contractData.numero_contrato || contractData.NumeroContrato;
      contract.descricao = contractData.descricao || contractData.Descricao;
      contract.valorMensal = contractData.valor_mensal || contractData.ValorMensal;
      contract.dataInicio = contractData.data_inicio || contractData.DataInicio;
      contract.dataFim = contractData.data_fim || contractData.DataFim;
      contract.status = contractData.status || contractData.Status;
      contract.tipo = contractData.tipo || contractData.Tipo;
      contract.observacoes = contractData.observacoes || contractData.Observacoes;
      contract.ativo = contractData.ativo !== undefined ? contractData.ativo : (contractData.Ativo !== undefined ? contractData.Ativo : true);
      contract.lastSyncedAt = new Date();

      // Vincular ao cliente se existir
      if (contractData.client_id || contractData.IdCliente) {
        const client = await this.clientRepository.findOne({
          where: { sigeId: contractData.client_id || contractData.IdCliente },
        });
        if (client) {
          contract.sigeClientId = client.id;
        }
      }

      return await this.contractRepository.save(contract);
    } catch (error) {
      this.logger.error(`Erro ao fazer upsert do contrato ${contractData.id}`, error);
      throw error;
    }
  }

  /**
   * Força sincronização manual de todos os dados
   */
  async syncAll(): Promise<void> {
    this.logger.log('Iniciando sincronização completa (manual)...');

    await Promise.all([
      this.syncProducts(),
      this.syncClients(),
      this.syncContracts(),
    ]);

    this.logger.log('Sincronização completa concluída!');
  }
}
