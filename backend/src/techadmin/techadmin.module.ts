import { Module } from '@nestjs/common';
import { TechadminService } from './techadmin.service';
import { TechadminController } from './techadmin.controller';
import { TechadminRepository } from './techadmin.repository';

@Module({
  controllers: [TechadminController],
  providers: [TechadminService, TechadminRepository],
})
export class TechadminModule {}
