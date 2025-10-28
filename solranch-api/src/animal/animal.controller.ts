import {
    Controller,
    Post,
    Get,
    Body,
    Req,
    Param,
    UseGuards,
    HttpCode,
    HttpStatus,
    Query,
    Delete,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AnimalService } from './animal.service';
import { VerifierGuard } from '../auth/guards/verifier.guard';
import { CreateAnimalDto } from './dto/create-animal.dto';
import { ConfirmAnimalDto } from './dto/confirm-animal.dto';
import { RancherGuard } from '../auth/guards/rancher.guard';
import { SetAnimalPriceDto } from './dto/set-animal-price.dto';
import { ConfirmTxDto } from './dto/confirm-tx.dto';
import { SetAllowedBuyerDto } from './dto/set-allowed-buyer.dto';
import { FindAnimalsQueryDto } from './dto/find-animals-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { Public } from '../auth/decorators/public.decorator';
import { AddRancherSignatureDto } from './dto/add-rancher-signature.dto';

@UseGuards(JwtAuthGuard)
@Controller('animal')
export class AnimalController {
    constructor(private readonly animalService: AnimalService) {}

    @Post('build-tx')
    @UseGuards(RancherGuard)
    @HttpCode(HttpStatus.CREATED)
    buildTx(@Body() dto: CreateAnimalDto, @Req() req) {
        return this.animalService.buildRegisterAnimalTx(dto, req.user.pubkey);
    }

    @Post('confirm')
    @UseGuards(RancherGuard)
    @HttpCode(HttpStatus.CREATED)
    confirmRegistration(@Body() dto: ConfirmTxDto, @Req() req) {
        return this.animalService.confirmRegisterAnimal(dto, req.user.pubkey);
    }

    @Post('cancel-tx/:pda/build')
    @UseGuards(RancherGuard)
    @HttpCode(HttpStatus.OK)
    buildCancelAnimalTx(@Param('pda') animalPda: string, @Req() req) {
        return this.animalService.buildCancelAnimalTx(animalPda, req.user.pubkey);
    }

    @Post('reject-tx/:pda/build')
    @UseGuards(VerifierGuard)
    @HttpCode(HttpStatus.OK)
    buildRejectAnimalTx(@Param('pda') animalPda: string, @Req() req) {
        return this.animalService.buildRejectAnimalTx(animalPda, req.user.pubkey);
    }

    @Post('reject-tx/:pda/confirm')
    @UseGuards(VerifierGuard)
    @HttpCode(HttpStatus.OK)
    confirmRejectAnimal(@Param('pda') animalPda: string, @Body() dto: ConfirmTxDto, @Req() req) {
        return this.animalService.confirmRejectAnimal(animalPda, dto, req.user.pubkey);
    }

    @Post('cancel-tx/:pda/confirm')
    @UseGuards(RancherGuard)
    @HttpCode(HttpStatus.OK)
    confirmCancelAnimal(@Param('pda') animalPda: string, @Body() dto: ConfirmTxDto, @Req() req) {
        return this.animalService.confirmCancelAnimal(animalPda, dto, req.user.pubkey);
    }

    @Get('pending-for-me')
    @UseGuards(VerifierGuard)
    getPendingForVerifier(@Req() req) {
        return this.animalService.getPendingAnimalsForVerifier(req.user.pubkey);
    }

    @Get('pending-tx/:pda/build')
    @UseGuards(VerifierGuard)
    buildApproveAnimalTx(@Param('pda') animalPda: string, @Req() req) {
        return this.animalService.buildApproveAnimalTx(animalPda, req.user.pubkey);
    }

    @Post('pending-tx/:pda/confirm')
    @UseGuards(VerifierGuard)
    @HttpCode(HttpStatus.CREATED)
    confirmApproveAnimal(@Param('pda') animalPda: string, @Body() dto: ConfirmTxDto, @Req() req) {
        return this.animalService.confirmApproveAnimal(animalPda, dto, req.user.pubkey);
    }

    @Post(':pda/build-set-price')
    @HttpCode(HttpStatus.OK)
    buildSetPriceTx(@Param('pda') pda: string, @Body() dto: SetAnimalPriceDto, @Req() req) {
        console.log("PDA: " + pda) ;
        return this.animalService.buildSetPriceTx(pda, dto, req.user.pubkey);
    }

    @Post(':pda/confirm-set-price')
    @HttpCode(HttpStatus.OK)
    confirmSetPrice(@Param('pda') pda: string, @Body() dto: ConfirmTxDto, @Req() req) {
        console.log("PDA: " + pda) ;
        return this.animalService.confirmSetPrice(pda, dto, req.user.pubkey);
    }

    @Post(':pda/build-set-allowed-buyer')
    @HttpCode(HttpStatus.OK)
    buildSetAllowedBuyerTx(@Param('pda') pda: string, @Body() dto: SetAllowedBuyerDto, @Req() req) {
        return this.animalService.buildSetAllowedBuyerTx(pda, dto, req.user.pubkey);
    }

    @Post(':pda/confirm-set-allowed-buyer')
    @HttpCode(HttpStatus.OK)
    confirmSetAllowedBuyer(@Param('pda') pda: string, @Body() dto: ConfirmTxDto, @Req() req) {
        return this.animalService.confirmSetAllowedBuyer(pda, dto, req.user.pubkey);
    }

    @Post(':pda/build-purchase')
    @HttpCode(HttpStatus.OK)
    buildPurchaseTx(@Param('pda') pda: string, @Req() req) {
        return this.animalService.buildPurchaseTx(pda, req.user.pubkey);
    }

    @Post(':pda/confirm-purchase')
    @HttpCode(HttpStatus.OK)
    confirmPurchase(@Param('pda') pda: string, @Body() dto: ConfirmTxDto, @Req() req) {
        return this.animalService.confirmPurchase(pda, dto, req.user.pubkey);
    }

    @Get('pending/me')
    @UseGuards(RancherGuard)
    getMyPendingAnimals(@Req() req) {
        return this.animalService.findPendingForRancher(req.user.pubkey);
    }

    @Get(':pda')
    @Public()
    findAnimalByPda(@Param('pda') pda: string) {
        return this.animalService.findAnimalByPda(pda);
    }

    @Get()
    @HttpCode(HttpStatus.OK)
    @Public()
    findAllWithFilters(@Query() queryDto: FindAnimalsQueryDto) {
        return this.animalService.findAllWithFilters(queryDto);
    }
}