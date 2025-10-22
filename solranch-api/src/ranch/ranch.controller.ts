import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RanchService } from './ranch.service';
import { RegisterRanchDto } from './dto/register-ranch.dto';
import { ConfirmRanchDto } from './dto/confirm-ranch.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('ranch')
export class RanchController {
  constructor(private readonly ranchService: RanchService) {}

  @Post('build-tx')
  async buildRegisterRanch(
    @Body() dto: RegisterRanchDto,
    @Req() req,
  ) {
    const userPubkey: string = req.user.pubkey;
    return this.ranchService.buildRegisterTransaction(dto, userPubkey);
  }

  @Post('confirm')
  async confirmRegisterRanch(
    @Body() dto: ConfirmRanchDto,
    @Req() req,
  ) {
    const userPubkey: string = req.user.pubkey;
    return this.ranchService.confirmRegistration(dto, userPubkey);
  }

  @Get('me')
  async getMyRanch(@Req() req) {
    const userPubkey: string = req.user.pubkey;
    return this.ranchService.findMyRanch(userPubkey);
  }

  @Get()
  async getAllRanches() {
    return this.ranchService.findAll();
  }
}