import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  Param,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { RanchService } from './ranch.service';
import { RegisterRanchDto } from './dto/register-ranch.dto';
import { ConfirmRanchDto } from './dto/confirm-ranch.dto';
import { AdminGuard } from '../auth/guards/admin.guard';
import { FindRanchesQueryDto } from './dto/find-ranches-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { Public } from '../auth/decorators/public.decorator';

@UseGuards(JwtAuthGuard)
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
    console.log('>>> [RANCH CONTROLLER] req.user:', req.user);
    const userPubkey: string = req.user.pubkey;
    return this.ranchService.confirmRegistration(dto, userPubkey);
  }

  @Post('verify/:pda')
  @UseGuards(AdminGuard) 
  @HttpCode(HttpStatus.OK)
  async verifyRanch(@Param('pda') pda: string) {
    return this.ranchService.verifyRanch(pda);
  }

  @Get('me')
  async getMyRanch(@Req() req) {
    const userPubkey: string = req.user.pubkey;
    return this.ranchService.findMyRanch(userPubkey);
  }

  @Get() 
  @Public()
  @HttpCode(HttpStatus.OK)
  findAllWithFilters(@Query() queryDto: FindRanchesQueryDto) {
    return this.ranchService.findAllWithFilters(queryDto);
  }
}