import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrdersService } from './orders.service';

@Injectable()
export class OrdersSchedulerService {
  private readonly logger = new Logger(OrdersSchedulerService.name);

  constructor(private readonly ordersService: OrdersService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleExpiredOrders() {
    this.logger.debug('Checking for expired orders...');
    
    try {
      const expiredOrders = await this.ordersService.getExpiredOrders();
      
      if (expiredOrders.length === 0) {
        this.logger.debug('No expired orders found');
        return;
      }

      this.logger.log(`Found ${expiredOrders.length} expired order(s)`);

      for (const order of expiredOrders) {
        try {
          await this.ordersService.expired(order.id);
          this.logger.log(`Order ${order.id} has been expired and inventory released`);
        } catch (error) {
          this.logger.error(
            `Failed to expire order ${order.id}: ${error.message}`,
            error.stack,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error checking expired orders: ${error.message}`,
        error.stack,
      );
    }
  }
}

