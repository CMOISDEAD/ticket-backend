import { Test, TestingModule } from '@nestjs/testing';
import { VenuesService } from './venues.service';
import { PrismaService } from 'nestjs-prisma';
import { NotFoundException } from '@nestjs/common';

describe('VenuesService', () => {
  let service: VenuesService;
  let prisma: PrismaService;

  const mockPrismaService = {
    venue: {
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
    address: '4 Pennsylvania Plaza',
    city: 'New York',
    capacity: 20000,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VenuesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<VenuesService>(VenuesService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset de todos los mocks antes de cada test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new venue', async () => {
      const createVenueDto = {
        name: 'Madison Square Garden',
        address: '4 Pennsylvania Plaza',
        city: 'New York',
        capacity: 20000,
      };

      mockPrismaService.venue.create.mockResolvedValue(mockVenue);

      const result = await service.create(createVenueDto);

      expect(prisma.venue.create).toHaveBeenCalledWith({
        data: createVenueDto,
      });
      expect(result).toEqual(mockVenue);
    });

    it('should create a small capacity venue', async () => {
      const createVenueDto = {
        name: 'Small Theater',
        address: '123 Main Street',
        city: 'Los Angeles',
        capacity: 100,
      };

      const mockSmallVenue = {
        ...mockVenue,
        ...createVenueDto,
        id: 'venue2',
      };

      mockPrismaService.venue.create.mockResolvedValue(mockSmallVenue);

      const result = await service.create(createVenueDto);

      expect(result.capacity).toBe(100);
      expect(result.name).toBe('Small Theater');
    });

    it('should create a large capacity venue', async () => {
      const createVenueDto = {
        name: 'Olympic Stadium',
        address: '456 Stadium Avenue',
        city: 'Tokyo',
        capacity: 68000,
      };

      const mockLargeVenue = {
        ...mockVenue,
        ...createVenueDto,
        id: 'venue3',
      };

      mockPrismaService.venue.create.mockResolvedValue(mockLargeVenue);

      const result = await service.create(createVenueDto);

      expect(result.capacity).toBe(68000);
      expect(result.city).toBe('Tokyo');
    });

    it('should create venue with minimum capacity of 1', async () => {
      const createVenueDto = {
        name: 'Private Studio',
        address: '789 Studio Lane',
        city: 'Nashville',
        capacity: 1,
      };

      const mockMinVenue = {
        ...mockVenue,
        ...createVenueDto,
        id: 'venue4',
      };

      mockPrismaService.venue.create.mockResolvedValue(mockMinVenue);

      const result = await service.create(createVenueDto);

      expect(result.capacity).toBe(1);
    });
  });

  describe('findAll', () => {
    it('should return an array of venues', async () => {
      const mockVenues = [
        mockVenue,
        {
          ...mockVenue,
          id: 'venue2',
          name: 'Staples Center',
          address: '1111 S Figueroa St',
          city: 'Los Angeles',
          capacity: 19060,
        },
        {
          ...mockVenue,
          id: 'venue3',
          name: 'Wembley Stadium',
          address: 'Wembley',
          city: 'London',
          capacity: 90000,
        },
      ];

      mockPrismaService.venue.findMany.mockResolvedValue(mockVenues);

      const result = await service.findAll();

      expect(prisma.venue.findMany).toHaveBeenCalled();
      expect(result).toEqual(mockVenues);
      expect(result).toHaveLength(3);
    });

    it('should return an empty array when no venues exist', async () => {
      mockPrismaService.venue.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a venue by id', async () => {
      mockPrismaService.venue.findUnique.mockResolvedValue(mockVenue);

      const result = await service.findOne('venue1');

      expect(prisma.venue.findUnique).toHaveBeenCalledWith({
        where: { id: 'venue1' },
      });
      expect(result).toEqual(mockVenue);
    });

    it('should throw NotFoundException when venue is not found', async () => {
      mockPrismaService.venue.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('nonexistent')).rejects.toThrow(
        'Ticket with ID nonexistent not found',
      );
    });
  });

  describe('update', () => {
    it('should update a venue', async () => {
      const updateVenueDto = {
        name: 'Updated Arena Name',
        address: 'New Address 123',
        city: 'Updated City',
        capacity: 25000,
      };

      const updatedVenue = { ...mockVenue, ...updateVenueDto };
      mockPrismaService.venue.update.mockResolvedValue(updatedVenue);

      const result = await service.update('venue1', updateVenueDto);

      expect(prisma.venue.update).toHaveBeenCalledWith({
        where: { id: 'venue1' },
        data: updateVenueDto,
      });
      expect(result).toEqual(updatedVenue);
      expect(result.name).toBe('Updated Arena Name');
      expect(result.capacity).toBe(25000);
    });

    it('should update only the name', async () => {
      const updateVenueDto = {
        name: 'New Venue Name',
      };

      const updatedVenue = { ...mockVenue, name: 'New Venue Name' };
      mockPrismaService.venue.update.mockResolvedValue(updatedVenue);

      const result = await service.update('venue1', updateVenueDto);

      expect(result.name).toBe('New Venue Name');
      expect(result.address).toBe(mockVenue.address);
    });

    it('should update only the capacity', async () => {
      const updateVenueDto = {
        capacity: 30000,
      };

      const updatedVenue = { ...mockVenue, capacity: 30000 };
      mockPrismaService.venue.update.mockResolvedValue(updatedVenue);

      const result = await service.update('venue1', updateVenueDto);

      expect(result.capacity).toBe(30000);
    });

    it('should update only the address', async () => {
      const updateVenueDto = {
        address: '999 New Street',
      };

      const updatedVenue = { ...mockVenue, address: '999 New Street' };
      mockPrismaService.venue.update.mockResolvedValue(updatedVenue);

      const result = await service.update('venue1', updateVenueDto);

      expect(result.address).toBe('999 New Street');
    });

    it('should update only the city', async () => {
      const updateVenueDto = {
        city: 'Chicago',
      };

      const updatedVenue = { ...mockVenue, city: 'Chicago' };
      mockPrismaService.venue.update.mockResolvedValue(updatedVenue);

      const result = await service.update('venue1', updateVenueDto);

      expect(result.city).toBe('Chicago');
    });
  });

  describe('remove', () => {
    it('should delete a venue', async () => {
      mockPrismaService.venue.delete.mockResolvedValue(mockVenue);

      const result = await service.remove('venue1');

      expect(prisma.venue.delete).toHaveBeenCalledWith({
        where: { id: 'venue1' },
      });
      expect(result).toEqual(mockVenue);
    });

    it('should return the deleted venue data', async () => {
      mockPrismaService.venue.delete.mockResolvedValue(mockVenue);

      const result = await service.remove('venue1');

      expect(result.id).toBe('venue1');
      expect(result.name).toBe('Madison Square Garden');
    });
  });
});
