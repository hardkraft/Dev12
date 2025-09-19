import { Test, TestingModule } from '@nestjs/testing';
import { LinksController } from './links.controller';
import { LinksService } from './links.service';

describe('LinksController', () => {
  let controller: LinksController;
  let linksService: LinksService;

  beforeEach(async () => {
    const linksServiceMock = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LinksController],
      providers: [{ provide: LinksService, useValue: linksServiceMock }],
    }).compile();

    controller = module.get<LinksController>(LinksController);
    linksService = module.get<LinksService>(LinksService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
