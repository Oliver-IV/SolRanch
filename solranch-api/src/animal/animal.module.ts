import { Module, forwardRef } from '@nestjs/common'; 
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnimalService } from './animal.service';
import { AnimalController } from './animal.controller';
import { AuthModule } from '../auth/auth.module';
import { VerifierModule } from '../verifier/verifier.module';
import { Animal } from './entities/animal.entity';
import { Ranch } from '../ranch/entities/ranch.entity';
import { Verifier } from '../verifier/entities/verifier.entity';
import { User } from '../auth/entities/user.entity';
import { PendingTransaction } from './entities/pending-tx.entity';
import { SolanaModule } from '../solana/solana.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Animal,
      Ranch,
      Verifier,
      User,
      PendingTransaction,
    ]),
    forwardRef(() => AuthModule), 
    VerifierModule, 
    SolanaModule
  ],
  controllers: [AnimalController],
  providers: [AnimalService],
  exports: [AnimalService] 
})
export class AnimalModule {}