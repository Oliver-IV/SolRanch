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
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AnimalService } from './animal.service';
import { VerifierGuard } from '../auth/guards/verifier.guard';
import { CreateAnimalDto } from './dto/create-animal.dto';
import { AddRancherSignatureDto } from './dto/add-rancher-signature.dto';
import { ConfirmAnimalDto } from './dto/confirm-animal.dto';
import { RancherGuard } from '../auth/guards/rancher.guard';
import { SetAnimalPriceDto } from './dto/set-animal-price.dto';
import { ConfirmTxDto } from './dto/confirm-tx.dto';
import { SetAllowedBuyerDto } from './dto/set-allowed-buyer.dto';

// Todas las rutas requieren login
@UseGuards(AuthGuard('jwt'))
@Controller('animal')
export class AnimalController {
    constructor(private readonly animalService: AnimalService) { }

    @Post('build-tx')
    @UseGuards(RancherGuard)
    @HttpCode(HttpStatus.CREATED)
    buildTx(@Body() dto: CreateAnimalDto, @Req() req) {
        return this.animalService.buildTx(dto, req.user.pubkey);
    }

    @Post('rancher-sign')
    @UseGuards(RancherGuard)
    @HttpCode(HttpStatus.OK)
    addRancherSignature(@Body() dto: AddRancherSignatureDto, @Req() req) {
        return this.animalService.addRancherSignature(dto, req.user.pubkey);
    }

    @Get('pending-for-me')
    @UseGuards(VerifierGuard)
    getPendingForVerifier(@Req() req) {
        return this.animalService.getPendingForVerifier(req.user.pubkey);
    }

    @Get('pending-tx/:pda')
    @UseGuards(VerifierGuard)
    getTxForVerifier(@Param('pda') animalPda: string, @Req() req) {
        return this.animalService.getTxForVerifier(animalPda, req.user.pubkey);
    }

    @Post('confirm')
    @UseGuards(VerifierGuard)
    @HttpCode(HttpStatus.CREATED)
    confirmRegistration(@Body() dto: ConfirmAnimalDto, @Req() req) {
        return this.animalService.confirmRegistration(dto, req.user.pubkey);
    }

    @Post(':pda/build-set-price')
    @HttpCode(HttpStatus.OK)
    buildSetPriceTx(@Param('pda') pda: string, @Body() dto: SetAnimalPriceDto, @Req() req) {
        return this.animalService.buildSetPriceTx(pda, dto, req.user.pubkey);
    }

    @Post(':pda/confirm-set-price')
    @HttpCode(HttpStatus.OK)
    confirmSetPrice(@Param('pda') pda: string, @Body() dto: ConfirmTxDto, @Req() req) {
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

    @Get(':pda')
    findAnimalByPda(@Param('pda') pda: string) {
        return this.animalService.findAnimalByPda(pda);
    }

    @Get('by-ranch/:ranchPda')
    findAnimalsByRanch(@Param('ranchPda') ranchPda: string) {
        return this.animalService.findAnimalsByRanch(ranchPda);
    }

}