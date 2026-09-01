import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PlansService } from './plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
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

@ApiTags('Plans')
@ApiProtectedResource()
@Roles(
  Role.TRAVELLER,
  Role.TRAVELLER_ACTOR,
  Role.GUIDE,
  Role.SUPERADMIN,
  Role.NONTECHADMIN,
)
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) { }

  @Roles(Role.SUPERADMIN, Role.NONTECHADMIN)
  @Post()
  @ApiOperation({ summary: 'Create a trip plan' })
  @ApiCreateEndpoint(CreatePlanDto)
  @ApiBody({ type: CreatePlanDto })
  @ApiResponse({ status: 201, description: 'Plan created' })
  @ApiResponse({ status: 400, description: 'Invalid plan payload' })
  @ApiResponse({
    status: 403,
    description: 'Missing or unauthorized role header',
  })
  create(@Body() dto: CreatePlanDto, @Req() req: any) {
    return this.plansService.create(req.user?.location, dto);
  }

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Get all plans with optional pagination & filtering',
  })
  @ApiReadEndpoint()
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'destination', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'availability', required: false })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('destination') destination?: string,
    @Req() req?: any,
  ) {
    return this.plansService.findAll(
      { page, limit, from, to, destination },
      req?.user?.role,
      req?.user?.location,
    );
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get plan by ID' })
  @ApiReadEndpoint()
  findOne(@Param('id', NonEmptyStringPipe) id: string, @Req() req: any) {
    return this.plansService.findOne(id, req.user?.role, req.user?.location);
  }

  @Roles(Role.SUPERADMIN, Role.NONTECHADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Update a plan' })
  @ApiUpdateEndpoint(UpdatePlanDto)
  @ApiBody({ type: UpdatePlanDto })
  update(
    @Param('id', NonEmptyStringPipe) id: string,
    @Body() dto: UpdatePlanDto,
    @Req() req: any,
  ) {
    return this.plansService.update(id, req.user?.location, dto);
  }

  @Roles(Role.SUPERADMIN, Role.NONTECHADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a plan' })
  @ApiDeleteEndpoint()
  remove(@Param('id', NonEmptyStringPipe) id: string, @Req() req: any) {
    return this.plansService.remove(id, req.user?.location);
  }
}
