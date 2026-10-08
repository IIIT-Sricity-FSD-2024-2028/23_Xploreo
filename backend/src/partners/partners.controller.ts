import { Controller, Get, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '../auth/entities/auth.entity';
import {
  ApiProtectedResource,
  ApiReadEndpoint,
} from '../common/decorators/api-docs.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PartnersService } from './partners.service';

@ApiTags('Phase 1 - Partners')
@ApiProtectedResource()
@Controller('partners')
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  @Get('bookings')
  @Roles(Role.PARTNER)
  @ApiOperation({ summary: "Partner views bookings for that partner's hotels" })
  @ApiReadEndpoint()
  findBookings(@Req() req: any) {
    return this.partnersService.findBookings(req.user?.userId);
  }
}
