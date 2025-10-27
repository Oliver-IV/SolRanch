import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  Query,
  Param,
} from '@nestjs/common';
import { AdminGuard } from '../auth/guards/admin.guard';
import { VerifierService } from './verifier.service';
import { RegisterVerifierDto } from './dto/register-verifier.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { Public } from '../auth/decorators/public.decorator';
import { FindVerifiersQueryDto } from './dto/find-verifiers-query.dto';

@UseGuards(JwtAuthGuard)
@Controller('verifiers')
export class VerifierController {
  constructor(private readonly verifierService: VerifierService) { }

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  findAllWithFilters(@Query() queryDto: FindVerifiersQueryDto) {
    return this.verifierService.findAllWithFilters(queryDto);
  }

  @Get('me')
  getVerifierStatus(@Req() req) {
    return this.verifierService.getVerifierStatus(req.user.pubkey);
  }

  @Post('register')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterVerifierDto) {
    return this.verifierService.register(dto);
  }

  @Post('toggle-status/:pda')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  async toggleVerifierStatus(@Param('pda') pda: string) {
    return this.verifierService.toggleVerifierStatus(pda);
  }
}