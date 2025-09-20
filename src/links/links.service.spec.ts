import { Test, TestingModule } from '@nestjs/testing';
import { LinksService } from './links.service';
import { PrismaService } from './prisma.service';


describe('LinksService', () => {
  let service: LinksService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const prismaMock = {
      links: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinksService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<LinksService>(LinksService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a link with provided slug', async () => {
      const createLinkDto = {
        url: 'https://example.com',
        slug: 'test123',
        expiresAt: new Date('2025-12-31'),
      };

      const expectedLink = {
        slug: 'test123',
        url: 'https://example.com',
        expiresat: new Date('2025-12-31'),
        visits: 0,
      };

      (prismaService.links.create as jest.Mock).mockResolvedValue(expectedLink);

      const result = await service.create(createLinkDto);

      expect(result).toEqual(expectedLink);
      expect(prismaService.links.create).toHaveBeenCalledWith({
        data: {
          slug: 'test123',
          url: 'https://example.com',
          expiresat: new Date('2025-12-31'),
          visits: 0,
        },
      });
    });

    it('should create a link without expiration date', async () => {
      const createLinkDto = {
        url: 'https://example.com',
        slug: 'test123',
      };

      const expectedLink = {
        slug: 'test123',
        url: 'https://example.com',
        expiresat: null,
        visits: 0,
      };

      (prismaService.links.create as jest.Mock).mockResolvedValue(expectedLink);

      const result = await service.create(createLinkDto);

      expect(result).toEqual(expectedLink);
      expect(prismaService.links.create).toHaveBeenCalledWith({
        data: {
          slug: 'test123',
          url: 'https://example.com',
          expiresat: null,
          visits: 0,
        },
      });
    });

    it('should throw BadRequestException for invalid URL format', async () => {
      const createLinkDto = {
        url: 'invalid-url',
        slug: 'test123',
      };

      await expect(service.create(createLinkDto)).rejects.toThrow(
        'Invalid URL format. URL must start with http:// or https://'
      );
    });

    it('should throw BadRequestException for URL without protocol', async () => {
      const createLinkDto = {
        url: 'example.com',
        slug: 'test123',
      };

      await expect(service.create(createLinkDto)).rejects.toThrow(
        'Invalid URL format. URL must start with http:// or https://'
      );
    });

    it('should throw BadRequestException for past expiration date', async () => {
      const createLinkDto = {
        url: 'https://example.com',
        slug: 'test123',
        expiresAt: new Date('2020-01-01'),
      };

      await expect(service.create(createLinkDto)).rejects.toThrow(
        'Expiration date cannot be in the past.'
      );
    });

    it('should accept valid URLs with different formats', async () => {
      const testCases = [
        'https://www.example.com',
        'http://example.com',
        'https://subdomain.example.com/path',
        'https://example.com:8080',
      ];

      for (const url of testCases) {
        const createLinkDto = {
          url,
          slug: 'test123',
        };

        (prismaService.links.create as jest.Mock).mockResolvedValue({
          slug: 'test123',
          url,
          expiresat: null,
          visits: 0,
        });

        await expect(service.create(createLinkDto)).resolves.toBeDefined();
      }
    });

    it('should handle Prisma errors and rethrow them', async () => {
      const createLinkDto = {
        url: 'https://example.com',
        slug: 'test123',
      };

      const prismaError = new Error('Database connection failed');
      (prismaService.links.create as jest.Mock).mockRejectedValue(prismaError);

      await expect(service.create(createLinkDto)).rejects.toThrow('Database connection failed');
    });

    it('should generate unique slugs for multiple calls', async () => {
      const createLinkDto = {
        url: 'https://example.com',
      };

      const slugs = new Set();
      (prismaService.links.create as jest.Mock).mockImplementation(({ data }) => {
        slugs.add(data.slug);
        return Promise.resolve({
          ...data,
          visits: 0,
        });
      });

      // Generate multiple slugs
      for (let i = 0; i < 10; i++) {
        await service.create(createLinkDto);
      }

      // All slugs should be unique
      expect(slugs.size).toBe(10);
    });
  });
});
