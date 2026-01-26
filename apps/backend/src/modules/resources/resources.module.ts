import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Resource } from './entities/resource.entity';
import { ResourceLicense } from './entities/resource-license.entity';
import { LicenseDeviceAssignment } from './entities/license-device-assignment.entity';
import { ContractResourceQuota } from './entities/contract-resource-quota.entity';
import { ResourceHistory } from './entities/resource-history.entity';
import { AgentTicket } from './entities/agent-ticket.entity';
import { AgentChatMessage } from './entities/agent-chat-message.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { ServiceDesk } from '../service-desks/entities/service-desk.entity';
import { SigeClient } from '../clients/entities/sige-client.entity';
import { ClientsModule } from '../clients/clients.module';
import { ResourcesService } from './services/resources.service';
import { ResourceLicensesService } from './services/resource-licenses.service';
import { ContractQuotasService } from './services/contract-quotas.service';
import { AgentService } from './services/agent.service';
import { ResourcesController } from './controllers/resources.controller';
import { ResourceLicensesController } from './controllers/resource-licenses.controller';
import { ContractQuotasController } from './controllers/contract-quotas.controller';
import { AgentController } from './controllers/agent.controller';
import { ResourcesGateway } from './gateways/resources.gateway';
import { OfflineDetectionTask } from './tasks/offline-detection.task';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Resource,
      ResourceLicense,
      LicenseDeviceAssignment,
      ContractResourceQuota,
      ResourceHistory,
      AgentTicket,
      AgentChatMessage,
      Ticket,
      ServiceDesk,
      SigeClient,
    ]),
    forwardRef(() => ClientsModule),
  ],
  controllers: [
    ResourcesController,
    ResourceLicensesController,
    ContractQuotasController,
    AgentController,
  ],
  providers: [
    ResourcesService,
    ResourceLicensesService,
    ContractQuotasService,
    AgentService,
    ResourcesGateway,
    OfflineDetectionTask,
  ],
  exports: [
    ResourcesService,
    ResourceLicensesService,
    ContractQuotasService,
    AgentService,
  ],
})
export class ResourcesModule {}
