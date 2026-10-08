import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
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
import { GuideApplicationsService } from './guide-applications.service';
import { CreateGuideApplicationDto } from './dto/create-guide-application.dto';
import { UpdateGuideApplicationDto } from './dto/update-guide-application.dto';
import { GuideApplicationStatus } from './entities/guide-application.entity';

@ApiTags('Guide Applications')
@ApiProtectedResource()
@Controller('guide-applications')
export class GuideApplicationsController {
  constructor(private readonly service: GuideApplicationsService) {}

  @Roles(Role.GUIDE)
  @Post()
  @ApiOperation({ summary: 'Guide applies to be assigned to a plan' })
  @ApiCreateEndpoint(CreateGuideApplicationDto)
  create(@Req() req: any, @Body() dto: CreateGuideApplicationDto) {
    const guideId = req.user.userId;
    return this.service.create(guideId, dto, req.user.location);
  }

  @Roles(Role.SUPERADMIN, Role.NONTECHADMIN)
  @Get()
  @ApiOperation({ summary: 'Get all guide applications with optional filters' })
  @ApiReadEndpoint()
  @ApiQuery({ name: 'status', enum: GuideApplicationStatus, required: false })
  @ApiQuery({ name: 'planId', required: false })
  @ApiQuery({ name: 'guideId', required: false })
  findAll(
    @Req() req: any,
    @Query('status') status?: GuideApplicationStatus,
    @Query('planId') planId?: string,
    @Query('guideId') guideId?: string,
  ) {
    return this.service.findAll(req.user, { status, planId, guideId });
  }

  @Roles(Role.GUIDE, Role.SUPERADMIN, Role.NONTECHADMIN)
  @Get('guide/:guideId')
  @ApiOperation({ summary: 'Get all applications submitted by a specific guide' })
  @ApiReadEndpoint()
  findByGuide(@Param('guideId', NonEmptyStringPipe) guideId: string) {
    return this.service.findByGuide(guideId);
  }

  @Roles(Role.SUPERADMIN, Role.NONTECHADMIN)
  @Get('plan/:planId')
  @ApiOperation({ summary: 'Get all applications for a specific plan (NTA dashboard)' })
  @ApiReadEndpoint()
  findByPlan(@Param('planId', NonEmptyStringPipe) planId: string, @Req() req: any) {
    return this.service.findByPlan(planId, req.user);
  }

  @Roles(Role.TRAVELLER, Role.TRAVELLER_ACTOR)
  @Get('plan/:planId/available')
  @ApiOperation({ summary: 'Get accepted guides available for a plan (shown to traveller at checkout)' })
  @ApiReadEndpoint()
  findAvailableForPlan(@Param('planId', NonEmptyStringPipe) planId: string) {
    return this.service.findAvailableGuidesForPlan(planId);
  }

  @Get(':id')
  @Roles(Role.GUIDE, Role.SUPERADMIN, Role.NONTECHADMIN)
  @ApiOperation({ summary: 'Get guide application by ID' })
  @ApiReadEndpoint()
  findOne(@Param('id', NonEmptyStringPipe) id: string) {
    return this.service.findOne(id);
  }

  @Roles(Role.SUPERADMIN, Role.NONTECHADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Admin manually overrides application status or updates price' })
  @ApiUpdateEndpoint(UpdateGuideApplicationDto)
  update(
    @Param('id', NonEmptyStringPipe) id: string,
    @Body() dto: UpdateGuideApplicationDto,
  ) {
    return this.service.update(id, dto);
  }

  @Roles(Role.SUPERADMIN, Role.NONTECHADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a guide application' })
  @ApiDeleteEndpoint()
  remove(@Param('id', NonEmptyStringPipe) id: string) {
    return this.service.remove(id);
  }
}
