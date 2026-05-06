import { Test, TestingModule } from '@nestjs/testing';
import { PlusService } from './plus.service';

describe('PlusService', () => {
  let service: PlusService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlusService],
    }).compile();

    service = module.get<PlusService>(PlusService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
