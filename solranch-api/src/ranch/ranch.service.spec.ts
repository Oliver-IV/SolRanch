import { Test, TestingModule } from '@nestjs/testing';
import { RanchService } from './ranch.service';

describe('RanchService', () => {
  let service: RanchService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RanchService],
    }).compile();

    service = module.get<RanchService>(RanchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
