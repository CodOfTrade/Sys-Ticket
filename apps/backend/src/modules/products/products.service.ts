import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { SigeProduct } from '../clients/entities/sige-product.entity';
import { SigeCloudService } from '../../shared/services/sige-cloud.service';

interface SigeProductResponse {
  id: string;
  nome: string;
  descricao?: string;
  codigo?: string;
  preco_venda?: number;
  preco_custo?: number;
  unidade?: string;
  tipo?: string;
  ativo?: boolean;
}

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectRepository(SigeProduct)
    private productRepository: Repository<SigeProduct>,
    private sigeCloudService: SigeCloudService,
  ) {}

  /**
   * Busca produtos no banco local (para uso offline)
   * Usa ILIKE para busca case-insensitive em PostgreSQL
   */
  async searchProducts(query: string, limit: number = 20) {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const searchTerm = `%${query}%`;

    const products = await this.productRepository
      .createQueryBuilder('product')
      .where('product.ativo = :ativo', { ativo: true })
      .andWhere(
        '(product.nome ILIKE :searchTerm OR product.codigo ILIKE :searchTerm OR product.descricao ILIKE :searchTerm)',
        { searchTerm }
      )
      .orderBy('product.nome', 'ASC')
      .limit(limit)
      .getMany();

    return products.map(product => ({
      id: product.id,
      sigeId: product.sigeId,
      nome: product.nome,
      descricao: product.descricao,
      codigo: product.codigo,
      precoVenda: product.precoVenda,
      precoCusto: product.precoCusto,
      unidade: product.unidade,
      tipo: product.tipo,
    }));
  }

  /**
   * Sincroniza produtos do SIGE Cloud para o banco local
   */
  async syncProductsFromSige() {
    try {
      this.logger.log('Iniciando sincronização de produtos do SIGE Cloud...');

      // Buscar produtos da API SIGE Cloud usando endpoint GetAll
      // https://api.sigecloud.com.br/swagger/ui/index#!/Produtos/Produtos_GetAll
      const response = await this.sigeCloudService.get<any>('/api/v1/produtos');

      // Verificar estrutura de resposta do SIGE
      let products: SigeProductResponse[] = [];

      if (response && typeof response === 'object') {
        // Tentar diferentes estruturas de resposta
        if (response.success && response.data) {
          products = Array.isArray(response.data) ? response.data : response.data.produtos || [];
        } else if (response.data) {
          products = Array.isArray(response.data) ? response.data : [];
        } else if (response.produtos) {
          products = Array.isArray(response.produtos) ? response.produtos : [];
        } else if (Array.isArray(response)) {
          products = response;
        }
      }

      if (!Array.isArray(products) || products.length === 0) {
        this.logger.warn('Nenhum produto retornado pela API SIGE Cloud');
        return { success: false, message: 'Nenhum produto encontrado', synced: 0 };
      }

      this.logger.log(`Encontrados ${products.length} produtos no SIGE Cloud`);

      let syncedCount = 0;
      let errorCount = 0;

      for (const sigeProduct of products) {
        try {
          // Buscar produto existente pelo sigeId
          let product = await this.productRepository.findOne({
            where: { sigeId: sigeProduct.id },
          });

          if (product) {
            // Atualizar produto existente
            product.nome = sigeProduct.nome;
            product.descricao = sigeProduct.descricao || null;
            product.codigo = sigeProduct.codigo || null;
            product.precoVenda = sigeProduct.preco_venda || null;
            product.precoCusto = sigeProduct.preco_custo || null;
            product.unidade = sigeProduct.unidade || null;
            product.tipo = sigeProduct.tipo || null;
            product.ativo = sigeProduct.ativo !== undefined ? sigeProduct.ativo : true;
            product.lastSyncedAt = new Date();
          } else {
            // Criar novo produto
            product = this.productRepository.create({
              sigeId: sigeProduct.id,
              nome: sigeProduct.nome,
              descricao: sigeProduct.descricao || null,
              codigo: sigeProduct.codigo || null,
              precoVenda: sigeProduct.preco_venda || null,
              precoCusto: sigeProduct.preco_custo || null,
              unidade: sigeProduct.unidade || null,
              tipo: sigeProduct.tipo || null,
              ativo: sigeProduct.ativo !== undefined ? sigeProduct.ativo : true,
              lastSyncedAt: new Date(),
            });
          }

          await this.productRepository.save(product);
          syncedCount++;
        } catch (error) {
          this.logger.error(`Erro ao sincronizar produto ${sigeProduct.id}: ${error.message}`);
          errorCount++;
        }
      }

      this.logger.log(
        `Sincronização concluída: ${syncedCount} produtos sincronizados, ${errorCount} erros`
      );

      return {
        success: true,
        message: 'Sincronização concluída',
        synced: syncedCount,
        errors: errorCount,
        total: products.length,
      };
    } catch (error) {
      this.logger.error('Erro ao sincronizar produtos do SIGE Cloud:', error);
      return {
        success: false,
        message: `Erro na sincronização: ${error.message}`,
        synced: 0,
      };
    }
  }
}
