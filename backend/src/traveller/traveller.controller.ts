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
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TravellerService } from './traveller.service';
import { CreateTravellerDto } from './dto/create-traveller.dto';
import { UpdateTravellerDto } from './dto/update-traveller.dto';
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

@ApiTags('Traveller')
@ApiProtectedResource()
@Roles(Role.TRAVELLER, Role.SUPERADMIN, Role.NONTECHADMIN, Role.TECHADMIN)
@Controller('traveller')
export class TravellerController {
  constructor(private readonly travellerService: TravellerService) {}

  @Post()
  @ApiOperation({ summary: 'Create a traveller profile' })
  @ApiCreateEndpoint(CreateTravellerDto)
  create(@Req() req: any, @Body() dto: CreateTravellerDto) {
    const userId = dto.userId || req.user.userId;
    return this.travellerService.create(userId, dto);
  }

  @Roles(Role.SUPERADMIN, Role.NONTECHADMIN, Role.TECHADMIN)
  @Get()
  @ApiOperation({ summary: 'Get all travellers (admin only)' })
  @ApiReadEndpoint()
  findAll() {
    return this.travellerService.findAll();
  }

  @Roles(Role.TRAVELLER, Role.SUPERADMIN, Role.NONTECHADMIN, Role.GUIDE, Role.TECHADMIN)
  @Get(':id')
  @ApiOperation({ summary: 'Get traveller by ID' })
  @ApiReadEndpoint()
  findOne(@Param('id', NonEmptyStringPipe) id: string) {
    return this.travellerService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update traveller profile' })
  @ApiUpdateEndpoint(UpdateTravellerDto)
  update(
    @Param('id', NonEmptyStringPipe) id: string,
    @Body() dto: UpdateTravellerDto,
  ) {
    return this.travellerService.update(id, dto);
  }

  @Roles(Role.SUPERADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a traveller (SuperAdmin only)' })
  @ApiDeleteEndpoint()
  remove(@Param('id', NonEmptyStringPipe) id: string) {
    return this.travellerService.remove(id);
  }
}
