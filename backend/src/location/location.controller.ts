import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LocationService } from './location.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
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

@ApiTags('Location')
@ApiProtectedResource()
@Roles(
  Role.TRAVELLER,
  Role.GUIDE,
  Role.SUPERADMIN,
  Role.TECHADMIN,
  Role.NONTECHADMIN,
)
@Controller('location')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Roles(Role.SUPERADMIN, Role.TECHADMIN)
  @Post()
  @ApiOperation({ summary: 'Add a location' })
  @ApiCreateEndpoint(CreateLocationDto)
  create(@Body() dto: CreateLocationDto) {
    return this.locationService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all locations' })
  @ApiReadEndpoint()
  findAll() {
    return this.locationService.findAll();
  }

  @Get('city/:cityId')
  @ApiOperation({ summary: 'Get locations by city' })
  @ApiReadEndpoint()
  findByCity(@Param('cityId', NonEmptyStringPipe) cityId: string) {
    return this.locationService.findByCity(cityId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get location by ID' })
  @ApiReadEndpoint()
  findOne(@Param('id', NonEmptyStringPipe) id: string) {
    return this.locationService.findOne(id);
  }

  @Roles(Role.SUPERADMIN, Role.TECHADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Update a location' })
  @ApiUpdateEndpoint(UpdateLocationDto)
  update(
    @Param('id', NonEmptyStringPipe) id: string,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.locationService.update(id, dto);
  }

  @Roles(Role.SUPERADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a location' })
  @ApiDeleteEndpoint()
  remove(@Param('id', NonEmptyStringPipe) id: string) {
    return this.locationService.remove(id);
  }
}
