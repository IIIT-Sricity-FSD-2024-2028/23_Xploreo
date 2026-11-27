import { Module } from '@nestjs/common';
import { TripsService } from './trips.service';
import { TripsController } from './trips.controller';
import { TripsRepository } from './trips.repository';
import { PlansModule } from '../plans/plans.module';
import { GuideApplicationsModule } from '../guide-applications/guide-applications.module';
import { GuideModule } from '../guide/guide.module';
import { GuideAssignmentsController } from './guide-assignments.controller';
import { RefundModule } from '../common/refund/refund.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { HotelsModule } from '../hotels/hotels.module';
import { ExperiencesModule } from '../experiences/experiences.module';
import { PlanCapacityController } from './plan-capacity.controller';

@Module({
  imports: [PlansModule, GuideModule, RefundModule, NotificationsModule, HotelsModule, ExperiencesModule],
  controllers: [TripsController, GuideAssignmentsController, PlanCapacityController],
  providers: [TripsService, TripsRepository],
  exports: [TripsService, TripsRepository],
})
export class TripsModule {}

