import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { SolanaModule } from './solana/solana.module';
import { RanchModule } from './ranch/ranch.module';
import { VerifierModule } from './verifier/verifier.module';
import { AnimalModule } from './animal/animal.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './auth/entities/user.entity';
import { Ranch } from './ranch/entities/ranch.entity';
import { Animal } from './animal/entities/animal.entity';
import { Verifier } from './verifier/entities/verifier.entity';
import { PendingTransaction } from './animal/entities/pending-tx.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule], 
      inject: [ConfigService], 
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USER'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: true,
        entities:[
          Ranch,
          User,
          Animal,
          Verifier,
          PendingTransaction
        ]
      })
    }),
    SolanaModule,
    AuthModule,
    RanchModule,
    VerifierModule,
    AnimalModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}