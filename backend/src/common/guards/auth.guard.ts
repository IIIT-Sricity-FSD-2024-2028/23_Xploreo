import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { Role } from '../../auth/entities/auth.entity';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();

    const rawRole =
      request.headers['x-user-role'] ??
      request.headers['role'] ??
      request.headers['user-role'];
    const rawUserId =
      request.headers['x-user-id'] ??
      request.headers['user-id'] ??
      request.headers['userid'];

    const rawLocation =
      request.headers['x-user-location'] ??
      request.headers['user-location'];

    const role = normalizeRole(Array.isArray(rawRole) ? rawRole[0] : rawRole);
    const userId = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;
    const location = Array.isArray(rawLocation) ? rawLocation[0] : rawLocation;

    request.user = {
      userId: userId ? String(userId) : undefined,
      role: role || undefined,
      location: location ? String(location) : undefined,
    };

    if (isPublic) return true;

    if (!role) {
      throw new ForbiddenException('x-user-role header is required');
    }

    const actorsRequiringLocation = [
      Role.NONTECHADMIN,
      Role.GUIDE,
      Role.EXPERIENCE_PARTNER,
      Role.PARTNER,
      Role.HOTEL,
      Role.EXPERIENCE,
    ];

    if (actorsRequiringLocation.includes(role) && !location) {
      throw new ForbiddenException('x-user-location header is required for actors');
    }

    return true;
  }
}

function normalizeRole(value: unknown): Role | null {
  const rawRole = String(value || '').trim();
  const role = rawRole.toUpperCase();

  if (rawRole === Role.PARTNER) return Role.PARTNER;
  if (
    rawRole === Role.TRAVELLER_ACTOR ||
    rawRole === 'TRAVELLER' ||
    rawRole === 'TRAVELER'
  ) {
    return Role.TRAVELLER_ACTOR;
  }
  if (rawRole === Role.ADMIN) {
    return Role.ADMIN;
  }
  if (rawRole === Role.TECH_ADMIN) return Role.TECH_ADMIN;
  if (rawRole === Role.EXPERIENCE_PARTNER) {
    return Role.EXPERIENCE_PARTNER;
  }

  const legacyRole = rawRole.toLowerCase();
  if (legacyRole === Role.SUPERADMIN) return Role.SUPERADMIN;
  if (legacyRole === Role.TRAVELLER || legacyRole === 'traveler') {
    return Role.TRAVELLER;
  }
  if (legacyRole === Role.GUIDE) return Role.GUIDE;
  if (legacyRole === Role.TECHADMIN) return Role.TECHADMIN;
  if (legacyRole === Role.NONTECHADMIN) return Role.NONTECHADMIN;
  if (legacyRole === Role.HOTEL) return Role.HOTEL;
  if (legacyRole === Role.EXPERIENCE) return Role.EXPERIENCE;
  if (legacyRole === 'partner') return Role.PARTNER;
  if (legacyRole === 'experience_partner') return Role.EXPERIENCE_PARTNER;

  return null;
}
