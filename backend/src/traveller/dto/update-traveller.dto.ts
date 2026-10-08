import { PartialType } from '@nestjs/mapped-types';
import { CreateTravellerDto } from './create-traveller.dto';

export class UpdateTravellerDto extends PartialType(CreateTravellerDto) {}
