import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role } from '../auth/entities/auth.entity';
import { Roles } from '../common/decorators/roles.decorator';
import {
  ApiCreateEndpoint,
  ApiDeleteEndpoint,
  ApiProtectedResource,
  ApiReadEndpoint,
  ApiUpdateEndpoint,
} from '../common/decorators/api-docs.decorator';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { ScheduleService } from './schedule.service';

@ApiTags('Schedule')
@ApiProtectedResource()
@Roles(Role.GUIDE, Role.SUPERADMIN, Role.NONTECHADMIN)
@Controller('schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Post()
  @ApiOperation({ summary: 'Create a schedule item' })
  @ApiCreateEndpoint(CreateScheduleDto)
  create(@Body() dto: CreateScheduleDto) {
    return this.scheduleService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all schedule items' })
  @ApiReadEndpoint()
  @ApiQuery({ name: 'guideId', required: false })
  findAll(@Query('guideId') guideId?: string) {
    return this.scheduleService.findAll(guideId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get schedule item by ID' })
  @ApiReadEndpoint()
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.scheduleService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a schedule item' })
  @ApiUpdateEndpoint(UpdateScheduleDto)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateScheduleDto,
  ) {
    return this.scheduleService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a schedule item' })
  @ApiDeleteEndpoint()
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.scheduleService.remove(id);
  }
}
