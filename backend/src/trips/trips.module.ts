import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TripsService } from './trips.service';
import { TripsController } from './trips.controller';
import { TripsRepository } from './trips.repository';
import { PlansModule } from '../plans/plans.module';
import { GuideModule } from '../guide/guide.module';
import { GuideAssignmentsController } from './guide-assignments.controller';
import { BookingsModule } from '../bookings/bookings.module';
import { ExperienceBookingsModule } from '../experience-bookings/experience-bookings.module';
import { ExperiencesModule } from '../experiences/experiences.module';
import { HotelsModule } from '../hotels/hotels.module';
import { RefundModule } from '../common/refund/refund.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PlanCapacityController } from './plan-capacity.controller';

@Module({
  imports: [
    AuthModule,
    PlansModule,
    GuideModule,
    HotelsModule,
    forwardRef(() => BookingsModule),
    ExperiencesModule,
    forwardRef(() => ExperienceBookingsModule),
    RefundModule,
    NotificationsModule,
  ],
  controllers: [TripsController, GuideAssignmentsController, PlanCapacityController],
  providers: [TripsService, TripsRepository],
  exports: [TripsService, TripsRepository],
})
export class TripsModule {}

