import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SlaService } from './sla.service';
import { SlaController } from './sla.controller';
import { SlaScheduler } from './sla.scheduler';
import { Ticket } from '../tickets/entities/ticket.entity';
import { ServiceDesk } from '../service-desks/entities/service-desk.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket, ServiceDesk])],
  controllers: [SlaController],
  providers: [SlaService, SlaScheduler],
  exports: [SlaService],
})
export class SlaModule {}
