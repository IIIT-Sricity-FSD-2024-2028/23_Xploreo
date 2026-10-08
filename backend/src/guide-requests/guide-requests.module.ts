import { Module } from '@nestjs/common';
import { GuideRequestsController } from './guide-requests.controller';
import { GuideRequestsRepository } from './guide-requests.repository';
import { GuideRequestsService } from './guide-requests.service';
import { TripsModule } from '../trips/trips.module';

@Module({
  imports: [TripsModule],
  controllers: [GuideRequestsController],
  providers: [GuideRequestsService, GuideRequestsRepository],
  exports: [GuideRequestsRepository],
})
export class GuideRequestsModule {}
