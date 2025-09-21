import { Test, TestingModule } from '@nestjs/testing';
import { LinksController } from './links.controller';
import { LinksService } from './links.service';
import { IdempotencyHook } from './IdempotencyCreateHook';
import { PrismaService } from './prisma.service';

describe('LinksController', () => {
  let controller: LinksController;
  let linksService: LinksService;

  beforeEach(async () => {
    const linksServiceMock = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LinksController],
      providers: [{ provide: LinksService, useValue: linksServiceMock }, PrismaService, IdempotencyHook],
    }).compile();

    controller = module.get<LinksController>(LinksController);
    linksService = module.get<LinksService>(LinksService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
