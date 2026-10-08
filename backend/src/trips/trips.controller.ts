import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TripsService } from './trips.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripTrackingDto } from './dto/update-trip-tracking.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../auth/entities/auth.entity';
import { NonEmptyStringPipe } from '../common/pipes/non-empty-string.pipe';
import {
  ApiProtectedResource,
  ApiCreateEndpoint,
  ApiUpdateEndpoint,
  ApiReadEndpoint,
  ApiDeleteEndpoint,
} from '../common/decorators/api-docs.decorator';

@ApiTags('Trips')
@ApiProtectedResource()
@Roles(
  Role.TRAVELLER,
  Role.TRAVELLER_ACTOR,
  Role.GUIDE,
  Role.SUPERADMIN,
  Role.NONTECHADMIN,
)
@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Post()
  @Roles(
    Role.TRAVELLER,
    Role.TRAVELLER_ACTOR,
    Role.SUPERADMIN,
    Role.NONTECHADMIN,
  )
  @ApiOperation({ summary: 'Create a draft trip from a plan' })
  @ApiCreateEndpoint(CreateTripDto)
  @ApiBody({ type: CreateTripDto })
  @ApiResponse({ status: 201, description: 'Trip created' })
  @ApiResponse({ status: 400, description: 'Invalid trip payload' })
  @ApiResponse({
    status: 403,
    description: 'Missing or unauthorized role header',
  })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  create(@Body() dto: CreateTripDto) {
    return this.tripsService.create(dto);
  }

  @Roles(Role.SUPERADMIN, Role.NONTECHADMIN)
  @Get()
  @ApiOperation({ summary: 'Get all trips (admin)' })
  @ApiReadEndpoint()
  findAll() {
    return this.tripsService.findAll();
  }

  @Get('traveller/:travellerId')
  @ApiOperation({ summary: 'Get trips for a traveller' })
  @ApiReadEndpoint()
  findByTraveller(
    @Param('travellerId', NonEmptyStringPipe) travellerId: string,
  ) {
    return this.tripsService.findByTraveller(travellerId);
  }

  @Get('guide/:guideId')
  @ApiOperation({ summary: 'Get trips for a guide' })
  @ApiReadEndpoint()
  findByGuide(@Param('guideId', NonEmptyStringPipe) guideId: string) {
    return this.tripsService.findByGuide(guideId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get trip by ID' })
  @ApiReadEndpoint()
  findOne(@Param('id', NonEmptyStringPipe) id: string) {
    return this.tripsService.findOne(id);
  }

  @Roles(Role.GUIDE, Role.SUPERADMIN, Role.NONTECHADMIN)
  @Patch(':id/tracking')
  @ApiOperation({ summary: 'Assigned guide updates live trip tracking' })
  @ApiUpdateEndpoint(UpdateTripTrackingDto)
  @ApiBody({ type: UpdateTripTrackingDto })
  updateTracking(
    @Param('id', NonEmptyStringPipe) id: string,
    @Body() dto: UpdateTripTrackingDto,
    @Req() req: any,
  ) {
    return this.tripsService.updateTracking(id, dto, req.user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a trip' })
  @ApiUpdateEndpoint(UpdateTripDto)
  @ApiBody({ type: UpdateTripDto })
  @ApiResponse({ status: 200, description: 'Trip updated' })
  @ApiResponse({
    status: 400,
    description: 'Invalid trip update or status transition',
  })
  @ApiResponse({
    status: 403,
    description: 'Missing or unauthorized role header',
  })
  @ApiResponse({ status: 404, description: 'Trip not found' })
  update(
    @Param('id', NonEmptyStringPipe) id: string,
    @Body() dto: UpdateTripDto,
    @Req() req: any,
  ) {
    return this.tripsService.update(id, dto, req.user);
  }

  @Roles(Role.SUPERADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a trip' })
  @ApiDeleteEndpoint()
  remove(@Param('id', NonEmptyStringPipe) id: string) {
    return this.tripsService.remove(id);
  }
}
