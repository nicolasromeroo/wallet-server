import { Test, TestingModule } from '@nestjs/testing';
import { PlusController } from './plus.controller';
import { PlusService } from './plus.service';

describe('PlusController', () => {
  let controller: PlusController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlusController],
      providers: [PlusService],
    }).compile();

    controller = module.get<PlusController>(PlusController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
