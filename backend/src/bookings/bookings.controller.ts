import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role } from '../auth/entities/auth.entity';
import {
  ApiCreateEndpoint,
  ApiProtectedResource,
  ApiReadEndpoint,
} from '../common/decorators/api-docs.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { NonEmptyStringPipe } from '../common/pipes/non-empty-string.pipe';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';

@ApiTags('Phase 1 - Hotel Bookings')
@ApiProtectedResource()
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @Roles(Role.TRAVELLER)
  @ApiOperation({ summary: 'Traveller books a hotel' })
  @ApiCreateEndpoint(CreateBookingDto)
  create(@Body() dto: CreateBookingDto, @Req() req: any) {
    return this.bookingsService.create(req.user?.userId, dto);
  }

  // Literal path — must stay above ':id' so "earnings" is never read as a booking id.
  @Get('earnings')
  @Roles(Role.HOTEL)
  @ApiOperation({ summary: "Partner's full earnings statement" })
  @ApiQuery({ name: 'hotelId', required: false })
  @ApiReadEndpoint()
  earnings(@Req() req: any, @Query('hotelId') hotelId?: string) {
    return this.bookingsService.earningsForPartner(req.user?.userId, hotelId);
  }

  @Get()
  @Roles(Role.TRAVELLER, Role.HOTEL, Role.SUPERADMIN)
  @ApiOperation({ summary: "Hotel partner sees their hotels' bookings; traveller sees their own" })
  @ApiReadEndpoint()
  findAll(@Req() req: any) {
    if (req.user?.role === Role.TRAVELLER) {
      return this.bookingsService.findForTraveller(req.user?.userId);
    }
    if (req.user?.role === Role.HOTEL) {
      return this.bookingsService.findForPartner(req.user?.userId);
    }
    if (req.user?.role === Role.SUPERADMIN) {
      return this.bookingsService.findAll();
    }
    return this.bookingsService.findForUser(req.user?.userId, req.user?.role);
  }

  @Get(':id')
  @Roles(Role.TRAVELLER, Role.HOTEL)
  @ApiOperation({ summary: 'Get a booking by ID' })
  @ApiReadEndpoint()
  findOne(@Param('id', NonEmptyStringPipe) id: string, @Req() req: any) {
    return this.bookingsService.findOne(id, req.user?.userId, req.user?.role);
  }

  @Patch(':id/cancel')
  @Roles(Role.TRAVELLER, Role.HOTEL, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Traveller or hotel partner cancels a booking' })
  cancel(
    @Param('id', NonEmptyStringPipe) id: string,
    @Req() req: any,
    @Body() dto?: CancelBookingDto,
  ) {
    return this.bookingsService.cancel(id, req.user?.userId, req.user?.role, dto);
  }

  @Patch(':id/refund/retry')
  @Roles(Role.TRAVELLER, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Retry a failed or pending refund for a cancelled booking' })
  retryRefund(@Param('id', NonEmptyStringPipe) id: string, @Req() req: any) {
    return this.bookingsService.retryRefund(id, req.user?.userId, req.user?.role);
  }

  @Patch(':id/check-in')
  @Roles(Role.HOTEL)
  @ApiOperation({ summary: 'Hotel partner checks in a guest' })
  checkIn(@Param('id', NonEmptyStringPipe) id: string, @Req() req: any) {
    return this.bookingsService.checkIn(id, req.user?.userId);
  }

  @Patch(':id/check-out')
  @Roles(Role.HOTEL)
  @ApiOperation({ summary: 'Hotel partner checks out a guest' })
  checkOut(@Param('id', NonEmptyStringPipe) id: string, @Req() req: any) {
    return this.bookingsService.checkOut(id, req.user?.userId);
  }
}
