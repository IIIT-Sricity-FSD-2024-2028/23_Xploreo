import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../auth/entities/auth.entity';
import { NonEmptyStringPipe } from '../common/pipes/non-empty-string.pipe';
import {
  ApiProtectedResource,
  ApiCreateEndpoint,
  ApiReadEndpoint,
} from '../common/decorators/api-docs.decorator';
import { GuideAssignmentsService } from './guide-assignments.service';
import { CreateGuideAssignmentDto } from './dto/create-guide-assignment.dto';

@ApiTags('Guide Assignments')
@ApiProtectedResource()
@Controller('guide-assignments')
export class GuideAssignmentsController {
  constructor(private readonly service: GuideAssignmentsService) {}

  @Roles(Role.TRAVELLER, Role.TRAVELLER_ACTOR)
  @Post()
  @ApiOperation({ summary: 'Traveller adds a guide at checkout for a plan' })
  @ApiCreateEndpoint(CreateGuideAssignmentDto)
  create(@Req() req: any, @Body() dto: CreateGuideAssignmentDto) {
    return this.service.create(req.user.userId, dto);
  }

  @Roles(Role.SUPERADMIN, Role.NONTECHADMIN)
  @Get()
  @ApiOperation({ summary: 'Get all guide assignments (admin only)' })
  @ApiReadEndpoint()
  findAll() {
    return this.service.findAll();
  }

  @Roles(Role.GUIDE, Role.SUPERADMIN, Role.NONTECHADMIN)
  @Get('guide/:guideId')
  @ApiOperation({ summary: 'Get all assignments for a guide (incoming jobs)' })
  @ApiReadEndpoint()
  findByGuide(@Param('guideId', NonEmptyStringPipe) guideId: string) {
    return this.service.findByGuide(guideId);
  }

  @Roles(Role.TRAVELLER, Role.TRAVELLER_ACTOR, Role.SUPERADMIN, Role.NONTECHADMIN)
  @Get('traveller/:travellerId')
  @ApiOperation({ summary: 'Get guide assignments booked by a traveller' })
  @ApiReadEndpoint()
  findByTraveller(@Param('travellerId', NonEmptyStringPipe) travellerId: string) {
    return this.service.findByTraveller(travellerId);
  }

  @Roles(Role.SUPERADMIN, Role.NONTECHADMIN)
  @Get('plan/:planId')
  @ApiOperation({ summary: 'Get guide assignments for a plan' })
  @ApiReadEndpoint()
  findByPlan(@Param('planId', NonEmptyStringPipe) planId: string) {
    return this.service.findByPlan(planId);
  }

  @Get(':id')
  @Roles(Role.GUIDE, Role.TRAVELLER, Role.TRAVELLER_ACTOR, Role.SUPERADMIN, Role.NONTECHADMIN)
  @ApiOperation({ summary: 'Get a guide assignment by ID' })
  @ApiReadEndpoint()
  findOne(@Param('id', NonEmptyStringPipe) id: string) {
    return this.service.findOne(id);
  }

  @Roles(Role.GUIDE)
  @Patch(':id/confirm')
  @ApiOperation({ summary: 'Guide confirms they are available for this booking' })
  confirm(@Param('id', NonEmptyStringPipe) id: string, @Req() req: any) {
    return this.service.confirmByGuide(id, req.user.userId);
  }

  @Roles(Role.GUIDE)
  @Patch(':id/reject')
  @ApiOperation({ summary: 'Guide rejects this booking (not available)' })
  reject(@Param('id', NonEmptyStringPipe) id: string, @Req() req: any) {
    return this.service.rejectByGuide(id, req.user.userId);
  }

  @Roles(Role.TRAVELLER, Role.TRAVELLER_ACTOR)
  @Patch(':id/change-guide')
  @ApiOperation({ summary: 'Traveller picks a new guide after rejection' })
  changeGuide(
    @Param('id', NonEmptyStringPipe) id: string,
    @Req() req: any,
    @Body() body: { newGuideId: string; newGuidePricePerPerson: number; planId: string },
  ) {
    return this.service.changeGuide(
      id,
      req.user.userId,
      body.newGuideId,
      body.newGuidePricePerPerson,
      body.planId,
    );
  }

  @Roles(Role.TRAVELLER, Role.TRAVELLER_ACTOR)
  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Traveller removes guide (full refund)' })
  cancel(@Param('id', NonEmptyStringPipe) id: string, @Req() req: any) {
    return this.service.cancelGuide(id, req.user.userId);
  }
}
