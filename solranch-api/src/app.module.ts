import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SolanaModule } from './solana/solana.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { RanchModule } from './ranch/ranch.module';
import { VerifierModule } from './verifier/verifier.module';
import { AnimalModule } from './animal/animal.module';

@Module({
  imports: [SolanaModule, DatabaseModule, AuthModule, RanchModule, VerifierModule, AnimalModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
