import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from 'nestjs-prisma';
import { NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

// Mock de bcrypt
jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockUser = {
    id: '1',
    fullnames: 'John Michael',
    lastnames: 'Doe Smith',
    username: 'johndoe123',
    email: 'test@example.com',
    password: 'hashedPassword123',
    phone: '1234567890',
    address: '123 Main Street',
    role: 'USER' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserWithOrders = {
    ...mockUser,
    order: [
      {
        id: 'order1',
        userId: '1',
        eventId: 'event1',
        totalAmount: 100,
        createdAt: new Date(),
        tickets: [
          {
            id: 'ticket1',
            orderId: 'order1',
            seatNumber: 'A1',
          },
        ],
        event: {
          id: 'event1',
          name: 'Test Event',
          venue: {
            id: 'venue1',
            name: 'Test Venue',
          },
        },
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset de todos los mocks antes de cada test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user with hashed password', async () => {
      const createUserDto = {
        fullnames: 'John Michael',
        lastnames: 'Doe Smith',
        username: 'johndoe123',
        email: 'test@example.com',
        password: 'password123',
        phone: '1234567890',
        address: '123 Main Street',
        role: 'USER' as const,
      };

      const hashedPassword = 'hashedPassword123';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockPrismaService.user.create.mockResolvedValue(mockUser);

      const result = await service.create(createUserDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          ...createUserDto,
          password: hashedPassword,
        },
      });
      expect(result).toEqual(mockUser);
    });

    it('should create a user with ADMIN role', async () => {
      const createUserDto = {
        fullnames: 'Admin User',
        lastnames: 'Administrator',
        username: 'admin123',
        email: 'admin@example.com',
        password: 'adminpass123',
        phone: '9876543210',
        address: '456 Admin Avenue',
        role: 'ADMIN' as const,
      };

      const mockAdminUser = {
        ...mockUser,
        ...createUserDto,
        password: 'hashedPassword123',
      };
      const hashedPassword = 'hashedPassword123';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockPrismaService.user.create.mockResolvedValue(mockAdminUser);

      const result = await service.create(createUserDto);

      expect(result.role).toBe('ADMIN');
      expect(bcrypt.hash).toHaveBeenCalledWith('adminpass123', 10);
    });

    it('should default to USER role when not specified', async () => {
      const createUserDto = {
        fullnames: 'Regular User',
        lastnames: 'Standard Person',
        username: 'regular123',
        email: 'regular@example.com',
        password: 'password123',
        phone: '5555555555',
        address: '789 User Road',
      };

      const hashedPassword = 'hashedPassword123';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockPrismaService.user.create.mockResolvedValue(mockUser);

      const result = await service.create(createUserDto);

      expect(result).toEqual(mockUser);
    });
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const mockUsers = [
        mockUser,
        {
          ...mockUser,
          id: '2',
          email: 'test2@example.com',
          username: 'janedoe456',
          fullnames: 'Jane Elizabeth',
          lastnames: 'Doe Johnson',
        },
      ];
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.findAll();

      expect(prisma.user.findMany).toHaveBeenCalled();
      expect(result).toEqual(mockUsers);
    });

    it('should return an empty array when no users exist', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findOne('1');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user is not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('999')).rejects.toThrow(
        'User with 999 not found.',
      );
    });
  });

  describe('update', () => {
    it('should update a user without password', async () => {
      const updateUserDto = {
        fullnames: 'Updated John',
        lastnames: 'Updated Doe',
        email: 'updated@example.com',
        phone: '9999999999',
        address: '999 New Address',
      };

      const updatedUser = { ...mockUser, ...updateUserDto };
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.update('1', updateUserDto);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateUserDto,
      });
      expect(result).toEqual(updatedUser);
    });

    it('should update a user with hashed password', async () => {
      const updateUserDto = {
        fullnames: 'Updated Name',
        password: 'newPassword123',
      };

      const hashedPassword = 'newHashedPassword123';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const updatedUser = { ...mockUser, fullnames: updateUserDto.fullnames };
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.update('1', updateUserDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword123', 10);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          fullnames: 'Updated Name',
          password: hashedPassword,
        },
      });
      expect(result).toEqual(updatedUser);
    });

    it('should update user role to ADMIN', async () => {
      const updateUserDto = {
        role: 'ADMIN' as const,
      };

      const updatedUser = { ...mockUser, role: 'ADMIN' as const };
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.update('1', updateUserDto);

      expect(result.role).toBe('ADMIN');
    });
  });

  describe('remove', () => {
    it('should delete a user', async () => {
      mockPrismaService.user.delete.mockResolvedValue(mockUser);

      const result = await service.remove('1');

      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('me', () => {
    it('should return user with orders, tickets, events and venues', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUserWithOrders);

      const result = await service.me('1');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: {
          order: {
            include: {
              tickets: true,
              event: {
                include: {
                  venue: true,
                },
              },
            },
          },
        },
      });
      expect(result).toEqual(mockUserWithOrders);
    });

    it('should return null if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.me('999');

      expect(result).toBeNull();
    });
  });

  describe('getUserOrders', () => {
    it('should return user orders sorted by createdAt desc', async () => {
      const mockUserOrders = {
        order: [
          {
            id: 'order1',
            createdAt: new Date('2024-01-02'),
            event: {
              id: 'event1',
              name: 'Event 1',
              venue: {
                id: 'venue1',
                name: 'Venue 1',
              },
            },
            tickets: [{ id: 'ticket1' }],
          },
          {
            id: 'order2',
            createdAt: new Date('2024-01-01'),
            event: {
              id: 'event2',
              name: 'Event 2',
              venue: {
                id: 'venue2',
                name: 'Venue 2',
              },
            },
            tickets: [{ id: 'ticket2' }],
          },
        ],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUserOrders);

      const result = await service.getUserOrders('1');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        select: {
          order: {
            orderBy: {
              createdAt: 'desc',
            },
            include: {
              event: {
                include: {
                  venue: true,
                },
              },
              tickets: true,
            },
          },
        },
      });
      expect(result).toEqual(mockUserOrders);
    });

    it('should return null if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.getUserOrders('999');

      expect(result).toBeNull();
    });
  });
});
