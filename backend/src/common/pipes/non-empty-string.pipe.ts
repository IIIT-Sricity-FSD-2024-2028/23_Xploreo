import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class NonEmptyStringPipe implements PipeTransform<unknown, string> {
  transform(value: unknown): string {
    const parsed = String(value ?? '').trim();
    if (!parsed) {
      throw new BadRequestException(
        'Route parameter must be a non-empty string',
      );
    }
    return parsed;
  }
}
