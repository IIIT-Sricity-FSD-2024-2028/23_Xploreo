import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
} from '@nestjs/swagger';

export function ApiProtectedResource() {
  return applyDecorators(
    ApiHeader({
      name: 'x-user-role',
      required: true,
      description:
        'Role used for RBAC authorization. Allowed values: PARTNER, TRAVELLER, ADMIN, TECH_ADMIN, EXPERIENCE_PARTNER.',
    }),
    ApiHeader({
      name: 'x-user-id',
      required: false,
      description:
        'Actor identifier used to link in-memory records across roles when required by the endpoint.',
    }),
    ApiOkResponse({ description: 'Resource returned successfully' }),
    ApiCreatedResponse({ description: 'Resource created successfully' }),
    ApiBadRequestResponse({ description: 'Invalid request input' }),
    ApiForbiddenResponse({
      description: 'Missing or unauthorized role header',
    }),
    ApiNotFoundResponse({ description: 'Resource not found' }),
  );
}

export function ApiCreateEndpoint(dto: Type<unknown>) {
  return applyDecorators(
    ApiBody({ type: dto }),
    ApiOkResponse({ description: 'Resource returned successfully' }),
    ApiCreatedResponse({ description: 'Resource created successfully' }),
    ApiBadRequestResponse({ description: 'Invalid request input' }),
    ApiForbiddenResponse({
      description: 'Missing or unauthorized role header',
    }),
    ApiNotFoundResponse({ description: 'Resource not found' }),
  );
}

export function ApiUpdateEndpoint(dto: Type<unknown>) {
  return applyDecorators(
    ApiBody({ type: dto }),
    ApiOkResponse({ description: 'Resource updated successfully' }),
    ApiCreatedResponse({ description: 'Resource created successfully' }),
    ApiBadRequestResponse({ description: 'Invalid request input' }),
    ApiForbiddenResponse({
      description: 'Missing or unauthorized role header',
    }),
    ApiNotFoundResponse({ description: 'Resource not found' }),
  );
}

export function ApiReadEndpoint() {
  return applyDecorators(
    ApiOkResponse({ description: 'Resource returned successfully' }),
    ApiCreatedResponse({ description: 'Resource created successfully' }),
    ApiBadRequestResponse({ description: 'Invalid request input' }),
    ApiForbiddenResponse({
      description: 'Missing or unauthorized role header',
    }),
    ApiNotFoundResponse({ description: 'Resource not found' }),
  );
}

export function ApiDeleteEndpoint() {
  return applyDecorators(
    ApiOkResponse({ description: 'Resource deleted successfully' }),
    ApiCreatedResponse({ description: 'Resource created successfully' }),
    ApiBadRequestResponse({ description: 'Invalid request input' }),
    ApiForbiddenResponse({
      description: 'Missing or unauthorized role header',
    }),
    ApiNotFoundResponse({ description: 'Resource not found' }),
  );
}
