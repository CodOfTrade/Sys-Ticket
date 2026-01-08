import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketsController } from './tickets.controller';
import { TicketDetailsController } from './controllers/ticket-details.controller';
import { TicketsService } from './tickets.service';
import { TicketCommentsService } from './services/ticket-comments.service';
import { TicketAppointmentsService } from './services/ticket-appointments.service';
import { TicketValuationsService } from './services/ticket-valuations.service';
import { ChecklistsService } from './services/checklists.service';
import { Ticket } from './entities/ticket.entity';
import { TicketComment } from './entities/ticket-comment.entity';
import { TicketAppointment } from './entities/ticket-appointment.entity';
import { TicketValuation } from './entities/ticket-valuation.entity';
import { TicketChecklist } from './entities/ticket-checklist.entity';
import { Checklist } from './entities/checklist.entity';
import { TicketFollower } from './entities/ticket-follower.entity';
import { TicketAttachment } from './entities/ticket-attachment.entity';
import { ContractsModule } from '../contracts/contracts.module';
import { ClientsModule } from '../clients/clients.module';
import { ServiceDesksModule } from '../service-desks/service-desks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Ticket,
      TicketComment,
      TicketAppointment,
      TicketValuation,
      TicketChecklist,
      Checklist,
      TicketFollower,
      TicketAttachment,
    ]),
    ContractsModule,
    ClientsModule,
    ServiceDesksModule,
  ],
  controllers: [TicketsController, TicketDetailsController],
  providers: [
    TicketsService,
    TicketCommentsService,
    TicketAppointmentsService,
    TicketValuationsService,
    ChecklistsService,
  ],
  exports: [TicketsService],
})
export class TicketsModule {}
