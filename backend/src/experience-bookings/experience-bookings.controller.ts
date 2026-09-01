import { Body, Controller, Get, Patch, Param, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '../auth/entities/auth.entity';
import {
  ApiCreateEndpoint,
  ApiProtectedResource,
  ApiReadEndpoint,
} from '../common/decorators/api-docs.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateExperienceBookingDto } from './dto/create-experience-booking.dto';
import { ExperienceBookingsService } from './experience-bookings.service';

@ApiTags('Phase 2 - Experience Bookings')
@ApiProtectedResource()
@Controller('experience-bookings')
export class ExperienceBookingsController {
  constructor(
    private readonly experienceBookingsService: ExperienceBookingsService,
  ) { }

  @Post()
  @Roles(Role.TRAVELLER_ACTOR)
  @ApiOperation({ summary: 'Traveller books an experience' })
  @ApiCreateEndpoint(CreateExperienceBookingDto)
  create(@Body() dto: CreateExperienceBookingDto, @Req() req: any) {
    return this.experienceBookingsService.create(req.user?.userId, dto);
  }

  @Get()
  @Roles(
    Role.TRAVELLER_ACTOR,
    Role.TRAVELLER,
    Role.ADMIN,
    Role.SUPERADMIN,
    Role.EXPERIENCE_PARTNER,
  )
  @ApiOperation({ summary: 'View experience bookings' })
  @ApiReadEndpoint()
  findAll(@Req() req: any) {
    if (
      req.user?.role === Role.TRAVELLER_ACTOR ||
      req.user?.role === Role.TRAVELLER
    ) {
      return this.experienceBookingsService.findForTraveller(req.user?.userId);
    }
    if (req.user?.role === Role.EXPERIENCE_PARTNER) {
      return this.experienceBookingsService.findForPartner(
        req.user?.userId,
        req.user?.location,
      );
    }

    return this.experienceBookingsService.findAll();
  }

  @Patch(':id/status')
  @Roles(Role.EXPERIENCE_PARTNER, Role.TRAVELLER_ACTOR, Role.TRAVELLER)
  @ApiOperation({ summary: 'Update experience booking status' })
  updateStatus(
    @Param('id') id: string,
    @Body()
    dto: import('./dto/update-experience-booking-status.dto').UpdateExperienceBookingStatusDto,
    @Req() req: any,
  ) {
    return this.experienceBookingsService.updateStatus(
      id,
      req.user?.userId,
      req.user?.role,
      req.user?.location,
      dto.status,
    );
  }
}
