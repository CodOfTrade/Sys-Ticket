import { Controller, Get, Query, Post, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('search')
  async searchProducts(@Query('q') query: string) {
    return this.productsService.searchProducts(query);
  }

  @Post('sync')
  async syncProducts() {
    return this.productsService.syncProductsFromSige();
  }
}
