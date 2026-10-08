import { Injectable } from '@nestjs/common';
import { BookingsService } from '../bookings/bookings.service';

@Injectable()
export class PartnersService {
  constructor(private readonly bookingsService: BookingsService) {}

  findBookings(partnerId: string | undefined) {
    return this.bookingsService.findForPartner(partnerId);
  }
}
