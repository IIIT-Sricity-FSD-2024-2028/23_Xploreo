import { IsString, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateGuideApplicationDto {
  @ApiProperty({ example: 'plan-1', description: 'ID of the plan the guide wants to apply for' })
  @IsString()
  planId!: string;

  @ApiProperty({ example: 50, description: 'Price guide charges per person (in USD/₹ depending on plan currency)' })
  @IsNumber()
  @Min(0)
  guidePricePerPerson!: number;
}
