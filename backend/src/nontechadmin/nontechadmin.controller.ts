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
import { NontechadminService } from './nontechadmin.service';
import { CreateNontechadminDto } from './dto/create-nontechadmin.dto';
import { UpdateNontechadminDto } from './dto/update-nontechadmin.dto';
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

@ApiTags('Nontechadmin')
@Roles(Role.SUPERADMIN)
@ApiProtectedResource()
@Controller('nontechadmin')
export class NontechadminController {
  constructor(private readonly nontechadminService: NontechadminService) {}

  @Post()
  @ApiOperation({ summary: 'Create a non-tech admin' })
  @ApiCreateEndpoint(CreateNontechadminDto)
  create(@Body() dto: CreateNontechadminDto) {
    return this.nontechadminService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all non-tech admins' })
  @ApiReadEndpoint()
  findAll() {
    return this.nontechadminService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get non-tech admin by ID' })
  @ApiReadEndpoint()
  findOne(@Param('id', NonEmptyStringPipe) id: string) {
    return this.nontechadminService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a non-tech admin' })
  @ApiUpdateEndpoint(UpdateNontechadminDto)
  update(
    @Param('id', NonEmptyStringPipe) id: string,
    @Body() dto: UpdateNontechadminDto,
  ) {
    return this.nontechadminService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a non-tech admin' })
  @ApiDeleteEndpoint()
  remove(@Param('id', NonEmptyStringPipe) id: string) {
    return this.nontechadminService.remove(id);
  }
}
