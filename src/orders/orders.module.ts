import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrdersSchedulerService } from './orders-scheduler.service';
import { PrismaModule } from 'nestjs-prisma';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, OrdersSchedulerService],
  imports: [PrismaModule, ScheduleModule.forRoot()],
  exports: [OrdersService],
})
export class OrdersModule {}
