import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceDesk } from './entities/service-desk.entity';
import { PricingConfig } from './entities/pricing-config.entity';
import { PricingModalityConfig } from './entities/pricing-modality-config.entity';
import { ServiceDesksService } from './services/service-desks.service';
import { PricingConfigService } from './services/pricing-config.service';
import { ServiceDesksController } from './controllers/service-desks.controller';
import { PricingConfigController } from './controllers/pricing-config.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceDesk, PricingConfig, PricingModalityConfig])],
  controllers: [ServiceDesksController, PricingConfigController],
  providers: [ServiceDesksService, PricingConfigService],
  exports: [ServiceDesksService, PricingConfigService],
})
export class ServiceDesksModule {}
