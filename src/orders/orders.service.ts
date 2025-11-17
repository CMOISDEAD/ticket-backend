import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { PrismaService } from 'nestjs-prisma';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async create(createOrderDto: CreateOrderDto) {
    return this.prisma.$transaction(async (tx) => {
      const event = await tx.event.findUnique({
        where: {
          id: createOrderDto.eventId,
        },
      });

      if (!event)
        throw new NotFoundException(
          `Event with id ${createOrderDto.eventId} not found.`,
        );

      const { tickets, ...data } = createOrderDto;

      tickets.forEach((ticket) => {
        if (ticket.type === 'VIP') {
          if (event.vipAvailable < ticket.quantity)
            throw new NotFoundException(`Not enough VIP tickets available.`);
        } else if (ticket.type === 'REGULAR') {
          if (event.regularAvailable < ticket.quantity)
            throw new NotFoundException(
              `Not enough REGULAR tickets available.`,
            );
        }
      });

      let vipCount = 0,
        regularCount = 0;

      const total = tickets.reduce((acc, ticket) => {
        if (ticket.type === 'VIP') {
          vipCount += ticket.quantity;
          return acc + ticket.quantity * event.vipPrice;
        } else if (ticket.type === 'REGULAR') {
          regularCount += ticket.quantity;
          return acc + ticket.quantity * event.regularPrice;
        }
        return acc;
      }, 0);

      // Check ticket limit per user if maxTicketsPerUser is set (> 0)
      if (event.maxTicketsPerUser > 0) {
        const userCompletedOrders = await tx.order.findMany({
          where: {
            userId: createOrderDto.userId,
            eventId: createOrderDto.eventId,
            status: 'COMPLETED',
          },
          include: {
            tickets: true,
          },
        });

        const userTotalTickets = userCompletedOrders.reduce(
          (sum, order) => sum + order.tickets.length,
          0,
        );

        const requestedTickets = vipCount + regularCount;

        if (userTotalTickets + requestedTickets > event.maxTicketsPerUser) {
          const remaining = event.maxTicketsPerUser - userTotalTickets;
          throw new BadRequestException(
            `You have already purchased ${userTotalTickets} ticket(s) for this event. The maximum allowed is ${event.maxTicketsPerUser} ticket(s) per user. You can only purchase ${remaining} more ticket(s).`,
          );
        }
      }

      await tx.event.update({
        where: {
          id: event.id,
        },
        data: {
          regularReserved: {
            increment: regularCount,
          },
          regularAvailable: {
            decrement: regularCount,
          },
          vipReserved: {
            increment: vipCount,
          },
          vipAvailable: {
            decrement: vipCount,
          },
        },
      });

      // Set expiration time to 10 minutes from now
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);

      return await tx.order.create({
        data: {
          ...data,
          total,
          status: 'PENDING',
          expiresAt,
          tickets: {
            create: tickets.flatMap((ticket) =>
              Array.from({ length: ticket.quantity }).map(() => ({
                type: ticket.type,
                price:
                  ticket.type === 'VIP' ? event.vipPrice : event.regularPrice,
                status: 'RESERVED',
                event: { connect: { id: event.id } },
              })),
            ),
          },
        },
        include: {
          tickets: true,
        },
      });
    });
  }

  async findAll() {
    return await this.prisma.order.findMany({
      include: {
        user: true,
        event: true,
        tickets: true,
        payments: true,
      },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: true,
        tickets: true,
        payments: true,
        event: {
          include: {
            venue: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ${id} not found.`);
    }

    return order;
  }

  async update(id: string, updateOrderDto: UpdateOrderDto) {
    return await this.prisma.order.update({
      where: { id },
      data: updateOrderDto,
    });
  }

  // TODO: use a prisma transaction to remove the order and remove the tickets, just for dev purposes
  async remove(id: string) {
    return await this.prisma.order.delete({ where: { id } });
  }

  async approved(orderId: string) {
    return await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: {
          id: orderId,
        },
        data: {
          status: 'COMPLETED',
          tickets: {
            updateMany: {
              where: {},
              data: {
                status: 'SOLD',
              },
            },
          },
        },
        include: {
          tickets: true,
        },
      });

      const regularCount = this.getCount('REGULAR', order.tickets);
      const vipCount = this.getCount('VIP', order.tickets);

      await tx.event.update({
        where: {
          id: order.eventId,
        },
        data: {
          regularReserved: {
            decrement: regularCount,
          },
          regularSold: {
            increment: regularCount,
          },
          vipReserved: {
            decrement: vipCount,
          },
          vipSold: {
            increment: vipCount,
          },
        },
      });
    });
  }

  // payment rejected, but order still pending...
  async rejected(orderId: string) {
    await this.prisma.order.update({
      where: {
        id: orderId,
      },
      data: {
        status: 'PENDING',
        tickets: {
          updateMany: {
            where: {},
            data: {
              status: 'RESERVED',
            },
          },
        },
      },
    });
  }

  async cancelled(orderId: string) {
    return await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: {
          id: orderId,
        },
        data: {
          status: 'CANCELLED',
          tickets: {
            updateMany: {
              where: {},
              data: {
                status: 'AVAILABLE',
              },
            },
          },
        },
        include: {
          tickets: true,
          user: true,
          payments: true,
          event: {
            include: {
              venue: true,
            },
          },
        },
      });

      const regularCount = this.getCount('REGULAR', order.tickets);
      const vipCount = this.getCount('VIP', order.tickets);

      // TODO: move this kind of function to event service as `decrementReserved`....
      await tx.event.update({
        where: {
          id: order.eventId,
        },
        data: {
          regularReserved: {
            decrement: regularCount,
          },
          regularAvailable: {
            increment: regularCount,
          },
          vipReserved: {
            decrement: vipCount,
          },
          vipAvailable: {
            increment: vipCount,
          },
        },
      });

      return order;
    });
  }

  async expired(orderId: string) {
    return await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: {
          id: orderId,
        },
        data: {
          status: 'EXPIRED',
          tickets: {
            updateMany: {
              where: {},
              data: {
                status: 'AVAILABLE',
              },
            },
          },
        },
        include: {
          tickets: true,
          user: true,
          payments: true,
          event: {
            include: {
              venue: true,
            },
          },
        },
      });

      const regularCount = this.getCount('REGULAR', order.tickets);
      const vipCount = this.getCount('VIP', order.tickets);

      await tx.event.update({
        where: {
          id: order.eventId,
        },
        data: {
          regularReserved: {
            decrement: regularCount,
          },
          regularAvailable: {
            increment: regularCount,
          },
          vipReserved: {
            decrement: vipCount,
          },
          vipAvailable: {
            increment: vipCount,
          },
        },
      });

      return order;
    });
  }

  async getExpiredOrders() {
    const now = new Date();
    return await this.prisma.order.findMany({
      where: {
        status: 'PENDING',
        expiresAt: {
          lte: now,
        },
      },
    });
  }

  getCount(type: 'REGULAR' | 'VIP', tickets: { type: string }[]) {
    return tickets.filter((ticket) => ticket.type === type).length;
  }
}
