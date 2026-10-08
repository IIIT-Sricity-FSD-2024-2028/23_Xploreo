import { Module } from '@nestjs/common';
import { CitiesService } from './cities.service';
import { CitiesController } from './cities.controller';
import { CitiesRepository } from './cities.repository';

@Module({
  controllers: [CitiesController],
  providers: [CitiesService, CitiesRepository],
  exports: [CitiesRepository],
})
export class CitiesModule {}
