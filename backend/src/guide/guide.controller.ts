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
import { GuideService } from './guide.service';
import { CreateGuideDto } from './dto/create-guide.dto';
import { UpdateGuideDto } from './dto/update-guide.dto';
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

@ApiTags('Guide')
@ApiProtectedResource()
@Roles(
  Role.TRAVELLER,
  Role.TRAVELLER_ACTOR,
  Role.GUIDE,
  Role.SUPERADMIN,
  Role.NONTECHADMIN,
)
@Controller('guide')
export class GuideController {
  constructor(private readonly guideService: GuideService) {}

  @Roles(Role.SUPERADMIN, Role.NONTECHADMIN)
  @Post()
  @ApiOperation({ summary: 'Create a guide profile' })
  @ApiCreateEndpoint(CreateGuideDto)
  create(@Req() req: any, @Body() dto: CreateGuideDto) {
    const userId = req.user.userId;
    const actorLocation = req.user.role === Role.SUPERADMIN ? undefined : req.user?.location;
    return this.guideService.create(userId, dto, actorLocation);
  }

  @Get()
  @ApiOperation({ summary: 'Get all guides' })
  @ApiReadEndpoint()
  findAll(@Req() req: any) {
    return this.guideService.findAll(req.user?.role, req.user?.location);
  }

  @Get('location/:locationId')
  @ApiOperation({ summary: 'Get guides by location' })
  @ApiReadEndpoint()
  findByLocation(@Param('locationId', NonEmptyStringPipe) locationId: string) {
    return this.guideService.findByLocation(locationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get guide by ID' })
  @ApiReadEndpoint()
  findOne(@Param('id', NonEmptyStringPipe) id: string) {
    return this.guideService.findOne(id);
  }

  @Roles(Role.SUPERADMIN, Role.NONTECHADMIN, Role.GUIDE)
  @Patch(':id')
  @ApiOperation({ summary: 'Update a guide profile' })
  @ApiUpdateEndpoint(UpdateGuideDto)
  update(
    @Param('id', NonEmptyStringPipe) id: string,
    @Body() dto: UpdateGuideDto,
    @Req() req: any,
  ) {
    const actorLocation = req.user.role === Role.SUPERADMIN ? undefined : req.user?.location;
    return this.guideService.update(id, dto, actorLocation);
  }

  @Roles(Role.SUPERADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a guide' })
  @ApiDeleteEndpoint()
  remove(@Param('id', NonEmptyStringPipe) id: string) {
    return this.guideService.remove(id);
  }
}
