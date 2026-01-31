import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueuesController } from './queues.controller';
import { QueuesService } from './queues.service';
import { Queue } from './entities/queue.entity';
import { User } from '../users/entities/user.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { SlaModule } from '../sla/sla.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Queue, User, Ticket]),
    forwardRef(() => SlaModule),
  ],
  controllers: [QueuesController],
  providers: [QueuesService],
  exports: [QueuesService],
})
export class QueuesModule {}
