import { Module } from '@nestjs/common';
import { ExperiencesModule } from '../experiences/experiences.module';
import { ExperienceBookingsController } from './experience-bookings.controller';
import { ExperienceBookingsRepository } from './experience-bookings.repository';
import { ExperienceBookingsService } from './experience-bookings.service';

@Module({
  imports: [ExperiencesModule],
  controllers: [ExperienceBookingsController],
  providers: [ExperienceBookingsService, ExperienceBookingsRepository],
  exports: [ExperienceBookingsService, ExperienceBookingsRepository],
})
export class ExperienceBookingsModule {}
