import { Body, Controller, Post, Patch, Req, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '../auth/entities/auth.entity';
import {
  ApiCreateEndpoint,
  ApiProtectedResource,
} from '../common/decorators/api-docs.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@ApiTags('Phase 1 - Hotel Bookings')
@ApiProtectedResource()
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @Roles(Role.TRAVELLER_ACTOR)
  @ApiOperation({ summary: 'Traveller books a hotel' })
  @ApiCreateEndpoint(CreateBookingDto)
  create(@Body() dto: CreateBookingDto, @Req() req: any) {
    return this.bookingsService.create(req.user?.userId, dto);
  }

  @Get()
  @Roles(Role.TRAVELLER_ACTOR)
  @ApiOperation({ summary: 'Traveller gets their hotel bookings' })
  findForTraveller(@Req() req: any) {
    return this.bookingsService.findForTraveller(req.user?.userId);
  }

  @Patch(':id/cancel')
  @Roles(Role.TRAVELLER_ACTOR)
  @ApiOperation({ summary: 'Traveller cancels a hotel booking' })
  cancel(@Req() req: any) {
    return this.bookingsService.cancelBooking(req.params.id);
  }

  @Patch(':id/check-in')
  @Roles(Role.PARTNER)
  @ApiOperation({ summary: 'Hotel partner checks in a booking' })
  checkIn(@Req() req: any) {
    return this.bookingsService.checkInBooking(req.params.id, req.user?.userId);
  }

  @Patch(':id/check-out')
  @Roles(Role.PARTNER)
  @ApiOperation({ summary: 'Hotel partner checks out a booking' })
  checkOut(@Req() req: any) {
    return this.bookingsService.checkOutBooking(
      req.params.id,
      req.user?.userId,
    );
  }
}
