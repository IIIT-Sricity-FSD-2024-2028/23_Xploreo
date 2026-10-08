import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ALLOWED_LOCATIONS,
  AllowedLocation,
} from '../../contracts/api-contracts';

export function normalizeAllowedLocation(
  value: unknown,
): AllowedLocation | null {
  if (!value) return null;
  const str = String(value).trim().toLowerCase();
  const found = ALLOWED_LOCATIONS.find((loc) => loc.toLowerCase() === str);
  return found || null;
}

export function validateAllowedLocation(
  value: unknown,
  fieldName = 'location',
): AllowedLocation {
  const norm = normalizeAllowedLocation(value);
  if (!norm) {
    throw new BadRequestException(
      `${fieldName} must be one of the supported locations: ${ALLOWED_LOCATIONS.join(', ')}`,
    );
  }
  return norm;
}

export function assertActorLocationMatch(
  actorLocation: string | undefined,
  resourceLocation: string | undefined,
  resourceLabel = 'resource',
): void {
  if (!actorLocation || !resourceLocation) return;
  const normActor = normalizeAllowedLocation(actorLocation);
  const normResource = normalizeAllowedLocation(resourceLocation);

  if (normActor && normResource && normActor !== normResource) {
    throw new ForbiddenException(
      `Access denied: Your assigned location is ${normActor}, but this ${resourceLabel} belongs to ${normResource}.`,
    );
  }
}

export function assertLocationOwnership(
  actorLocation: string | undefined,
  requestedLocation: string | undefined,
  resourceLabel = 'resource',
): AllowedLocation {
  if (!actorLocation) {
    throw new ForbiddenException(
      'Actor location could not be determined from session.',
    );
  }
  const normActor = validateAllowedLocation(actorLocation, 'Actor location');

  if (requestedLocation) {
    const normRequested = normalizeAllowedLocation(requestedLocation);
    if (normRequested && normRequested !== normActor) {
      throw new ForbiddenException(
        `Location mismatch: Cannot create or update ${resourceLabel} for ${normRequested}. Your fixed assigned location is ${normActor}.`,
      );
    }
  }

  return normActor;
}

export function locationMatches(
  locationA: string | undefined,
  locationB: string | undefined,
): boolean {
  if (!locationA || !locationB) return false;
  const normA = normalizeAllowedLocation(locationA) || locationA.trim().toLowerCase();
  const normB = normalizeAllowedLocation(locationB) || locationB.trim().toLowerCase();
  return normA === normB || normA.includes(normB) || normB.includes(normA);
}
