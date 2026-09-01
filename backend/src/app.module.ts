import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { TravellerModule } from './traveller/traveller.module';
import { GuideModule } from './guide/guide.module';
import { HotelsModule } from './hotels/hotels.module';
import { ExperiencesModule } from './experiences/experiences.module';
import { SuperadminModule } from './superadmin/superadmin.module';
import { TechadminModule } from './techadmin/techadmin.module';
import { NontechadminModule } from './nontechadmin/nontechadmin.module';
import { PlansModule } from './plans/plans.module';
import { TripsModule } from './trips/trips.module';
import { LocationModule } from './location/location.module';
import { CitiesModule } from './cities/cities.module';
import { ReviewsModule } from './reviews/reviews.module';
import { ScheduleModule } from './schedule/schedule.module';
import { GuideRequestsModule } from './guide-requests/guide-requests.module';
import { BookingsModule } from './bookings/bookings.module';
import { PartnersModule } from './partners/partners.module';
import { ExperienceBookingsModule } from './experience-bookings/experience-bookings.module';
import { TicketsModule } from './tickets/tickets.module';
import { LoggerModule } from './common/logger/logger.module';
import { MiddlewareModule } from './common/middleware/middleware.module';
import { GuideApplicationsModule } from './guide-applications/guide-applications.module';
import { GuideAssignmentsModule } from './guide-assignments/guide-assignments.module';
import { UploadModule } from './upload/upload.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    LoggerModule,
    MiddlewareModule,
    AuthModule,
    TravellerModule,
    GuideModule,
    HotelsModule,
    ExperiencesModule,
    SuperadminModule,
    TechadminModule,
    NontechadminModule,
    PlansModule,
    TripsModule,
    ReviewsModule,
    ScheduleModule,
    GuideRequestsModule,
    BookingsModule,
    PartnersModule,
    ExperienceBookingsModule,
    TicketsModule,
    LocationModule,
    CitiesModule,
    UploadModule,
    GuideApplicationsModule,
    GuideAssignmentsModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
