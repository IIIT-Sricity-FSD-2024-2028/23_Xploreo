import { Module } from '@nestjs/common';
import { ExperiencesService } from './experiences.service';
import { ExperiencesController } from './experiences.controller';
import { ExperiencesRepository } from './experiences.repository';

@Module({
  imports: [],
  controllers: [ExperiencesController],
  providers: [ExperiencesService, ExperiencesRepository],
  exports: [ExperiencesService, ExperiencesRepository],
})
export class ExperiencesModule {}
