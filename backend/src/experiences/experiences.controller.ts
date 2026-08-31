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
import { ExperiencesService } from './experiences.service';
import { CreateExperienceDto } from './dto/create-experience.dto';
import { UpdateExperienceDto } from './dto/update-experience.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Role } from '../auth/entities/auth.entity';
import { NonEmptyStringPipe } from '../common/pipes/non-empty-string.pipe';
import {
  ApiProtectedResource,
  ApiCreateEndpoint,
  ApiUpdateEndpoint,
  ApiReadEndpoint,
  ApiDeleteEndpoint,
} from '../common/decorators/api-docs.decorator';

@ApiTags('Experiences')
@ApiProtectedResource()
@Roles(
  Role.TRAVELLER,
  Role.GUIDE,
  Role.SUPERADMIN,
  Role.NONTECHADMIN,
  Role.EXPERIENCE,
  Role.TRAVELLER_ACTOR,
  Role.EXPERIENCE_PARTNER,
)
@Controller('experiences')
export class ExperiencesController {
  constructor(private readonly experiencesService: ExperiencesService) {}

  @Roles(
    Role.SUPERADMIN,
    Role.NONTECHADMIN,
    Role.EXPERIENCE,
    Role.EXPERIENCE_PARTNER,
  )
  @Post()
  @ApiOperation({ summary: 'Create an experience' })
  @ApiCreateEndpoint(CreateExperienceDto)
  @ApiBody({ type: CreateExperienceDto })
  @ApiResponse({ status: 201, description: 'Experience created' })
  @ApiResponse({ status: 400, description: 'Invalid experience payload' })
  @ApiResponse({
    status: 403,
    description: 'Missing or unauthorized role header',
  })
  create(@Body() dto: CreateExperienceDto, @Req() req: any) {
    return this.experiencesService.create(req.user?.userId, dto);
  }

  @Get()
  @Public()
  @Roles(Role.TRAVELLER_ACTOR, Role.TRAVELLER, Role.EXPERIENCE_PARTNER)
  @ApiOperation({ summary: 'Get all experiences' })
  @ApiReadEndpoint()
  findAll(@Req() req: any) {
    if (req.user?.role === Role.EXPERIENCE_PARTNER) {
      return this.experiencesService.findForPartner(req.user?.userId);
    }

    return this.experiencesService.findAll();
  }

  @Get('location/:locationId')
  @Public()
  @ApiOperation({ summary: 'Get experiences by location' })
  @ApiReadEndpoint()
  findByLocation(@Param('locationId', NonEmptyStringPipe) locationId: string) {
    return this.experiencesService.findByLocation(locationId);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get experience by ID' })
  @ApiReadEndpoint()
  findOne(@Param('id', NonEmptyStringPipe) id: string) {
    return this.experiencesService.findOne(id);
  }

  @Roles(
    Role.SUPERADMIN,
    Role.NONTECHADMIN,
    Role.EXPERIENCE,
    Role.EXPERIENCE_PARTNER,
  )
  @Patch(':id')
  @ApiOperation({ summary: 'Update an experience' })
  @ApiUpdateEndpoint(UpdateExperienceDto)
  @ApiBody({ type: UpdateExperienceDto })
  update(
    @Param('id', NonEmptyStringPipe) id: string,
    @Body() dto: UpdateExperienceDto,
  ) {
    return this.experiencesService.update(id, dto);
  }

  @Roles(
    Role.SUPERADMIN,
    Role.NONTECHADMIN,
    Role.EXPERIENCE,
    Role.EXPERIENCE_PARTNER,
  )
  @Delete(':id')
  @ApiOperation({ summary: 'Delete an experience' })
  @ApiDeleteEndpoint()
  remove(@Param('id', NonEmptyStringPipe) id: string) {
    return this.experiencesService.remove(id);
  }
}
