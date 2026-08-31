import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../auth/entities/auth.entity';
import { CreateGuideRequestDto } from './dto/create-guide-request.dto';
import { UpdateGuideRequestDto } from './dto/update-guide-request.dto';
import { GuideRequestsService } from './guide-requests.service';
import { NonEmptyStringPipe } from '../common/pipes/non-empty-string.pipe';
import {
  ApiProtectedResource,
  ApiCreateEndpoint,
  ApiUpdateEndpoint,
  ApiReadEndpoint,
  ApiDeleteEndpoint,
} from '../common/decorators/api-docs.decorator';

@ApiTags('Guide Requests')
@ApiProtectedResource()
@Roles(
  Role.TRAVELLER,
  Role.TRAVELLER_ACTOR,
  Role.GUIDE,
  Role.SUPERADMIN,
  Role.NONTECHADMIN,
)
@Controller('guide-requests')
export class GuideRequestsController {
  constructor(private readonly guideRequestsService: GuideRequestsService) {}

  @Roles(Role.TRAVELLER, Role.TRAVELLER_ACTOR)
  @Post()
  @ApiOperation({ summary: 'Create a guide request for an experience' })
  @ApiCreateEndpoint(CreateGuideRequestDto)
  @ApiBody({ type: CreateGuideRequestDto })
  @ApiResponse({ status: 201, description: 'Guide request created' })
  @ApiResponse({
    status: 400,
    description: 'Invalid request or duplicate pending request',
  })
  @ApiResponse({
    status: 403,
    description: 'Missing or unauthorized role header',
  })
  @ApiResponse({ status: 404, description: 'Trip not found' })
  create(@Body() dto: CreateGuideRequestDto) {
    return this.guideRequestsService.create(dto);
  }

  @Roles(Role.SUPERADMIN, Role.NONTECHADMIN)
  @Get()
  @ApiOperation({ summary: 'Get all guide requests' })
  @ApiReadEndpoint()
  findAll() {
    return this.guideRequestsService.findAll();
  }

  @Roles(Role.GUIDE, Role.SUPERADMIN, Role.NONTECHADMIN)
  @Get('guide/:id')
  @ApiOperation({ summary: 'Get incoming guide requests for a guide' })
  @ApiReadEndpoint()
  findByGuide(@Param('id', NonEmptyStringPipe) id: string) {
    return this.guideRequestsService.findByGuide(id);
  }

  @Roles(
    Role.TRAVELLER,
    Role.TRAVELLER_ACTOR,
    Role.SUPERADMIN,
    Role.NONTECHADMIN,
  )
  @Get('traveller/:id')
  @ApiOperation({ summary: 'Get guide requests created by a traveller' })
  @ApiReadEndpoint()
  findByTraveller(@Param('id', NonEmptyStringPipe) id: string) {
    return this.guideRequestsService.findByTraveller(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get guide request by ID' })
  @ApiReadEndpoint()
  findOne(@Param('id', NonEmptyStringPipe) id: string) {
    return this.guideRequestsService.findOne(id);
  }

  @Roles(Role.GUIDE, Role.SUPERADMIN, Role.NONTECHADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Accept or reject a guide request' })
  @ApiUpdateEndpoint(UpdateGuideRequestDto)
  @ApiBody({ type: UpdateGuideRequestDto })
  @ApiResponse({ status: 200, description: 'Guide request updated' })
  @ApiResponse({ status: 400, description: 'Invalid update' })
  @ApiResponse({
    status: 403,
    description: 'Missing or unauthorized role header',
  })
  @ApiResponse({ status: 404, description: 'Guide request not found' })
  update(
    @Param('id', NonEmptyStringPipe) id: string,
    @Body() dto: UpdateGuideRequestDto,
    @Req() req: any,
  ) {
    return this.guideRequestsService.update(id, dto, req.user);
  }

  @Roles(Role.SUPERADMIN, Role.NONTECHADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a guide request' })
  @ApiDeleteEndpoint()
  remove(@Param('id', NonEmptyStringPipe) id: string) {
    return this.guideRequestsService.remove(id);
  }
}
