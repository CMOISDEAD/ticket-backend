import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from './events.service';
import { PrismaService } from 'nestjs-prisma';
import { NotFoundException } from '@nestjs/common';

describe('EventsService', () => {
  let service: EventsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    event: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockVenue = {
    id: 'venue1',
    name: 'Madison Square Garden',
    address: '4 Pennsylvania Plaza, New York',
    city: 'New York',
    state: 'NY',
    country: 'USA',
    capacity: 20000,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockEvent = {
    id: 'event1',
    logo: 'https://example.com/logo.jpg',
    poster: 'https://example.com/poster.jpg',
    images: [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
    ],
    name: 'Rock Concert 2024',
    description:
      'An amazing rock concert featuring top artists from around the world',
    category: 'CONCERT' as const,
    date: new Date('2024-12-31T20:00:00Z'),
    venueId: 'venue1',
    vipCapacity: 500,
    vipAvailable: 450,
    regularCapacity: 2000,
    regularAvailable: 1800,
    vipPrice: 150.0,
    regularPrice: 50.0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockEventWithVenue = {
    ...mockEvent,
    venue: mockVenue,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset de todos los mocks antes de cada test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new event', async () => {
      const createEventDto = {
        logo: 'https://example.com/logo.jpg',
        poster: 'https://example.com/poster.jpg',
        images: [
          'https://example.com/image1.jpg',
          'https://example.com/image2.jpg',
        ],
        name: 'Rock Concert 2024',
        description:
          'An amazing rock concert featuring top artists from around the world',
        category: 'CONCERT' as const,
        date: new Date('2024-12-31T20:00:00Z'),
        venueId: 'venue1',
        vipCapacity: 500,
        vipAvailable: 450,
        regularCapacity: 2000,
        regularAvailable: 1800,
        vipPrice: 150.0,
        regularPrice: 50.0,
      };

      mockPrismaService.event.create.mockResolvedValue(mockEvent);

      const result = await service.create(createEventDto);

      expect(prisma.event.create).toHaveBeenCalledWith({
        data: createEventDto,
      });
      expect(result).toEqual(mockEvent);
    });

    it('should create a THEATER event', async () => {
      const createEventDto = {
        logo: 'https://example.com/theater-logo.jpg',
        poster: 'https://example.com/theater-poster.jpg',
        images: ['https://example.com/theater1.jpg'],
        name: 'Broadway Musical',
        description: 'A spectacular Broadway musical performance',
        category: 'THEATER' as const,
        date: new Date('2024-11-15T19:00:00Z'),
        venueId: 'venue2',
        vipCapacity: 200,
        vipAvailable: 200,
        regularCapacity: 800,
        regularAvailable: 800,
        vipPrice: 200.0,
        regularPrice: 75.0,
      };

      const mockTheaterEvent = { ...mockEvent, ...createEventDto };
      mockPrismaService.event.create.mockResolvedValue(mockTheaterEvent);

      const result = await service.create(createEventDto);

      expect(result.category).toBe('THEATER');
      expect(result.name).toBe('Broadway Musical');
    });

    it('should create a SPORT event', async () => {
      const createEventDto = {
        logo: 'https://example.com/sport-logo.jpg',
        poster: 'https://example.com/sport-poster.jpg',
        images: ['https://example.com/sport1.jpg'],
        name: 'Championship Finals',
        description: 'The ultimate championship showdown',
        category: 'SPORT' as const,
        date: new Date('2025-01-20T18:00:00Z'),
        venueId: 'venue3',
        vipCapacity: 1000,
        vipAvailable: 950,
        regularCapacity: 5000,
        regularAvailable: 4500,
        vipPrice: 250.0,
        regularPrice: 100.0,
      };

      const mockSportEvent = { ...mockEvent, ...createEventDto };
      mockPrismaService.event.create.mockResolvedValue(mockSportEvent);

      const result = await service.create(createEventDto);

      expect(result.category).toBe('SPORT');
    });
  });

  describe('findAll', () => {
    it('should return an array of events', async () => {
      const mockEvents = [
        mockEvent,
        {
          ...mockEvent,
          id: 'event2',
          name: 'Jazz Festival 2024',
          category: 'FESTIVAL' as const,
        },
        {
          ...mockEvent,
          id: 'event3',
          name: 'Soccer Match',
          category: 'SPORT' as const,
        },
      ];

      mockPrismaService.event.findMany.mockResolvedValue(mockEvents);

      const result = await service.findAll();

      expect(prisma.event.findMany).toHaveBeenCalled();
      expect(result).toEqual(mockEvents);
      expect(result).toHaveLength(3);
    });

    it('should return an empty array when no events exist', async () => {
      mockPrismaService.event.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return an event with venue by id', async () => {
      mockPrismaService.event.findUnique.mockResolvedValue(mockEventWithVenue);

      const result = await service.findOne('event1');

      expect(prisma.event.findUnique).toHaveBeenCalledWith({
        where: { id: 'event1' },
        include: {
          venue: true,
        },
      });
      expect(result).toEqual(mockEventWithVenue);
      expect(result.venue).toBeDefined();
      expect(result.venue.name).toBe('Madison Square Garden');
    });

    it('should throw NotFoundException when event is not found', async () => {
      mockPrismaService.event.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('nonexistent')).rejects.toThrow(
        'Event with ID nonexistent not found',
      );
    });
  });

  describe('update', () => {
    it('should update an event', async () => {
      const updateEventDto = {
        name: 'Updated Concert Name',
        description: 'Updated description for the concert',
        vipAvailable: 400,
        regularAvailable: 1500,
      };

      const updatedEvent = { ...mockEvent, ...updateEventDto };
      mockPrismaService.event.update.mockResolvedValue(updatedEvent);

      const result = await service.update('event1', updateEventDto);

      expect(prisma.event.update).toHaveBeenCalledWith({
        where: { id: 'event1' },
        data: updateEventDto,
      });
      expect(result.name).toBe('Updated Concert Name');
      expect(result.vipAvailable).toBe(400);
    });

    it('should update event prices', async () => {
      const updateEventDto = {
        vipPrice: 200.0,
        regularPrice: 75.0,
      };

      const updatedEvent = { ...mockEvent, ...updateEventDto };
      mockPrismaService.event.update.mockResolvedValue(updatedEvent);

      const result = await service.update('event1', updateEventDto);

      expect(result.vipPrice).toBe(200.0);
      expect(result.regularPrice).toBe(75.0);
    });

    it('should update event category', async () => {
      const updateEventDto = {
        category: 'FESTIVAL' as const,
      };

      const updatedEvent = { ...mockEvent, ...updateEventDto };
      mockPrismaService.event.update.mockResolvedValue(updatedEvent);

      const result = await service.update('event1', updateEventDto);

      expect(result.category).toBe('FESTIVAL');
    });

    it('should update event date', async () => {
      const newDate = new Date('2025-06-15T21:00:00Z');
      const updateEventDto = {
        date: newDate,
      };

      const updatedEvent = { ...mockEvent, date: newDate };
      mockPrismaService.event.update.mockResolvedValue(updatedEvent);

      const result = await service.update('event1', updateEventDto);

      expect(result.date).toEqual(newDate);
    });
  });

  describe('remove', () => {
    it('should delete an event', async () => {
      mockPrismaService.event.delete.mockResolvedValue(mockEvent);

      const result = await service.remove('event1');

      expect(prisma.event.delete).toHaveBeenCalledWith({
        where: { id: 'event1' },
      });
      expect(result).toEqual(mockEvent);
    });
  });

  describe('upcoming', () => {
    it('should return upcoming events ordered by date', async () => {
      const now = new Date();
      const mockUpcomingEvents = [
        {
          ...mockEvent,
          id: 'event1',
          name: 'Event Tomorrow',
          date: new Date(now.getTime() + 86400000), // +1 day
        },
        {
          ...mockEvent,
          id: 'event2',
          name: 'Event Next Week',
          date: new Date(now.getTime() + 604800000), // +7 days
        },
        {
          ...mockEvent,
          id: 'event3',
          name: 'Event Next Month',
          date: new Date(now.getTime() + 2592000000), // +30 days
        },
        {
          ...mockEvent,
          id: 'event4',
          name: 'Event in 2 Months',
          date: new Date(now.getTime() + 5184000000), // +60 days
        },
      ];

      mockPrismaService.event.findMany.mockResolvedValue(mockUpcomingEvents);

      const result = await service.upcoming();

      expect(prisma.event.findMany).toHaveBeenCalledWith({
        where: {
          date: {
            gte: expect.any(Date),
          },
        },
        orderBy: {
          date: 'asc',
        },
        take: 4,
      });
      expect(result).toHaveLength(4);
      expect(result[0].name).toBe('Event Tomorrow');
      expect(result[3].name).toBe('Event in 2 Months');
    });

    it('should return empty array when no upcoming events', async () => {
      mockPrismaService.event.findMany.mockResolvedValue([]);

      const result = await service.upcoming();

      expect(result).toEqual([]);
    });

    it('should limit results to 4 events', async () => {
      const now = new Date();
      const mockUpcomingEvents = [
        {
          ...mockEvent,
          id: 'event1',
          date: new Date(now.getTime() + 86400000),
        },
        {
          ...mockEvent,
          id: 'event2',
          date: new Date(now.getTime() + 172800000),
        },
        {
          ...mockEvent,
          id: 'event3',
          date: new Date(now.getTime() + 259200000),
        },
        {
          ...mockEvent,
          id: 'event4',
          date: new Date(now.getTime() + 345600000),
        },
      ];

      mockPrismaService.event.findMany.mockResolvedValue(mockUpcomingEvents);

      const result = await service.upcoming();

      expect(result).toHaveLength(4);
      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 4 }),
      );
    });

    it('should only return events with date >= current date', async () => {
      const now = new Date();
      mockPrismaService.event.findMany.mockResolvedValue([]);

      await service.upcoming();

      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            date: {
              gte: expect.any(Date),
            },
          },
        }),
      );
    });
  });
});
