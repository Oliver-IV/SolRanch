import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { UserRole } from '../entities/user.entity';

@Injectable()
export class RancherGuard implements CanActivate {
  private readonly logger = new Logger(RancherGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.roles || !Array.isArray(user.roles)) {
      this.logger.warn('RancherGuard: No user or roles found on request.');
      throw new ForbiddenException('Authentication required.');
    }

    if (user.roles.includes(UserRole.RANCHER)) {
      return true;
    } else {
      this.logger.warn(`RancherGuard: Access denied for user ${user.pubkey}. Not a rancher.`);
      throw new ForbiddenException('Rancher role required.');
    }
  }
}