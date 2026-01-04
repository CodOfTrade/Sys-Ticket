import { Module, Global } from '@nestjs/common';
import { SigeCloudService } from './services/sige-cloud.service';
import { SimpleCacheService } from './services/simple-cache.service';

export const CACHE_MANAGER = 'CACHE_MANAGER';

@Global()
@Module({
  providers: [
    SigeCloudService,
    SimpleCacheService,
    {
      provide: CACHE_MANAGER,
      useExisting: SimpleCacheService,
    },
  ],
  exports: [SigeCloudService, CACHE_MANAGER],
})
export class SharedModule {}
