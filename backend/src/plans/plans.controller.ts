import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
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
  constructor(private readonly plansService: PlansService) {}

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
  create(@Body() dto: CreatePlanDto) {
    return this.plansService.create(dto);
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
  ) {
    return this.plansService.findAll({ page, limit, from, to, destination });
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get plan by ID' })
  @ApiReadEndpoint()
  findOne(@Param('id', NonEmptyStringPipe) id: string) {
    return this.plansService.findOne(id);
  }

  @Roles(Role.SUPERADMIN, Role.NONTECHADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Update a plan' })
  @ApiUpdateEndpoint(UpdatePlanDto)
  @ApiBody({ type: UpdatePlanDto })
  update(
    @Param('id', NonEmptyStringPipe) id: string,
    @Body() dto: UpdatePlanDto,
  ) {
    return this.plansService.update(id, dto);
  }

  @Roles(Role.SUPERADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a plan' })
  @ApiDeleteEndpoint()
  remove(@Param('id', NonEmptyStringPipe) id: string) {
    return this.plansService.remove(id);
  }
}
