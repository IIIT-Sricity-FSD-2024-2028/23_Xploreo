import { Module } from '@nestjs/common';
import { TripsService } from './trips.service';
import { TripsController } from './trips.controller';
import { TripsRepository } from './trips.repository';
import { PlansModule } from '../plans/plans.module';
import { BookingsModule } from '../bookings/bookings.module';
import { ExperienceBookingsModule } from '../experience-bookings/experience-bookings.module';
import { HotelsModule } from '../hotels/hotels.module';
import { ExperiencesModule } from '../experiences/experiences.module';

@Module({
  imports: [
    PlansModule,
    BookingsModule,
    ExperienceBookingsModule,
    HotelsModule,
    ExperiencesModule,
  ],
  controllers: [TripsController],
  providers: [TripsService, TripsRepository],
  exports: [TripsService, TripsRepository],
})
export class TripsModule {}
