import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Verifier } from './entities/verifier.entity';
import { User } from '../auth/entities/user.entity';
import { AuthModule } from '../auth/auth.module'; 
import { VerifierController } from './verifier.controller';
import { VerifierService } from './verifier.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Verifier, User]),
    AuthModule, 
  ],
  controllers: [VerifierController],
  providers: [VerifierService],
  exports: [VerifierService], 
})
export class VerifierModule {}