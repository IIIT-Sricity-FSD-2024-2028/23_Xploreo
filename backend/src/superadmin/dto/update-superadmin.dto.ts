import { PartialType } from '@nestjs/mapped-types';
import { CreateSuperadminDto } from './create-superadmin.dto';
export class UpdateSuperadminDto extends PartialType(CreateSuperadminDto) {}
