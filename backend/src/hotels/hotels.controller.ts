import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Delete,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role } from '../auth/entities/auth.entity';
import {
  ApiCreateEndpoint,
  ApiProtectedResource,
  ApiReadEndpoint,
  ApiUpdateEndpoint,
  ApiDeleteEndpoint,
} from '../common/decorators/api-docs.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { NonEmptyStringPipe } from '../common/pipes/non-empty-string.pipe';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { UpdateHotelDto } from './dto/update-hotel.dto';
import { HotelsService } from './hotels.service';

@ApiTags('Phase 1 - Hotels')
@ApiProtectedResource()
@Controller('hotels')
export class HotelsController {
  constructor(private readonly hotelsService: HotelsService) {}

  @Post()
  @Roles(Role.PARTNER)
  @ApiOperation({ summary: 'Partner creates a hotel' })
  @ApiCreateEndpoint(CreateHotelDto)
  create(@Body() dto: CreateHotelDto, @Req() req: any) {
    return this.hotelsService.create(req.user?.userId, dto);
  }

  @Get()
  @Public()
  @Roles(Role.TRAVELLER_ACTOR, Role.PARTNER)
  @ApiOperation({
    summary: 'Traveller searches active hotels; partner lists own hotels',
  })
  @ApiQuery({ name: 'location', required: false, example: 'Goa' })
  @ApiReadEndpoint()
  findAll(@Req() req: any, @Query('location') location?: string) {
    if (req.user?.role === Role.PARTNER) {
      return this.hotelsService.findForPartner(req.user?.userId);
    }

    return this.hotelsService.findAll(location);
  }

  @Get(':id')
  @Public()
  @Roles(Role.TRAVELLER_ACTOR, Role.PARTNER)
  @ApiOperation({ summary: 'Get hotel by ID' })
  @ApiReadEndpoint()
  findOne(@Param('id', NonEmptyStringPipe) id: string) {
    return this.hotelsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.PARTNER)
  @ApiOperation({ summary: 'Update a hotel' })
  @ApiUpdateEndpoint(UpdateHotelDto)
  update(
    @Param('id', NonEmptyStringPipe) id: string,
    @Body() dto: UpdateHotelDto,
  ) {
    return this.hotelsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.PARTNER)
  @ApiOperation({ summary: 'Delete a hotel' })
  @ApiDeleteEndpoint()
  remove(@Param('id', NonEmptyStringPipe) id: string) {
    return this.hotelsService.remove(id);
  }
}
