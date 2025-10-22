import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ranch } from './entities/ranch.entity';
import { User } from '../auth/entities/user.entity';
import { RanchController } from './ranch.controller';
import { RanchService } from './ranch.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ranch, User]),
    forwardRef(() => AuthModule),
  ],
  controllers: [RanchController],
  providers: [RanchService],
})
export class RanchModule {}