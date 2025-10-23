import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger, 
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Verifier } from '../../verifier/entities/verifier.entity';
import { UserRole } from '../entities/user.entity';

@Injectable()
export class VerifierGuard implements CanActivate {
  private readonly logger = new Logger(VerifierGuard.name); 

  constructor(
    @InjectRepository(Verifier)
    private readonly verifierRepository: Repository<Verifier>,
  ) {}

  canActivate(context: ExecutionContext): boolean {
  const request = context.switchToHttp().getRequest();
  const user = request.user;

  if (!user || !user.roles || !Array.isArray(user.roles)) {
    this.logger.warn('VerifierGuard: No user or roles found.');
    throw new ForbiddenException('Authentication required.');
  }

  if (user.roles.includes(UserRole.VERIFIER)) {
    return true;
  } else {
    this.logger.warn(`VerifierGuard: Access denied for ${user.pubkey}.`);
    throw new ForbiddenException('Verifier role required.');
  }
}
}