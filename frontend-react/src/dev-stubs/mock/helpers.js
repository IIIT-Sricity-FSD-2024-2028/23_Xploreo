// TEMP-STUB: the server rules mocks must enforce (401 / 403 / 400), as in the Mock Kit.
import { ApiError } from '../http/ApiError.js';

const norm = (value) => String(value ?? '').trim().toLowerCase();

export function requireUser(ctx) {
  if (!ctx.user?.id) throw new ApiError(401, 'Please sign in to continue.');
  return ctx.user;
}

export function requireRole(ctx, ...roles) {
  const user = requireUser(ctx);
  if (!roles.includes(user.role)) throw new ApiError(403, 'Your account type cannot do this.');
  return user;
}

export function assertRegion(ctx, region) {
  const user = requireUser(ctx);
  if (norm(user.region) !== norm(region)) {
    throw new ApiError(403, `This belongs to ${region}. You can only act in ${user.region}.`);
  }
}

export function assertOwner(ctx, ownerId) {
  const user = requireUser(ctx);
  if (String(user.id) !== String(ownerId)) {
    throw new ApiError(403, 'This item belongs to another partner.');
  }
}

// Reject any field the backend DTO does not list (the real API answers 400 for extras).
export function whitelist(body, allowedFields) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(400, 'Request body must be an object.', { body: 'Request body must be an object.' });
  }
  const extras = Object.keys(body).filter((key) => !allowedFields.includes(key));
  if (extras.length) {
    const fieldErrors = Object.fromEntries(extras.map((key) => [key, `property ${key} should not exist`]));
    throw new ApiError(400, fieldErrors[extras[0]], fieldErrors);
  }
  return body;
}
