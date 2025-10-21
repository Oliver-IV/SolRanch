import { Module } from '@nestjs/common';
import { RanchService } from './ranch.service';
import { RanchController } from './ranch.controller';

@Module({
  providers: [RanchService],
  controllers: [RanchController]
})
export class RanchModule {}
