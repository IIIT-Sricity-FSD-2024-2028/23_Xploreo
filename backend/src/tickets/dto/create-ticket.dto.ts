import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TicketPriority } from '../entities/ticket.entity';

export class CreateTicketDto {
  @ApiProperty({ example: 'Hotel booking confirmation not received' })
  @IsString()
  @MinLength(3)
  @MaxLength(140)
  subject!: string;

  @ApiProperty({
    example:
      'I completed payment for my hotel booking, but the confirmation page never loaded.',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(1200)
  message!: string;

  @ApiPropertyOptional({ example: 'Booking' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @ApiPropertyOptional({
    enum: TicketPriority,
    example: TicketPriority.MEDIUM,
  })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;
}
