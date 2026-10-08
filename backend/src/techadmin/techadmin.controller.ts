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
import { TechadminService } from './techadmin.service';
import { CreateTechadminDto } from './dto/create-techadmin.dto';
import { UpdateTechadminDto } from './dto/update-techadmin.dto';
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

@ApiTags('Techadmin')
@Roles(Role.SUPERADMIN)
@ApiProtectedResource()
@Controller('techadmin')
export class TechadminController {
  constructor(private readonly techadminService: TechadminService) {}

  @Post()
  @ApiOperation({ summary: 'Create a tech admin' })
  @ApiCreateEndpoint(CreateTechadminDto)
  create(@Body() dto: CreateTechadminDto) {
    return this.techadminService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all tech admins' })
  @ApiReadEndpoint()
  findAll() {
    return this.techadminService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tech admin by ID' })
  @ApiReadEndpoint()
  findOne(@Param('id', NonEmptyStringPipe) id: string) {
    return this.techadminService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a tech admin' })
  @ApiUpdateEndpoint(UpdateTechadminDto)
  update(
    @Param('id', NonEmptyStringPipe) id: string,
    @Body() dto: UpdateTechadminDto,
  ) {
    return this.techadminService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a tech admin' })
  @ApiDeleteEndpoint()
  remove(@Param('id', NonEmptyStringPipe) id: string) {
    return this.techadminService.remove(id);
  }
}
