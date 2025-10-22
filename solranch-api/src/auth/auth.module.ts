import { forwardRef, Module } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AdminGuard } from './guards/admin.guard';
import { RanchModule } from '../ranch/ranch.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_KEY');
        if (!secret) {
          throw new Error('JWT_SECRET is not defined in the .env file');
        }
        return {
          secret: secret,
          signOptions: { expiresIn: '1d' },
        };
      },
    }),
    forwardRef(() => RanchModule)
  ],
  controllers: [AuthController],
  providers: [
    AuthService, 
    JwtStrategy, 
    AdminGuard
  ],
  exports: [PassportModule, AuthService, AdminGuard],
})
export class AuthModule {}