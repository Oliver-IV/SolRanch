// 📍 Archivo: src/animal/animal.controller.ts
import {
    Controller,
    Post,
    Get,
    Body,
    Req,
    Param,
    UseGuards,
    HttpCode, // Añadido para respuestas 200
    HttpStatus, // Añadido para respuestas 200
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AnimalService } from './animal.service';
import { VerifierGuard } from '../auth/guards/verifier.guard';
import { CreateAnimalDto } from './dto/create-animal.dto';
import { AddRancherSignatureDto } from './dto/add-rancher-signature.dto';
import { ConfirmAnimalDto } from './dto/confirm-animal.dto';
import { RancherGuard } from '../auth/guards/rancher.guard';

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

    @Get(':pda')
    findAnimalByPda(@Param('pda') pda: string) {
        return this.animalService.findAnimalByPda(pda);
    }

    @Get('by-ranch/:ranchPda')
    findAnimalsByRanch(@Param('ranchPda') ranchPda: string) {
        return this.animalService.findAnimalsByRanch(ranchPda);
    }

}