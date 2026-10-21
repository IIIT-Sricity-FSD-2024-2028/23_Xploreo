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
import { CreateExperienceBookingDto } from './dto/create-experience-booking.dto';
import { UpdateExperienceBookingStatusDto } from './dto/update-experience-booking-status.dto';
import { CancelBookingDto } from '../bookings/dto/cancel-booking.dto';
import { ExperienceBookingsService } from './experience-bookings.service';

@ApiTags('Phase 2 - Experience Bookings')
@ApiProtectedResource()
@Controller('experience-bookings')
export class ExperienceBookingsController {
  constructor(
    private readonly experienceBookingsService: ExperienceBookingsService,
  ) {}

  @Post()
  @Roles(Role.TRAVELLER)
  @ApiOperation({ summary: 'Traveller books an experience' })
  @ApiCreateEndpoint(CreateExperienceBookingDto)
  create(@Body() dto: CreateExperienceBookingDto, @Req() req: any) {
    return this.experienceBookingsService.create(req.user?.userId, dto);
  }

  @Get('earnings')
  @Roles(Role.EXPERIENCE)
  @ApiOperation({ summary: "Partner's earnings statement, computed live from their bookings" })
  @ApiQuery({ name: 'days', required: false, example: 30 })
  @ApiReadEndpoint()
  earnings(@Req() req: any, @Query('days') days?: string) {
    const parsed = days === 'all' ? 'all' : Number(days) || 30;
    return this.experienceBookingsService.earningsForPartner(req.user?.userId, parsed);
  }

  @Get()
  @Roles(Role.TRAVELLER, Role.SUPERADMIN, Role.EXPERIENCE)
  @ApiOperation({ summary: 'View experience bookings' })
  @ApiReadEndpoint()
  findAll(@Req() req: any) {
    if (req.user?.role === Role.TRAVELLER) {
      return this.experienceBookingsService.findForTraveller(req.user?.userId);
    }
    if (req.user?.role === Role.EXPERIENCE) {
      return this.experienceBookingsService.findForPartner(req.user?.userId);
    }

    return this.experienceBookingsService.findAll();
  }

  @Patch(':id/status')
  @Roles(Role.TRAVELLER, Role.EXPERIENCE, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Update an experience booking status' })
  updateStatus(
    @Param('id', NonEmptyStringPipe) id: string,
    @Body() dto: UpdateExperienceBookingStatusDto,
    @Req() req: any,
  ) {
    return this.experienceBookingsService.updateStatus(id, dto.status, req.user);
  }

  @Patch(':id/cancel')
  @Roles(Role.TRAVELLER, Role.EXPERIENCE, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Cancel an experience booking with policy evaluation and refund processing' })
  cancel(
    @Param('id', NonEmptyStringPipe) id: string,
    @Req() req: any,
    @Body() dto?: CancelBookingDto,
  ) {
    return this.experienceBookingsService.cancel(id, req.user, dto);
  }

  @Patch(':id/refund/retry')
  @Roles(Role.TRAVELLER, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Retry a failed or pending refund for an experience booking' })
  retryRefund(@Param('id', NonEmptyStringPipe) id: string, @Req() req: any) {
    return this.experienceBookingsService.retryRefund(id, req.user);
  }
}
