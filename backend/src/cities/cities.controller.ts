import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CitiesService } from './cities.service';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';
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

@ApiTags('Cities')
@ApiProtectedResource()
@Roles(
  Role.TRAVELLER,
  Role.GUIDE,
  Role.SUPERADMIN,
  Role.TECHADMIN,
  Role.NONTECHADMIN,
)
@Controller('cities')
export class CitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  @Roles(Role.SUPERADMIN, Role.TECHADMIN)
  @Post()
  @ApiOperation({ summary: 'Add a city' })
  @ApiCreateEndpoint(CreateCityDto)
  create(@Body() dto: CreateCityDto) {
    return this.citiesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all cities' })
  @ApiReadEndpoint()
  findAll() {
    return this.citiesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get city by ID' })
  @ApiReadEndpoint()
  findOne(@Param('id', NonEmptyStringPipe) id: string) {
    return this.citiesService.findOne(id);
  }

  @Roles(Role.SUPERADMIN, Role.TECHADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Update a city' })
  @ApiUpdateEndpoint(UpdateCityDto)
  update(
    @Param('id', NonEmptyStringPipe) id: string,
    @Body() dto: UpdateCityDto,
  ) {
    return this.citiesService.update(id, dto);
  }

  @Roles(Role.SUPERADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a city' })
  @ApiDeleteEndpoint()
  remove(@Param('id', NonEmptyStringPipe) id: string) {
    return this.citiesService.remove(id);
  }
}
