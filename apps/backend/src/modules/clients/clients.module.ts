import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { SigeSyncService } from './sige-sync.service';
import { ClientContact } from './entities/client-contact.entity';
import { SigeProduct } from './entities/sige-product.entity';
import { SigeClient } from './entities/sige-client.entity';
import { SigeContract } from './entities/sige-contract.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ClientContact,
      SigeProduct,
      SigeClient,
      SigeContract,
    ]),
  ],
  controllers: [ClientsController],
  providers: [ClientsService, SigeSyncService],
  exports: [ClientsService, SigeSyncService],
})
export class ClientsModule {}
