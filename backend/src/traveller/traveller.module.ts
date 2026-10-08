import { Module } from '@nestjs/common';
import { TravellerService } from './traveller.service';
import { TravellerController } from './traveller.controller';
import { TravellerRepository } from './traveller.repository';

@Module({
  controllers: [TravellerController],
  providers: [TravellerService, TravellerRepository],
  exports: [TravellerRepository],
})
export class TravellerModule {}
