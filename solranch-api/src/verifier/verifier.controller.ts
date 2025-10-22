import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../auth/guards/admin.guard';
import { VerifierService } from './verifier.service';
import { RegisterVerifierDto } from './dto/register-verifier.dto';

@Controller('verifiers')
export class VerifierController {
  constructor(private readonly verifierService: VerifierService) {}

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  checkVerifierStatus(@Req() req) {
    return this.verifierService.getVerifierStatus(req.user.sub);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  findAll() {
    return this.verifierService.findAll();
  }

  @Post('register')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterVerifierDto) {
    return this.verifierService.register(dto);
  }
}