import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceDesk } from './entities/service-desk.entity';
import { PricingConfig } from './entities/pricing-config.entity';
import { PricingConfigService } from './services/pricing-config.service';
import { PricingConfigController } from './controllers/pricing-config.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceDesk, PricingConfig])],
  controllers: [PricingConfigController],
  providers: [PricingConfigService],
  exports: [PricingConfigService],
})
export class ServiceDesksModule {}
