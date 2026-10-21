import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
import { GuideApplicationsModule } from './guide-applications/guide-applications.module';
import { TripGuidesModule } from './trip-guides/trip-guides.module';
import { FinanceModule } from './finance/finance.module';
import { ExperienceGuidesModule } from './experience-guides/experience-guides.module';
import { LocationModule } from './location/location.module';
import { CitiesModule } from './cities/cities.module';
import { ReviewsModule } from './reviews/reviews.module';
import { GuideRequestsModule } from './guide-requests/guide-requests.module';
import { BookingsModule } from './bookings/bookings.module';
import { PartnersModule } from './partners/partners.module';
import { ExperienceBookingsModule } from './experience-bookings/experience-bookings.module';
import { TicketsModule } from './tickets/tickets.module';
import { UploadModule } from './upload/upload.module';
import { NotificationsModule } from './notifications/notifications.module';
import { RefundModule } from './common/refund/refund.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
    GuideApplicationsModule,
    TripGuidesModule,
    FinanceModule,
    ExperienceGuidesModule,
    ReviewsModule,
    GuideRequestsModule,
    BookingsModule,
    PartnersModule,
    ExperienceBookingsModule,
    TicketsModule,
    LocationModule,
    CitiesModule,
    UploadModule,
    NotificationsModule,
    RefundModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
