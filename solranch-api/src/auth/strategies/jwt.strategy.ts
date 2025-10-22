import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
const cookieExtractor = (req: Request): string | null => {
  if (req && req.cookies) {
    return req.cookies['auth_token'];
  }
  return null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    const secret = configService.get<string>('JWT_KEY'); ;

    if (!secret) {
      throw new Error('JWT_SECRET is not on .env');
    }
    super({
      jwtFromRequest: cookieExtractor,
      ignoreExpiration: false,
      secretOrKey: secret, 
    });
  }

  async validate(payload: any) {
    if (!payload.sub || !payload.roles) {
      throw new UnauthorizedException('Invalid Payload');
    }
    console.log('>>> [JWT STRATEGY] Returning user:', { pubkey: payload.sub, roles: payload.roles });
    return { pubkey: payload.sub, roles: payload.roles };
  }
}