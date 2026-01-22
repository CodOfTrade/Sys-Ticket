import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Resource } from './entities/resource.entity';
import { ResourceLicense } from './entities/resource-license.entity';
import { ContractResourceQuota } from './entities/contract-resource-quota.entity';
import { ResourceHistory } from './entities/resource-history.entity';
import { AgentTicket } from './entities/agent-ticket.entity';
import { AgentChatMessage } from './entities/agent-chat-message.entity';
import { ResourcesService } from './services/resources.service';
import { ResourceLicensesService } from './services/resource-licenses.service';
import { ContractQuotasService } from './services/contract-quotas.service';
import { ResourcesController } from './controllers/resources.controller';
import { ResourceLicensesController } from './controllers/resource-licenses.controller';
import { ContractQuotasController } from './controllers/contract-quotas.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Resource,
      ResourceLicense,
      ContractResourceQuota,
      ResourceHistory,
      AgentTicket,
      AgentChatMessage,
    ]),
  ],
  controllers: [
    ResourcesController,
    ResourceLicensesController,
    ContractQuotasController,
  ],
  providers: [
    ResourcesService,
    ResourceLicensesService,
    ContractQuotasService,
  ],
  exports: [
    ResourcesService,
    ResourceLicensesService,
    ContractQuotasService,
  ],
})
export class ResourcesModule {}
