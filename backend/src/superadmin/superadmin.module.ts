import { Module } from '@nestjs/common';
import { SuperadminService } from './superadmin.service';
import { SuperadminController } from './superadmin.controller';
import { SuperadminRepository } from './superadmin.repository';

@Module({
  controllers: [SuperadminController],
  providers: [SuperadminService, SuperadminRepository],
})
export class SuperadminModule {}
