import { Controller, Get, Param, Req } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../auth/entities/auth.entity';
import { NonEmptyStringPipe } from '../common/pipes/non-empty-string.pipe';
import { ApiProtectedResource, ApiReadEndpoint } from '../common/decorators/api-docs.decorator';
import { TripsService } from './trips.service';

// Lives in the trips module because a package's remaining capacity depends on the trips already
// booked on it (PlansModule cannot depend on TripsModule, which already depends on it).
@ApiTags('Plans')
@ApiProtectedResource()
@Controller('plans')
export class PlanCapacityController {
  constructor(private readonly tripsService: TripsService) {}

  @Get(':id/capacity')
  @Roles(Role.TRAVELLER, Role.SUPERADMIN, Role.NONTECHADMIN)
  @ApiOperation({
    summary: 'Maximum guests, availability and per-person price for booking a package',
  })
  @ApiReadEndpoint()
  @ApiResponse({ status: 404, description: 'Plan not found' })
  capacity(@Param('id', NonEmptyStringPipe) id: string, @Req() req: any) {
    return this.tripsService.quoteForPlan(id, req.user);
  }
}
