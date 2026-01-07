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
  private readonly BATCH_SIZE = 100; // API SIGE Cloud - limite máximo é 100

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

        const products = Array.isArray(rawResponse) ? rawResponse : (rawResponse?.data || []);

        if (products.length === 0) {
          hasMore = false;
          break;
        }

        for (const product of products) {
          await this.upsertProduct(product);
          totalSynced++;
        }

        this.logger.debug(`Sincronizados ${totalSynced} produtos (página ${page})`);

        // SEMPRE incrementa página, só para quando retornar array vazio
        page++;
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
        const rawResponse = await this.sigeCloudService.get<any>('/request/Pessoas/GetAll', {
          pageSize: this.BATCH_SIZE,
          skip: (page - 1) * this.BATCH_SIZE,
        });

        const clients = Array.isArray(rawResponse) ? rawResponse : (rawResponse?.data || []);

        if (clients.length === 0) {
          hasMore = false;
          break;
        }

        for (const client of clients) {
          // Sincronizar apenas se for Cliente
          if (client.Cliente === true) {
            await this.upsertClient(client);
            totalSynced++;
          }
        }

        this.logger.debug(`Sincronizados ${totalSynced} clientes (página ${page})`);

        // SEMPRE incrementa página, só para quando retornar array vazio
        page++;
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
        const rawResponse = await this.sigeCloudService.get<any>('/request/Contratos/GetAll', {
          pageSize: this.BATCH_SIZE,
          skip: (page - 1) * this.BATCH_SIZE,
        });

        const contracts = Array.isArray(rawResponse) ? rawResponse : (rawResponse?.data || []);

        if (contracts.length === 0) {
          hasMore = false;
          break;
        }

        // Log primeiro contrato para debug
        if (page === 1 && contracts.length > 0) {
          this.logger.log('Exemplo de contrato da API SIGE:', JSON.stringify(contracts[0], null, 2));
        }

        for (const contract of contracts) {
          await this.upsertContract(contract);
          totalSynced++;
        }

        this.logger.debug(`Sincronizados ${totalSynced} contratos (página ${page})`);

        // SEMPRE incrementa página, só para quando retornar array vazio
        page++;
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
  private async upsertClient(clientData: any): Promise<SigeClient | null> {
    try {
      // API SIGE retorna ID como identificador único no endpoint /request/Pessoas/Pesquisar
      const sigeId = String(clientData.ID || clientData.Codigo || clientData.id);

      if (!sigeId || sigeId === 'undefined') {
        this.logger.warn('Cliente sem ID, pulando...', clientData);
        return null;
      }

      const existing = await this.clientRepository.findOne({
        where: { sigeId },
      });

      const client = existing || this.clientRepository.create();

      client.sigeId = sigeId;
      // Usar NomeFantasia ou RazaoSocial como nome principal
      client.nome = clientData.NomeFantasia || clientData.RazaoSocial || clientData.nome;
      client.razaoSocial = clientData.RazaoSocial || clientData.razao_social;
      client.nomeFantasia = clientData.NomeFantasia || clientData.nome_fantasia;
      client.cpfCnpj = clientData.CNPJ_CPF || clientData.cpf_cnpj;
      client.tipoPessoa = clientData.PessoaFisica ? 'F' : 'J';
      client.email = clientData.Email || clientData.email;
      client.telefone = clientData.Telefone || clientData.telefone;
      client.celular = clientData.Celular || clientData.celular;
      // Montar endereço completo
      const enderecoParts = [
        clientData.Logradouro,
        clientData.LogradouroNumero,
        clientData.Complemento,
        clientData.Bairro
      ].filter(p => p && p.trim());
      client.endereco = enderecoParts.length > 0 ? enderecoParts.join(', ') : undefined;
      client.cidade = clientData.Cidade || clientData.cidade;
      client.estado = clientData.UF || clientData.estado;
      client.cep = clientData.CEP || clientData.cep;
      client.ativo = !clientData.Bloqueado;
      client.lastSyncedAt = new Date();

      return await this.clientRepository.save(client);
    } catch (error) {
      this.logger.error(`Erro ao fazer upsert do cliente ${clientData.ID || clientData.Codigo}`, error);
      throw error;
    }
  }

  /**
   * Insere ou atualiza um contrato no banco local
   */
  private async upsertContract(contractData: any): Promise<SigeContract | null> {
    try {
      // API SIGE retorna Codigo como identificador único
      const sigeId = String(contractData.Codigo || contractData.id || contractData.IdContrato);

      if (!sigeId || sigeId === 'undefined') {
        this.logger.warn('Contrato sem Codigo, pulando...', contractData);
        return null;
      }

      // Log detalhado dos campos do contrato
      this.logger.debug(`Processando contrato ${sigeId}. Campos disponíveis: ${Object.keys(contractData).join(', ')}`);

      const existing = await this.contractRepository.findOne({
        where: { sigeId },
      });

      const contract = existing || this.contractRepository.create();

      contract.sigeId = sigeId;
      contract.numeroContrato = String(contractData.Codigo || '');
      contract.descricao = contractData.Tipo || contractData.descricao;
      contract.valorMensal = contractData.ValorTotal ? (contractData.ValorTotal / 12) : undefined;
      contract.dataInicio = contractData.DataInicio;
      contract.dataFim = contractData.DataTermino;
      contract.status = contractData.Situacao;
      contract.tipo = contractData.Tipo;
      contract.observacoes = contractData.PlanoDeContas;
      contract.ativo = contractData.Situacao !== 'Rescindido';
      contract.lastSyncedAt = new Date();

      // Vincular ao cliente pelo NOME ou CNPJ (campo Cliente na API pode conter "CNPJ — Nome" ou apenas "Nome")
      if (contractData.Cliente) {
        const clientField = String(contractData.Cliente).trim();
        this.logger.debug(`Tentando vincular contrato ${sigeId} ao cliente: ${clientField}`);

        let client: SigeClient | null = null;

        // Extrair CNPJ se estiver no formato "CNPJ — Nome"
        const cnpjMatch = clientField.match(/^(\d{14,18})/);
        if (cnpjMatch) {
          const cnpj = cnpjMatch[1];
          this.logger.debug(`CNPJ extraído: ${cnpj}`);

          // Buscar por CNPJ primeiro (mais confiável)
          client = await this.clientRepository.findOne({
            where: { cpfCnpj: cnpj },
          });

          if (client) {
            this.logger.log(`✓ Cliente encontrado pelo CNPJ: ${client.nome}`);
          }
        }

        // Se não encontrou pelo CNPJ, tentar pelo nome
        if (!client) {
          // Remover CNPJ do início se existir
          const clientName = clientField.replace(/^\d{14,18}\s*[-—]\s*/, '').trim();

          // Buscar por nome fantasia, razão social ou nome
          client = await this.clientRepository.findOne({
            where: [
              { nomeFantasia: clientName },
              { razaoSocial: clientName },
              { nome: clientName },
            ],
          });

          if (client) {
            this.logger.log(`✓ Cliente encontrado pelo nome: ${client.nome}`);
          }
        }

        if (client) {
          contract.sigeClientId = client.id;
          this.logger.log(`✓ Contrato ${sigeId} vinculado ao cliente ${client.nome} (UUID: ${client.id})`);
        } else {
          this.logger.warn(`✗ Cliente "${clientField}" não encontrado para vincular contrato ${sigeId}`);
        }
      } else {
        this.logger.warn(`Contrato ${sigeId} sem campo Cliente para vincular`);
      }

      return await this.contractRepository.save(contract);
    } catch (error) {
      this.logger.error(`Erro ao fazer upsert do contrato ${contractData.Codigo}`, error);
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
