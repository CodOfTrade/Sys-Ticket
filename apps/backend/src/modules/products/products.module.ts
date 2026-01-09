import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { SigeProduct } from '../clients/entities/sige-product.entity';
import { SigeCloudService } from '../../shared/services/sige-cloud.service';

@Module({
  imports: [TypeOrmModule.forFeature([SigeProduct])],
  controllers: [ProductsController],
  providers: [ProductsService, SigeCloudService],
  exports: [ProductsService],
})
export class ProductsModule {}
