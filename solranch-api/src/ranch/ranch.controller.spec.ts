import { Test, TestingModule } from '@nestjs/testing';
import { RanchController } from './ranch.controller';

describe('RanchController', () => {
  let controller: RanchController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RanchController],
    }).compile();

    controller = module.get<RanchController>(RanchController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
