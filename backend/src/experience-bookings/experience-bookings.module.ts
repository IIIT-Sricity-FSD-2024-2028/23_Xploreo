import { Module } from '@nestjs/common';
import { ExperiencesModule } from '../experiences/experiences.module';
import { GuideModule } from '../guide/guide.module';
import { ExperienceBookingsController } from './experience-bookings.controller';
import { ExperienceBookingsRepository } from './experience-bookings.repository';
import { ExperienceBookingsService } from './experience-bookings.service';
import { RefundModule } from '../common/refund/refund.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ExperiencesModule, GuideModule, RefundModule, NotificationsModule],
  controllers: [ExperienceBookingsController],
  providers: [ExperienceBookingsService, ExperienceBookingsRepository],
  exports: [ExperienceBookingsService, ExperienceBookingsRepository],
})
export class ExperienceBookingsModule {}

