import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Res,
  UseGuards,
  Get,
  Req,
} from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { LoginRequestDto } from './dto/login-request.dto';
import { LoginVerifyDto } from './dto/login-verify.dto';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('login-request')
  @HttpCode(HttpStatus.OK)
  async loginRequest(@Body() dto: LoginRequestDto) {
    return this.authService.getNonceToSign(dto.pubkey);
  }

  @Post('login-verify')
  @HttpCode(HttpStatus.OK)
  async loginVerify(
    @Body() dto: LoginVerifyDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken } = await this.authService.login(dto);

    res.cookie('auth_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000 * 24,
    });

    return { status: 'success', message: 'Logged in' };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    return { status: 'success', message: 'Logged out' };
  }

  @Post('refresh-token')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Req() req,
    @Res({ passthrough: true }) res: Response,
  ) {
    const pubkey = req.user.pubkey;
    const refreshed = await this.authService.refreshToken(pubkey);

    res.cookie('auth_token', refreshed.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000 * 24,
    });

    return { status: 'success', message: 'Token refreshed' };
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  getProfile(@Req() req) {
    return this.authService.getProfile(req.user);
  }
}