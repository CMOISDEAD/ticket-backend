import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { PrismaService } from 'nestjs-prisma';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async create(createEventDto: CreateEventDto) {
    return await this.prisma.event.create({
      data: createEventDto,
    });
  }

  async findAll() {
    return await this.prisma.event.findMany();
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        venue: true,
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    return event;
  }

  async update(id: string, updateEventDto: UpdateEventDto) {
    return await this.prisma.event.update({
      where: { id },
      data: updateEventDto,
    });
  }

  async remove(id: string) {
    return await this.prisma.event.delete({
      where: { id },
    });
  }

  async upcoming() {
    return await this.prisma.event.findMany({
      where: {
        date: {
          gte: new Date(),
        },
      },
      orderBy: {
        date: 'asc',
      },
      take: 4,
    });
  }

  async getInventory(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        venue: true,
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    return {
      eventId: event.id,
      eventName: event.name,
      date: event.date,
      venue: event.venue,
      vip: {
        total: event.vipCapacity,
        available: event.vipAvailable,
        sold: event.vipSold,
        reserved: event.vipReserved,
        price: event.vipPrice,
      },
      regular: {
        total: event.regularCapacity,
        available: event.regularAvailable,
        sold: event.regularSold,
        reserved: event.regularReserved,
        price: event.regularPrice,
      },
      totals: {
        total: event.vipCapacity + event.regularCapacity,
        available: event.vipAvailable + event.regularAvailable,
        sold: event.vipSold + event.regularSold,
        reserved: event.vipReserved + event.regularReserved,
      },
      updatedAt: event.updatedAt,
    };
  }

  async getAllInventory() {
    const events = await this.prisma.event.findMany({
      include: {
        venue: true,
      },
      orderBy: {
        date: 'asc',
      },
    });

    return events.map((event) => ({
      eventId: event.id,
      eventName: event.name,
      date: event.date,
      venue: event.venue,
      vip: {
        total: event.vipCapacity,
        available: event.vipAvailable,
        sold: event.vipSold,
        reserved: event.vipReserved,
        price: event.vipPrice,
      },
      regular: {
        total: event.regularCapacity,
        available: event.regularAvailable,
        sold: event.regularSold,
        reserved: event.regularReserved,
        price: event.regularPrice,
      },
      totals: {
        total: event.vipCapacity + event.regularCapacity,
        available: event.vipAvailable + event.regularAvailable,
        sold: event.vipSold + event.regularSold,
        reserved: event.vipReserved + event.regularReserved,
      },
      updatedAt: event.updatedAt,
    }));
  }
}
