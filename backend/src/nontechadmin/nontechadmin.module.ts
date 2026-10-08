import { Module } from '@nestjs/common';
import { NontechadminService } from './nontechadmin.service';
import { NontechadminController } from './nontechadmin.controller';
import { NontechadminRepository } from './nontechadmin.repository';

@Module({
  controllers: [NontechadminController],
  providers: [NontechadminService, NontechadminRepository],
})
export class NontechadminModule {}
