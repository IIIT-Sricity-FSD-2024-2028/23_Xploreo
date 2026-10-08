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
import { SuperadminService } from './superadmin.service';
import { CreateSuperadminDto } from './dto/create-superadmin.dto';
import { UpdateSuperadminDto } from './dto/update-superadmin.dto';
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

@ApiTags('Superadmin')
@Roles(Role.SUPERADMIN)
@ApiProtectedResource()
@Controller('superadmin')
export class SuperadminController {
  constructor(private readonly superadminService: SuperadminService) {}

  @Post()
  @ApiOperation({ summary: 'Create a superadmin' })
  @ApiCreateEndpoint(CreateSuperadminDto)
  create(@Body() dto: CreateSuperadminDto) {
    return this.superadminService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all superadmins' })
  @ApiReadEndpoint()
  findAll() {
    return this.superadminService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get superadmin by ID' })
  @ApiReadEndpoint()
  findOne(@Param('id', NonEmptyStringPipe) id: string) {
    return this.superadminService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a superadmin' })
  @ApiUpdateEndpoint(UpdateSuperadminDto)
  update(
    @Param('id', NonEmptyStringPipe) id: string,
    @Body() dto: UpdateSuperadminDto,
  ) {
    return this.superadminService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a superadmin' })
  @ApiDeleteEndpoint()
  remove(@Param('id', NonEmptyStringPipe) id: string) {
    return this.superadminService.remove(id);
  }
}
