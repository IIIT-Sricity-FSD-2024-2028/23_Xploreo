import { Module, forwardRef } from '@nestjs/common';
import { HotelsModule } from '../hotels/hotels.module';
import { BookingsController } from './bookings.controller';
import { BookingsRepository } from './bookings.repository';
import { BookingsService } from './bookings.service';
import { RefundModule } from '../common/refund/refund.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [forwardRef(() => HotelsModule), RefundModule, NotificationsModule],
  controllers: [BookingsController],
  providers: [BookingsService, BookingsRepository],
  exports: [BookingsService, BookingsRepository],
})
export class BookingsModule {}

