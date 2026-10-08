import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '../auth/entities/auth.entity';
import {
  ApiCreateEndpoint,
  ApiProtectedResource,
  ApiReadEndpoint,
  ApiUpdateEndpoint,
} from '../common/decorators/api-docs.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { NonEmptyStringPipe } from '../common/pipes/non-empty-string.pipe';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ResolveTicketDto } from './dto/resolve-ticket.dto';
import { TicketsService } from './tickets.service';

@ApiTags('Phase 3 - Support Tickets')
@ApiProtectedResource()
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a support ticket' })
  @ApiCreateEndpoint(CreateTicketDto)
  create(@Body() dto: CreateTicketDto, @Req() req: any) {
    return this.ticketsService.create(req.user, dto);
  }

  @Get()
  @ApiOperation({
    summary:
      'View support tickets (all for Technical Admin, user-scoped for other roles)',
  })
  @ApiReadEndpoint()
  findAll(@Req() req: any) {
    return this.ticketsService.findAllForUser(req.user);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'View support tickets for a specific user' })
  @ApiReadEndpoint()
  findByUser(@Param('userId', NonEmptyStringPipe) userId: string) {
    return this.ticketsService.findByUserId(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single support ticket by ID' })
  @ApiReadEndpoint()
  findOne(@Param('id', NonEmptyStringPipe) id: string) {
    return this.ticketsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.TECH_ADMIN, Role.TECHADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Technical admin resolves a support ticket' })
  @ApiUpdateEndpoint(ResolveTicketDto)
  resolve(
    @Param('id', NonEmptyStringPipe) id: string,
    @Body() dto: ResolveTicketDto,
    @Req() req: any,
  ) {
    return this.ticketsService.resolve(id, req.user?.userId, dto);
  }
}
