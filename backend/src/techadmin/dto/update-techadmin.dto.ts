import { PartialType } from '@nestjs/mapped-types';
import { CreateTechadminDto } from './create-techadmin.dto';
export class UpdateTechadminDto extends PartialType(CreateTechadminDto) {}
