import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ResolveTicketDto {
  @ApiPropertyOptional({
    example: 'Traveller was contacted and the booking confirmation was resent.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(800)
  resolution?: string;
}
