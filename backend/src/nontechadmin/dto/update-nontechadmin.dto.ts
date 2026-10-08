import { PartialType } from '@nestjs/mapped-types';
import { CreateNontechadminDto } from './create-nontechadmin.dto';
export class UpdateNontechadminDto extends PartialType(CreateNontechadminDto) {}
