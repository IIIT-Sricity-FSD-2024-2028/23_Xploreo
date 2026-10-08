import { Module } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module';
import { PartnersController } from './partners.controller';
import { PartnersService } from './partners.service';

@Module({
  imports: [BookingsModule],
  controllers: [PartnersController],
  providers: [PartnersService],
})
export class PartnersModule {}
